import { getSkillPackBySlug, type SkillPackDefinition } from '@/lib/skill-packs'
import { createPublicClient } from '@/lib/supabase/public'
import { createXPost, refreshXAccessToken } from '@/lib/x/oauth'
import { getStoredXConnection, recordXPost, saveRefreshedXToken } from '@/lib/x/poster'

export interface XSkillPackPostResult {
  status: 'posted' | 'skipped'
  reason?: string
  pack?: Pick<SkillPackDefinition, 'slug' | 'title'>
  post?: {
    id: string
    text: string
    url: string
  }
}

function getServerSecret() {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) throw new Error('Missing INDEXER_SECRET')
  return serverSecret
}

function getPackUrl(slug: string) {
  return `https://www.openagentskill.com/skill-packs/${slug}?ref=x`
}

function buildPostWithLink(parts: string[], url: string) {
  const footer = `${url}\n\n#AIAgents`
  const body = parts.filter(Boolean).join('\n\n')
  const maxBodyLength = 280 - footer.length - 2
  const safeBody = body.length <= maxBodyLength ? body : `${body.slice(0, Math.max(0, maxBodyLength - 3)).trimEnd()}...`

  return `${safeBody}\n\n${footer}`
}

export function buildSkillPackPostText(pack: Pick<SkillPackDefinition, 'slug' | 'title'>) {
  if (pack.slug === 'ai-video-creator-agent-pack') {
    return buildPostWithLink(
      [
        "AI video isn't one prompt.",
        'New: 10 source-checked skills for planning, voice, edits, captions, covers, and retrospectives.',
        'For Codex, Claude Code, and agents. Human review stays required.',
      ],
      getPackUrl(pack.slug)
    )
  }

  return buildPostWithLink(
    [
      `New: ${pack.title}.`,
      'A focused, review-first workflow for agents and the people guiding them.',
    ],
    getPackUrl(pack.slug)
  )
}

export async function postSkillPackToX(slug: string): Promise<XSkillPackPostResult> {
  const pack = getSkillPackBySlug(slug)
  if (!pack) return { status: 'skipped', reason: 'Skill pack not found' }

  const serverSecret = getServerSecret()
  const supabase = createPublicClient()
  const connection = await getStoredXConnection(supabase, serverSecret)
  if (!connection) return { status: 'skipped', reason: 'X account is not authorized yet' }

  const token = await refreshXAccessToken(connection.refresh_token)
  await saveRefreshedXToken(supabase, serverSecret, token)

  const postText = buildSkillPackPostText(pack)

  try {
    const created = await createXPost(token.access_token, postText)
    const postId = created.data?.id
    if (!postId) {
      throw new Error(`X post response did not include an id: ${JSON.stringify(created)}`)
    }

    await recordXPost(supabase, serverSecret, {
      skill_slug: `pack:${pack.slug}`,
      status: 'posted',
      x_post_id: postId,
      post_text: postText,
      posted_at: new Date().toISOString(),
      metadata: {
        username: connection.username,
        content_type: 'skill_pack',
        pack_slug: pack.slug,
        pack_url: getPackUrl(pack.slug),
        response: created,
      },
    })

    return {
      status: 'posted',
      pack: { slug: pack.slug, title: pack.title },
      post: {
        id: postId,
        text: postText,
        url: `https://x.com/${connection.username}/status/${postId}`,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown X post error'
    await recordXPost(supabase, serverSecret, {
      skill_slug: `pack:${pack.slug}`,
      status: 'error',
      post_text: postText,
      error: message,
      metadata: {
        username: connection.username,
        content_type: 'skill_pack',
        pack_slug: pack.slug,
      },
    }).catch(() => undefined)
    throw error
  }
}
