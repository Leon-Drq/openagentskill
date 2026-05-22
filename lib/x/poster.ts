import { createPublicClient } from '@/lib/supabase/public'
import {
  createXPost,
  refreshXAccessToken,
  tokenExpiresAt,
  type XTokenResponse,
} from './oauth'

interface XOAuthConnection {
  username: string
  access_token: string
  refresh_token: string
  expires_at: string
  scope?: string
}

interface XPostSkill {
  id: string
  slug: string
  name: string
  description: string
  category: string
  tags: string[]
  github_repo: string
  github_stars: number
  quality_score: number
  install_command: string | null
}

export interface XPostResult {
  status: 'posted' | 'skipped'
  reason?: string
  skill?: XPostSkill
  post?: {
    id: string
    text: string
    url: string
  }
}

function formatStars(stars: number) {
  if (stars >= 1_000_000) return `${(stars / 1_000_000).toFixed(1)}M`
  if (stars >= 1000) return `${(stars / 1000).toFixed(1)}K`
  return String(stars)
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

export function buildSkillPostText(skill: XPostSkill) {
  const url = `https://www.openagentskill.com/skills/${skill.slug}`
  const installCommand = skill.install_command || `npx skills add ${skill.github_repo}`
  const title = `Skill pick: ${skill.name}`
  const stats = `${formatStars(skill.github_stars)} GitHub stars - ${skill.category}`
  const footer = `${url}\n\n#AIAgents #AgentSkills`
  const fixedLength =
    title.length +
    stats.length +
    installCommand.length +
    footer.length +
    14
  const description = truncate(skill.description, Math.max(60, 270 - fixedLength))

  return [
    title,
    '',
    description,
    '',
    stats,
    `Install: ${installCommand}`,
    '',
    footer,
  ].join('\n')
}

async function getStoredConnection(supabase: ReturnType<typeof createPublicClient>, serverSecret: string) {
  const { data, error } = await supabase.rpc('get_x_oauth_connection', {
    p_server_secret: serverSecret,
  })

  if (error) throw new Error(`Failed to load X OAuth connection: ${error.message}`)
  if (!data) return null
  const connection = data as XOAuthConnection
  if (!connection.refresh_token) return null
  return connection
}

async function saveRefreshedToken(
  supabase: ReturnType<typeof createPublicClient>,
  serverSecret: string,
  token: XTokenResponse
) {
  const { error } = await supabase.rpc('update_x_oauth_tokens', {
    p_server_secret: serverSecret,
    p_access_token: token.access_token,
    p_refresh_token: token.refresh_token || null,
    p_expires_at: tokenExpiresAt(token.expires_in),
    p_scope: token.scope || null,
  })

  if (error) throw new Error(`Failed to update X OAuth token: ${error.message}`)
}

async function pickSkill(supabase: ReturnType<typeof createPublicClient>, serverSecret: string) {
  const { data, error } = await supabase.rpc('pick_x_post_skill', {
    p_server_secret: serverSecret,
  })

  if (error) throw new Error(`Failed to pick X post skill: ${error.message}`)
  return (data || null) as XPostSkill | null
}

async function recordPost(
  supabase: ReturnType<typeof createPublicClient>,
  serverSecret: string,
  post: Record<string, unknown>
) {
  const { error } = await supabase.rpc('record_x_post', {
    p_server_secret: serverSecret,
    p_post: post,
  })

  if (error) throw new Error(`Failed to record X post: ${error.message}`)
}

export async function postDailySkillToX(): Promise<XPostResult> {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) throw new Error('Missing INDEXER_SECRET')

  const supabase = createPublicClient()
  const connection = await getStoredConnection(supabase, serverSecret)
  if (!connection) {
    return { status: 'skipped', reason: 'X account is not authorized yet' }
  }

  const token = await refreshXAccessToken(connection.refresh_token)
  await saveRefreshedToken(supabase, serverSecret, token)

  const skill = await pickSkill(supabase, serverSecret)
  if (!skill) {
    return { status: 'skipped', reason: 'No eligible unposted skill found' }
  }

  const postText = buildSkillPostText(skill)

  try {
    const created = await createXPost(token.access_token, postText)
    const postId = created.data?.id
    if (!postId) {
      throw new Error(`X post response did not include an id: ${JSON.stringify(created)}`)
    }

    await recordPost(supabase, serverSecret, {
      skill_id: skill.id,
      skill_slug: skill.slug,
      status: 'posted',
      x_post_id: postId,
      post_text: postText,
      posted_at: new Date().toISOString(),
      metadata: {
        username: connection.username,
        response: created,
      },
    })

    return {
      status: 'posted',
      skill,
      post: {
        id: postId,
        text: postText,
        url: `https://x.com/${connection.username}/status/${postId}`,
      },
    }
  } catch (error) {
    await recordPost(supabase, serverSecret, {
      skill_id: skill.id,
      skill_slug: skill.slug,
      status: 'error',
      post_text: postText,
      error: error instanceof Error ? error.message : 'Unknown X post error',
      metadata: {
        username: connection.username,
      },
    })
    throw error
  }
}
