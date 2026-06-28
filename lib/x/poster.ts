import { createPublicClient } from '@/lib/supabase/public'
import { getAllSkills, type SkillRecord } from '@/lib/db/skills'
import {
  createXPost,
  refreshXAccessToken,
  tokenExpiresAt,
  type XTokenResponse,
} from './oauth'

export interface XOAuthConnection {
  x_user_id?: string
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

function getSkillUrlBySlug(slug: string, source?: 'x') {
  const url = `https://www.openagentskill.com/skills/${slug}`
  if (source === 'x') return `${url}?ref=x`
  return url
}

function getSkillUrl(skill: XPostSkill, source?: 'x') {
  return getSkillUrlBySlug(skill.slug, source)
}

export function buildSkillPostText(skill: XPostSkill) {
  return buildHumanSkillPostText(skill, { includeUrl: true, source: undefined })
}

function getSkillSearchText(skill: XPostSkill) {
  return [
    skill.name,
    skill.description,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
  ].join(' ').toLowerCase()
}

function getHumanObservation(skill: XPostSkill) {
  const text = getSkillSearchText(skill)

  if (/(last\s?30|recent|trend|trending|hacker news|reddit|youtube|polymarket|bluesky|social)/.test(text)) {
    return "A lot of agents don't need a bigger prompt. They need fresher context."
  }
  if (/(browser|web|crawl|scrap|page|site|monitor)/.test(text)) {
    return 'Most web agents fail in the boring part: messy pages, missing context, repeatable extraction.'
  }
  if (/(finance|stock|investment|market|equity|quant|trading|portfolio|earnings)/.test(text)) {
    return "Finance agents don't need louder takes. They need sources, data, and a repeatable research path."
  }
  if (/(presentation|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides)/.test(text)) {
    return 'Most agents can draft slides. The hard part is choosing the right deck workflow.'
  }
  if (/\b(code|coding|developer|dev|github|claude|cursor|terminal|repo|review|test)\b/.test(text)) {
    return "Most coding agents don't fail from lack of model power. They fail when repo context disappears."
  }
  if (/(rag|search|knowledge|memory|document|pdf|data|vector)/.test(text)) {
    return 'The useful research skills are not search wrappers. They help agents keep sources attached.'
  }
  if (/(workflow|productivity|task|calendar|email|notion|slack|ops|automation)/.test(text)) {
    return 'A good workflow skill turns repeated manual steps into something an agent can safely replay.'
  }
  if (/(image|video|design|figma|creative|seedance|motion)/.test(text)) {
    return "Creative agents need taste, but they also need a production surface they can actually operate."
  }

  return 'The best agent skills feel small at first, then remove a task your agent used to improvise.'
}

function getCapabilityLine(skill: XPostSkill) {
  const text = getSkillSearchText(skill)
  const name = truncate(skill.name, 54)
  const description = truncate(skill.description, 110)

  if (/(last\s?30|recent|trend|trending|hacker news|reddit|youtube|polymarket|bluesky|social)/.test(text)) {
    return `${name} feels like a recent-web radar for Codex, Claude Code, Cursor, and research agents.`
  }
  if (/(browser|web|crawl|scrap|page|site|monitor)/.test(text)) {
    return `${name} gives agents a cleaner path to browse, extract, and monitor web pages.`
  }
  if (/(finance|stock|investment|market|equity|quant|trading|portfolio|earnings)/.test(text)) {
    return `${name} helps turn market noise into source-backed analysis an agent can reuse.`
  }
  if (/(presentation|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides)/.test(text)) {
    return `${name} helps agents turn briefs, docs, or research notes into editable deck workflows.`
  }
  if (/\b(code|coding|developer|dev|github|claude|cursor|terminal|repo|review|test)\b/.test(text)) {
    return `${name} gives coding agents a repeatable way to plan, patch, review, or ship.`
  }
  if (/(rag|search|knowledge|memory|document|pdf|data|vector)/.test(text)) {
    return `${name} helps agents turn docs, data, or knowledge bases into grounded work.`
  }
  if (/(workflow|productivity|task|calendar|email|notion|slack|ops|automation)/.test(text)) {
    return `${name} helps agents move a repeatable workflow out of manual copy-paste.`
  }
  if (/(image|video|design|figma|creative|seedance|motion)/.test(text)) {
    return `${name} gives creative agents a more practical production workflow.`
  }

  return description ? `${name}: ${description}` : `${name} is a practical agent skill worth shortlisting.`
}

function getOneLineTake(skill: XPostSkill) {
  const text = getSkillSearchText(skill)

  if (/(last\s?30|recent|trend|trending|hacker news|reddit|youtube|polymarket|bluesky|social)/.test(text)) {
    return 'One-line take: recent context beats stale search.'
  }
  if (/(browser|web|crawl|scrap|page|site|monitor)/.test(text)) {
    return 'One-line take: less scraper glue, more usable agent context.'
  }
  if (/(finance|stock|investment|market|equity|quant|trading|portfolio|earnings)/.test(text)) {
    return 'One-line take: make the research path auditable before the agent acts.'
  }
  if (/(presentation|ppt|pptx|powerpoint|slides?|slide deck|deck|pitch deck|keynote|speaker notes|html slides)/.test(text)) {
    return 'One-line take: decks need format fit, not another blank slide.'
  }
  if (/\b(code|coding|developer|dev|github|claude|cursor|terminal|repo|review|test)\b/.test(text)) {
    return 'One-line take: better repo rituals beat another blank prompt.'
  }
  if (/(rag|search|knowledge|memory|document|pdf|data|vector)/.test(text)) {
    return 'One-line take: grounded answers start with better retrieval.'
  }
  if (/(workflow|productivity|task|calendar|email|notion|slack|ops|automation)/.test(text)) {
    return 'One-line take: repeatable work should become agent-readable.'
  }
  if (/(image|video|design|figma|creative|seedance|motion)/.test(text)) {
    return 'One-line take: agents need production taste plus production handles.'
  }

  return 'One-line take: package the capability so the agent does not start from scratch.'
}

function buildHumanSkillPostText(
  skill: XPostSkill,
  options: {
    includeUrl: boolean
    source?: 'x'
  }
) {
  const url = getSkillUrl(skill, options.source)
  const stats = `${formatStars(skill.github_stars)} stars`
  const footer = options.includeUrl ? `${url}\n#AIAgents` : '#AIAgents'
  const build = (parts: string[]) => parts.filter(Boolean).join('\n\n')

  const observation = getHumanObservation(skill)
  const capability = getCapabilityLine(skill)
  const take = getOneLineTake(skill)
  const full = build([observation, capability, take, stats, footer])
  if (full.length <= 280) return full

  const withoutTake = build([observation, capability, stats, footer])
  if (withoutTake.length <= 280) return withoutTake

  const compactBase = build([observation, stats, footer])
  const compactBudget = Math.max(0, 280 - compactBase.length - 2)
  const compact = build([observation, truncate(capability, compactBudget), stats, footer])
  if (compact.length <= 280) return compact

  const fallbackTail = build([`${stats} - ${truncate(skill.category, 28)}`, footer])
  const fallbackBudget = Math.max(0, 280 - fallbackTail.length - 2)
  const fallback = build([truncate(capability, fallbackBudget), fallbackTail])
  if (fallback.length <= 280) return fallback

  return build([truncate(skill.name, Math.max(0, 280 - footer.length - 2)), footer])
}

export function buildManualXMainText(skill: XPostSkill) {
  return buildHumanSkillPostText(skill, { includeUrl: true, source: 'x' })
}

export function buildManualXReplyText(skill: XPostSkill) {
  const installCommand = truncate(skill.install_command || `npx skills add ${skill.github_repo}`, 84)
  const title = `Listing + install path for ${truncate(skill.name, 54)}:`
  const footer = `Install: ${installCommand}`
  const text = [title, getSkillUrl(skill, 'x'), '', footer].join('\n')

  return text.slice(0, 280)
}

export function buildCommunityIndexedReplyText(
  skill: Pick<SkillRecord, 'slug' | 'name' | 'author_name' | 'github_repo'>,
  options: {
    creatorName?: string | null
    sourceUrl?: string | null
  } = {}
) {
  const creatorName = truncate(options.creatorName || skill.author_name || skill.github_repo?.split('/')[0] || '', 32)
  const skillName = truncate(skill.name, 52)
  const url = `${getSkillUrlBySlug(skill.slug, 'x')}&utm_source=x_reply`

  const intro = creatorName
    ? `This is exactly the kind of practical skill agents need. Added ${creatorName}'s ${skillName} to OpenAgentSkill.`
    : `This is exactly the kind of practical skill agents need. Added ${skillName} to OpenAgentSkill.`

  const claimLine = 'Happy to update details or mark it as claimed.'
  const build = (middle: string, includeClaim: boolean) => [
    intro,
    middle,
    '',
    url,
    ...(includeClaim ? ['', claimLine] : []),
  ].join('\n')

  const middle = 'Now builders can discover it, compare trust signals, and find the install path from one page.'
  const full = build(middle, true)
  if (full.length <= 280) return full

  const shorter = build('Now agents/builders can discover and compare it from one page.', true)
  if (shorter.length <= 280) return shorter

  return build('', false).slice(0, 280)
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

export async function getStoredXConnection(supabase: ReturnType<typeof createPublicClient>, serverSecret: string) {
  const { data, error } = await supabase.rpc('get_x_oauth_connection', {
    p_server_secret: serverSecret,
  })

  if (error) throw new Error(`Failed to load X OAuth connection: ${error.message}`)
  if (!data) return null
  const connection = data as XOAuthConnection
  if (!connection.refresh_token) return null
  return connection
}

export async function saveRefreshedXToken(
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

export async function recordXPost(
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
  const connection = await getStoredXConnection(supabase, serverSecret)
  if (!connection) {
    return { status: 'skipped', reason: 'X account is not authorized yet' }
  }

  const token = await refreshXAccessToken(connection.refresh_token)
  await saveRefreshedXToken(supabase, serverSecret, token)

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

    await recordXPost(supabase, serverSecret, {
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
    await recordXPost(supabase, serverSecret, {
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
