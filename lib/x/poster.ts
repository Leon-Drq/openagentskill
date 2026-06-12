import { createPublicClient } from '@/lib/supabase/public'
import { getAllSkills } from '@/lib/db/skills'
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

export interface XPostSkill {
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

export interface XIntentDraft {
  status: 'ready' | 'skipped'
  reason?: string
  skill?: XPostSkill
  mainText?: string
  mainIntentUrl?: string
  replyText?: string
  replyIntentUrl?: string
  text?: string
  intentUrl?: string
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
  if (maxLength <= 0) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function getSkillUrl(skill: XPostSkill, source?: 'x') {
  const url = `https://www.openagentskill.com/skills/${skill.slug}`
  if (source === 'x') return `${url}?ref=x`
  return url
}

export function buildSkillPostText(skill: XPostSkill) {
  const url = getSkillUrl(skill)
  const installCommand = truncate(skill.install_command || `npx skills add ${skill.github_repo}`, 72)
  const title = `Skill pick: ${truncate(skill.name, 72)}`
  const stats = `${formatStars(skill.github_stars)} GitHub stars - ${truncate(skill.category, 36)}`
  const footer = `${url}\n\n#AIAgents #AgentSkills`
  const build = (description: string, includeInstall: boolean) => [
    title,
    ...(description ? ['', description] : []),
    '',
    stats,
    ...(includeInstall ? [`Install: ${installCommand}`] : []),
    '',
    footer,
  ].join('\n')

  const withEmptyDescription = build('', true)
  const descriptionBudget = 280 - withEmptyDescription.length - 1
  const description = truncate(skill.description, Math.max(0, descriptionBudget))
  const text = build(description, true)

  if (text.length <= 280) return text

  return build('', false).slice(0, 280)
}

function inferUseCase(skill: XPostSkill) {
  const text = [
    skill.name,
    skill.description,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
  ].join(' ').toLowerCase()

  if (/(browser|web|crawl|scrap|page|site|monitor)/.test(text)) {
    return 'you need an agent to browse, extract, or monitor web pages without building a scraper from scratch.'
  }
  if (/(finance|stock|investment|market|equity|quant|trading|supply-chain|bottleneck|research)/.test(text)) {
    return 'you want an agent to turn market noise into source-backed research, ranked candidates, and risk checks.'
  }
  if (/\b(code|coding|developer|dev|github|claude|cursor|terminal|repo)\b/.test(text)) {
    return 'you want your coding agent to carry more repo context and ship repetitive changes faster.'
  }
  if (/(rag|search|knowledge|memory|document|pdf|data|vector)/.test(text)) {
    return 'your agent needs to turn docs, data, or knowledge bases into answers and actions.'
  }
  if (/(workflow|productivity|task|calendar|email|notion|slack|ops)/.test(text)) {
    return 'you want to move a repeatable work routine from manual steps into an agent workflow.'
  }
  if (/(image|video|design|figma|creative)/.test(text)) {
    return 'you want an agent to help with creative production instead of only text chat.'
  }

  return 'you want a practical agent capability you can plug into real work, not just another demo.'
}

export function buildManualXMainText(skill: XPostSkill) {
  const title = 'OpenAgentSkill Update'
  const pick = `Today: ${truncate(skill.name, 64)}`
  const useCase = `Use it when ${inferUseCase(skill)}`
  const stats = `${formatStars(skill.github_stars)} stars - ${truncate(skill.category, 32)}`
  const link = `Link: ${getSkillUrl(skill, 'x')}`
  const footer = '#AIAgents #OpenAgentSkill'

  const build = (scenario: string) => [
    title,
    pick,
    '',
    scenario,
    '',
    stats,
    link,
    footer,
  ].join('\n')

  const fixedLength = build('').length
  return build(truncate(useCase, 280 - fixedLength)).slice(0, 280)
}

export function buildManualXReplyText(skill: XPostSkill) {
  const installCommand = truncate(skill.install_command || `npx skills add ${skill.github_repo}`, 84)
  const title = `Link for ${truncate(skill.name, 72)}:`
  const footer = `Install: ${installCommand}`
  const text = [title, getSkillUrl(skill, 'x'), '', footer].join('\n')

  return text.slice(0, 280)
}

export function buildXIntentUrl(text: string, tweetId?: string) {
  const intentUrl = new URL('https://twitter.com/intent/tweet')
  intentUrl.searchParams.set('text', text)
  if (tweetId) intentUrl.searchParams.set('in_reply_to', tweetId)
  return intentUrl.toString()
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

export async function createManualXIntentDraft(offset = 0): Promise<XIntentDraft> {
  const records = await getAllSkills('quality')
  const candidates = records.filter(
    (record) => record.ai_review_approved && record.github_stars >= 500 && Number(record.quality_score || 0) > 0
  )

  if (!candidates.length) {
    return { status: 'skipped', reason: 'No eligible skill found' }
  }

  const dayNumber = Math.floor(Date.now() / 86_400_000)
  const skill = candidates[positiveModulo(dayNumber + offset, candidates.length)] as XPostSkill
  const mainText = buildManualXMainText(skill)
  const replyText = buildManualXReplyText(skill)
  const mainIntentUrl = buildXIntentUrl(mainText)
  const replyIntentUrl = buildXIntentUrl(replyText)

  return {
    status: 'ready',
    skill,
    mainText,
    mainIntentUrl,
    replyText,
    replyIntentUrl,
    text: mainText,
    intentUrl: mainIntentUrl,
  }
}

export async function createManualXReplyIntentDraft(
  tweetId: string,
  offset = 0
): Promise<XIntentDraft> {
  const draft = await createManualXIntentDraft(offset)
  if (draft.status !== 'ready' || !draft.replyText) return draft

  return {
    ...draft,
    text: draft.replyText,
    intentUrl: buildXIntentUrl(draft.replyText, tweetId),
    replyIntentUrl: buildXIntentUrl(draft.replyText, tweetId),
  }
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
