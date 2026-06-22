import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSkillBySlug, getSkillsBySlugs, type SkillRecord } from '@/lib/db/skills'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { createPublicClient } from '@/lib/supabase/public'
import { getSkillPackBySlug } from '@/lib/skill-packs'
import {
  createXReplyPost,
  refreshXAccessToken,
} from '@/lib/x/oauth'
import {
  buildCommunityIndexedReplyText,
  buildXIntentUrl,
  getStoredXConnection,
  recordXPost,
  saveRefreshedXToken,
} from '@/lib/x/poster'

const ReplyRequestSchema = z.object({
  skill_slug: z.string().min(1).optional(),
  pack_slug: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  tweet_id: z.string().regex(/^\d{5,30}$/).optional(),
  tweet_url: z.string().url().optional(),
  creator: z.string().max(80).optional(),
  source_url: z.string().url().optional(),
  text: z.string().min(1).max(280).optional(),
  dry_run: z.boolean().optional(),
})

function parseTweetId(input: { tweet_id?: string; tweet_url?: string }) {
  if (input.tweet_id && /^\d{5,30}$/.test(input.tweet_id)) return input.tweet_id
  const match = input.tweet_url?.match(/\/status\/(\d{5,30})/)
  return match?.[1] || null
}

function formatPackSkillName(skill: SkillRecord) {
  const name = skill.name
    .replace(/\bskill\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (/gsap/i.test(skill.github_repo || skill.name)) return 'GSAP'
  if (/lottie/i.test(skill.github_repo || skill.name)) return 'Text-to-Lottie'
  if (/three-scope-map/i.test(skill.github_repo || skill.name)) return '3D Map'
  if (/web-to-design-md/i.test(skill.github_repo || skill.name)) return 'web-to-design.md'
  if (/shadcn/i.test(skill.github_repo || skill.name)) return 'shadcn/ui'
  return name
}

async function buildPackReplyDraft(input: z.infer<typeof ReplyRequestSchema>) {
  if (!input.pack_slug) return null

  const tweetId = parseTweetId(input)
  if (!tweetId) {
    return {
      error: 'Missing required field: tweet_id or tweet_url',
      status: 400,
    } as const
  }

  const pack = getSkillPackBySlug(input.pack_slug)
  if (!pack) {
    return {
      error: 'Skill pack not found',
      status: 404,
    } as const
  }

  const featuredSkills = await getSkillsBySlugs(pack.featuredSlugs || [])
  const names = featuredSkills.length
    ? featuredSkills.map(formatPackSkillName).slice(0, 5)
    : ['motion', 'UI systems', 'design extraction', 'visual prototypes']
  const url = `https://www.openagentskill.com/skill-packs/${pack.slug}?ref=x&utm_source=x_reply`
  const generatedText = [
    'Great list. I added these public skills to a Design Agent Skill Pack.',
    '',
    names.join(' / '),
    '',
    url,
    '',
    'Creators can claim/update listings.',
  ].join('\n')

  const text = (input.text || generatedText).slice(0, 280)

  return {
    pack,
    tweetId,
    text,
    intentUrl: buildXIntentUrl(text, tweetId),
  } as const
}

async function buildDraft(input: z.infer<typeof ReplyRequestSchema>) {
  const packDraft = await buildPackReplyDraft(input)
  if (packDraft) return packDraft

  const slug = input.skill_slug || input.slug
  if (!slug) {
    return {
      error: 'Missing required field: skill_slug or pack_slug',
      status: 400,
    } as const
  }

  const tweetId = parseTweetId(input)
  if (!tweetId) {
    return {
      error: 'Missing required field: tweet_id or tweet_url',
      status: 400,
    } as const
  }

  const skill = await getSkillBySlug(slug)
  if (!skill) {
    return {
      error: 'Skill not found',
      status: 404,
    } as const
  }

  const text =
    input.text ||
    buildCommunityIndexedReplyText(skill, {
      creatorName: input.creator || skill.author_name,
      sourceUrl: input.source_url || skill.repository,
    })

  return {
    skill,
    tweetId,
    text: text.slice(0, 280),
    intentUrl: buildXIntentUrl(text.slice(0, 280), tweetId),
  } as const
}

function parseGetInput(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  return ReplyRequestSchema.safeParse({
    skill_slug: searchParams.get('skill_slug') || undefined,
    pack_slug: searchParams.get('pack_slug') || undefined,
    slug: searchParams.get('slug') || undefined,
    tweet_id: searchParams.get('tweet_id') || undefined,
    tweet_url: searchParams.get('tweet_url') || undefined,
    creator: searchParams.get('creator') || undefined,
    source_url: searchParams.get('source_url') || undefined,
    text: searchParams.get('text') || undefined,
    dry_run: true,
  })
}

export async function GET(request: NextRequest) {
  const parsed = parseGetInput(request)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid reply payload' }, { status: 400 })
  }

  const draft = await buildDraft(parsed.data)
  if ('error' in draft) {
    return NextResponse.json({ success: false, error: draft.error }, { status: draft.status })
  }

  return NextResponse.json({
    success: true,
    status: 'draft',
    target: 'pack' in draft
      ? {
          type: 'pack',
          slug: draft.pack.slug,
          name: draft.pack.title,
          url: `https://www.openagentskill.com/skill-packs/${draft.pack.slug}?ref=x&utm_source=x_reply`,
        }
      : {
          type: 'skill',
          slug: draft.skill.slug,
          name: draft.skill.name,
          url: `https://www.openagentskill.com/skills/${draft.skill.slug}?ref=x&utm_source=x_reply`,
        },
    in_reply_to: draft.tweetId,
    text: draft.text,
    intentUrl: draft.intentUrl,
    meta: {
      posts_to_x: false,
      requires_post_request: true,
      x_api_credits_used: false,
    },
  })
}

export async function POST(request: NextRequest) {
  if (!isAutomationAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = ReplyRequestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid reply payload',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    )
  }

  const draft = await buildDraft(parsed.data)
  if ('error' in draft) {
    return NextResponse.json({ success: false, error: draft.error }, { status: draft.status })
  }

  if (parsed.data.dry_run) {
    return NextResponse.json({
      success: true,
      status: 'draft',
      target: 'pack' in draft
        ? {
            type: 'pack',
            slug: draft.pack.slug,
            name: draft.pack.title,
            url: `https://www.openagentskill.com/skill-packs/${draft.pack.slug}?ref=x&utm_source=x_reply`,
          }
        : {
            type: 'skill',
            slug: draft.skill.slug,
            name: draft.skill.name,
            url: `https://www.openagentskill.com/skills/${draft.skill.slug}?ref=x&utm_source=x_reply`,
          },
      in_reply_to: draft.tweetId,
      text: draft.text,
      intentUrl: draft.intentUrl,
      meta: {
        posts_to_x: false,
        x_api_credits_used: false,
      },
    })
  }

  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) {
    return NextResponse.json({ success: false, error: 'Missing INDEXER_SECRET' }, { status: 500 })
  }

  const supabase = createPublicClient()
  const connection = await getStoredXConnection(supabase, serverSecret)
  if (!connection) {
    return NextResponse.json({
      success: false,
      status: 'manual_required',
      reason: 'X account is not authorized yet',
      text: draft.text,
      intentUrl: draft.intentUrl,
    })
  }

  const token = await refreshXAccessToken(connection.refresh_token)
  await saveRefreshedXToken(supabase, serverSecret, token)

  const created = await createXReplyPost(token.access_token, draft.text, draft.tweetId)
  const replyId = created.data?.id
  if (!replyId) {
    throw new Error(`X reply response did not include an id: ${JSON.stringify(created)}`)
  }

  await recordXPost(supabase, serverSecret, {
    skill_id: 'skill' in draft ? draft.skill.id : null,
    skill_slug: 'skill' in draft ? draft.skill.slug : `pack:${draft.pack.slug}`,
    status: 'posted',
    x_post_id: replyId,
    post_text: draft.text,
    posted_at: new Date().toISOString(),
    metadata: {
      type: 'reply',
      username: connection.username,
      in_reply_to: draft.tweetId,
      source_tweet_url: parsed.data.tweet_url || null,
      target_type: 'pack' in draft ? 'pack' : 'skill',
      response: created,
    },
  })

  return NextResponse.json({
    success: true,
    status: 'posted',
    target: 'pack' in draft
      ? {
          type: 'pack',
          slug: draft.pack.slug,
          name: draft.pack.title,
          url: `https://www.openagentskill.com/skill-packs/${draft.pack.slug}?ref=x&utm_source=x_reply`,
        }
      : {
          type: 'skill',
          slug: draft.skill.slug,
          name: draft.skill.name,
          url: `https://www.openagentskill.com/skills/${draft.skill.slug}?ref=x&utm_source=x_reply`,
        },
    post: {
      id: replyId,
      text: draft.text,
      url: `https://x.com/${connection.username}/status/${replyId}`,
      in_reply_to: draft.tweetId,
    },
    meta: {
      x_api_credits_used: true,
      flow: 'community_indexed_skill_reply',
    },
  })
}
