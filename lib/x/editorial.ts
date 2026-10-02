export const X_EDITORIAL_VERSION = 2

export type XEditorialFormat = 'skill_spotlight_v2' | 'task_shortlist_v2'

export interface XEditorialPick {
  slug: string
  name: string
  description: string
  githubRepo: string
  installCommand: string
}

const TASKS: Record<string, string> = {
  coding: 'your next repo change',
  research: 'your next research brief',
  finance: 'company and market research',
  presentation: 'your next slide deck',
  creative: 'your next design task',
  growth: 'your next marketing task',
  automation: 'a recurring web task',
  sports: 'your next match analysis',
}

// twitter-text v3 weights. Counting emoji sequences as individual code points
// is conservative: it can shorten copy, but cannot undercount a sequence.
export function getXTextLength(value: string) {
  const text = value.normalize('NFC').replace(/https?:\/\/\S+/g, 'x'.repeat(23))
  return Array.from(text).reduce((total, character) => {
    const point = character.codePointAt(0)!
    const single = point <= 0x10ff || (point >= 0x2000 && point <= 0x200d) ||
      (point >= 0x2010 && point <= 0x201f) || (point >= 0x2032 && point <= 0x2037)
    return total + (single ? 1 : 2)
  }, 0)
}

function clean(value: string) {
  return value.replace(/https?:\/\/\S+/g, '').replace(/@(?=[\w])/g, '').replace(/\s+/g, ' ').trim()
}

function clip(value: string, budget: number) {
  const text = clean(value)
  if (getXTextLength(text) <= budget) return text
  let result = ''
  for (const character of text) {
    if (getXTextLength(result + character + '…') > budget) break
    result += character
  }
  const boundary = result.lastIndexOf(' ')
  if (boundary >= result.length * 0.65) result = result.slice(0, boundary)
  return `${result.trim()}…`
}

export function getXEditorialFormat(lane: string, edition: string): XEditorialFormat {
  const day = Math.floor(Date.parse(`${edition}T00:00:00Z`) / 86_400_000) || 0
  const laneSeed = Array.from(lane).reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return (day + laneSeed) % 2 === 0 ? 'skill_spotlight_v2' : 'task_shortlist_v2'
}

function spotlightFrame(pick: XEditorialPick, lane: string) {
  // Match the stated capability, rather than assuming every Claude Code skill
  // does coding or every presentation skill exports editable PowerPoint.
  const text = `${pick.name} ${pick.description}`.toLowerCase()
  if (/code review|review.*\b(diff|branch|pull request)\b/.test(text)) return {
    hook: "Your agent opened a PR. What did it miss?",
    prompt: 'Try: Review this diff against the repo standards.',
  }
  if (/debug|agent.*fail|diagnos/.test(text)) return {
    hook: 'An agent run failed. What should you check next?',
    prompt: 'Try: Diagnose this failed run before retrying.',
  }
  if (/landing page|user interface|\bui\b.*design|layout.*typography/.test(text)) return {
    hook: 'Another generic AI landing page?',
    prompt: "Try: Review this page's layout and typography.",
  }
  if (/\b(pptx|slide deck|slides|presentation)\b/.test(text)) return {
    hook: 'Building a deck from a brief?',
    prompt: 'Try: Turn this brief into a slide deck.',
  }
  if (/\b(pdf|ocr)\b/.test(text)) return {
    hook: 'Need usable text from your source documents?',
    prompt: 'Try: Extract the text from this sample document.',
  }
  return { hook: `One workflow to shortlist for ${TASKS[lane] || 'your next agent task'}:`, prompt: '' }
}

function buildSpotlight(pick: XEditorialPick, lane: string) {
  const { hook, prompt } = spotlightFrame(pick, lane)
  const name = clip(pick.name, 62)
  const footer = [prompt, 'Source + setup in the reply.'].filter(Boolean).join('\n')
  const remaining = 280 - getXTextLength([hook, '', name, '', '', '', footer].join('\n'))
  return [hook, '', name, '', clip(pick.description, remaining), '', footer].join('\n')
}

function buildShortlist(picks: XEditorialPick[], lane: string) {
  const header = `${picks.length} picks for ${TASKS[lane] || 'your next agent task'}:`
  const footer = 'Sources + setup in the reply.'
  for (const [nameBudget, descriptionBudget] of [[38, 50], [30, 38], [24, 30], [18, 24]]) {
    const lines = picks.map((pick, index) => `${index + 1}. ${clip(pick.name, nameBudget)}: ${clip(pick.description, descriptionBudget)}`)
    const text = [header, '', ...lines, '', footer].join('\n')
    if (getXTextLength(text) <= 280) return text
  }
  throw new Error('Unable to fit a useful X shortlist')
}

function buildReply(picks: XEditorialPick[], url: string, format: XEditorialFormat) {
  if (format === 'skill_spotlight_v2') {
    const pick = picks[0]
    const source = `Source: https://github.com/${pick.githubRepo}`
    // Never truncate a command or invent a repo-wide installer for an untracked
    // manifest. An overlong/missing command belongs on the full listing.
    const command = pick.installCommand.trim()
    const full = [source, '', `Install:\n${command}`, '', 'Details + review notes:', url].join('\n')
    if (command && !/[\r\n]/.test(command) && getXTextLength(full) <= 280) return full
    return [source, '', 'Check the source and setup requirements:', url].join('\n')
  }

  const sources = picks.map((pick, index) => `${index + 1}. https://github.com/${pick.githubRepo}`)
  return ['Source repos, in order:', ...sources, '', 'Exact install paths + review notes:', url].join('\n')
}

export function buildXEditorialCopy(input: {
  lane: string
  edition: string
  picks: XEditorialPick[]
  url: string
  format?: XEditorialFormat
}) {
  const seen = new Set<string>()
  const validPicks = input.picks.filter(pick => {
    const repo = pick.githubRepo.toLowerCase()
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !clean(pick.name) || !clean(pick.description) || seen.has(repo)) return false
    seen.add(repo)
    return true
  })
  if (!validPicks.length) return null
  const requested = input.format || getXEditorialFormat(input.lane, input.edition)
  const contentFormat = validPicks.length < 3 ? 'skill_spotlight_v2' : requested
  const featured = validPicks.slice(0, contentFormat === 'skill_spotlight_v2' ? 1 : 3)
  const mainText = contentFormat === 'skill_spotlight_v2'
    ? buildSpotlight(featured[0], input.lane)
    : buildShortlist(featured, input.lane)
  const replyText = buildReply(featured, input.url, contentFormat)
  if (getXTextLength(mainText) > 280 || getXTextLength(replyText) > 280) throw new Error('X editorial copy exceeds the weighted limit')
  return { mainText, replyText, contentFormat, featuredSlugs: featured.map(pick => pick.slug) }
}
