import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const AUTOMATION_MARKER = '<!-- openagentskill-auto-ingest -->'

const FINAL_STATUSES = new Set(['listed', 'reviewed', 'duplicate', 'quarantined'])
const DEFAULT_API_BASE_URL = 'https://www.openagentskill.com'

function sectionBody(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'im'))
  return match?.[1]?.trim() || ''
}

export function extractGitHubSource(markdown) {
  const section = sectionBody(markdown, 'Public repository, subdirectory, or SKILL.md URL')
  const match = section.match(/https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/(?:tree|blob)\/[^\s)>]+)?/i)
  return match?.[0]?.replace(/[.,;]+$/, '') || null
}

export function extractSuggestedTags(markdown) {
  const section = sectionBody(markdown, 'Requested metadata or safety correction')
    || sectionBody(markdown, 'Requested metadata')
  const line = section.split(/\r?\n/).find((value) => /^\s*(?:\*\*)?Suggested tags(?:\*\*)?\s*:/i.test(value))
  if (!line) return []

  const tags = []
  const seen = new Set()
  for (const match of line.matchAll(/`([^`]+)`/g)) {
    const tag = match[1].trim().toLowerCase()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= 10) break
  }
  return tags
}

export function isNewSkillRequest(markdown) {
  const section = sectionBody(markdown, 'Request type')
  return /^\s*-\s*(?:\[[x ]\]\s*)?New Skill\s*$/im.test(section)
}

export function chooseSkillCandidate(skills, sourceUrl) {
  if (!Array.isArray(skills) || skills.length === 0) return null
  if (skills.length === 1) return skills[0]

  const normalizedSource = sourceUrl.replace(/\/$/, '').toLowerCase()
  return skills.find((skill) => skill.sourceUrl?.replace(/\/$/, '').toLowerCase() === normalizedSource) || null
}

export function buildResultComment({ status, skill, review, apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const name = skill?.name || 'the submitted Skill'
  const slug = skill?.slug
  const publicUrl = slug ? `${apiBaseUrl.replace(/\/$/, '')}/skills/${slug}` : null
  const notes = Array.isArray(review?.issues) ? review.issues.slice(0, 5) : []
  const noteList = notes.length > 0 ? `\n\nReview notes:\n${notes.map((note) => `- ${note}`).join('\n')}` : ''

  if (status === 'reviewed') {
    return `${AUTOMATION_MARKER}\nThanks for submitting **${name}**. The automated security and quality review passed, and the Skill is now published:\n\n${publicUrl}`
  }
  if (status === 'duplicate') {
    return `${AUTOMATION_MARKER}\nThanks for submitting **${name}**. This Skill is already in OpenAgentSkill${publicUrl ? `:\n\n${publicUrl}` : '.'}`
  }
  if (status === 'listed') {
    return `${AUTOMATION_MARKER}\nThanks for submitting **${name}**. It was saved to the OpenAgentSkill community review queue, but automated review did not approve immediate publication. This issue will remain open for manual review.${noteList}`
  }
  if (status === 'quarantined') {
    return `${AUTOMATION_MARKER}\nThanks for submitting **${name}**. The automated security scan quarantined this revision, so it was not published. This issue will remain open for manual review.${noteList}`
  }
  return `${AUTOMATION_MARKER}\nThanks for submitting **${name}**. The submission was saved and automated review is still processing. This issue will remain open until a final result is available.`
}

export function buildFailureComment(message) {
  return `${AUTOMATION_MARKER}\nThanks for the submission. OpenAgentSkill could not import this Issue automatically:\n\n> ${String(message).replace(/\s+/g, ' ').slice(0, 500)}\n\nPlease verify that the public URL contains a valid \`SKILL.md\` with \`name\` and \`description\` frontmatter. This issue will remain open for manual review.`
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let payload = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = { error: text.slice(0, 500) }
  }
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `Request failed with HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  return payload
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'OpenAgentSkill-Issue-Ingest/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function upsertIssueComment({ repository, issueNumber, token, body }) {
  const commentsUrl = `https://api.github.com/repos/${repository}/issues/${issueNumber}/comments`
  const comments = await fetchJson(`${commentsUrl}?per_page=100`, { headers: githubHeaders(token) })
  const previous = Array.isArray(comments)
    ? comments.find((comment) => comment?.user?.type === 'Bot' && comment?.body?.includes(AUTOMATION_MARKER))
    : null

  if (previous?.id) {
    return fetchJson(`https://api.github.com/repos/${repository}/issues/comments/${previous.id}`, {
      method: 'PATCH',
      headers: githubHeaders(token),
      body: JSON.stringify({ body }),
    })
  }

  return fetchJson(commentsUrl, {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({ body }),
  })
}

async function closeIssue({ repository, issueNumber, token }) {
  await fetchJson(`https://api.github.com/repos/${repository}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: githubHeaders(token),
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  })
}

async function waitForSubmission(apiBaseUrl, receipt) {
  if (FINAL_STATUSES.has(receipt.status)) return receipt
  const statusUrl = new URL(receipt.statusUrl, apiBaseUrl).toString()

  for (let attempt = 0; attempt < 45; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    const payload = await fetchJson(statusUrl, {
      headers: { 'User-Agent': 'OpenAgentSkill-Issue-Ingest/1.0' },
    })
    if (FINAL_STATUSES.has(payload.submission?.status)) return payload.submission
  }

  return receipt
}

export async function processSkillIssue({ event, repository, githubToken, apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const issue = event.issue
  if (!issue || !/^\[Skill\]:/i.test(issue.title || '')) {
    return { skipped: true, reason: 'Not a Skill submission issue.' }
  }
  if (!isNewSkillRequest(issue.body || '')) {
    return { skipped: true, reason: 'This issue is not a New Skill request.' }
  }

  const sourceUrl = extractGitHubSource(issue.body || '')
  if (!sourceUrl) throw new Error('No supported public GitHub repository, directory, or SKILL.md URL was found.')

  const baseUrl = apiBaseUrl.replace(/\/$/, '')
  const validation = await fetchJson(`${baseUrl}/api/skills/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'OpenAgentSkill-Issue-Ingest/1.0' },
    body: JSON.stringify({ repository: sourceUrl }),
  })
  const candidate = chooseSkillCandidate(validation.skills, sourceUrl)
  if (!candidate) {
    throw new Error(validation.skills?.length > 1
      ? 'The source contains multiple Skills. Please link directly to one Skill directory or SKILL.md file.'
      : 'No valid SKILL.md was found at the submitted source.')
  }

  const submitted = await fetchJson(`${baseUrl}/api/skills/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'OpenAgentSkill-Issue-Ingest/1.0' },
    body: JSON.stringify({
      repository: sourceUrl,
      skillPath: candidate.path,
      sourceRef: candidate.ref,
      tags: extractSuggestedTags(issue.body || ''),
      makerGithub: issue.user?.login,
      submissionSource: 'api',
    }),
  })
  const result = await waitForSubmission(baseUrl, submitted.submission)
  const comment = buildResultComment({ ...result, apiBaseUrl: baseUrl })

  await upsertIssueComment({
    repository,
    issueNumber: issue.number,
    token: githubToken,
    body: comment,
  })
  if (result.status === 'reviewed' || result.status === 'duplicate') {
    await closeIssue({ repository, issueNumber: issue.number, token: githubToken })
  }

  return { skipped: false, sourceUrl, candidate, submission: result }
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  const repository = process.env.GITHUB_REPOSITORY
  const githubToken = process.env.GITHUB_TOKEN
  if (!eventPath || !repository || !githubToken) {
    throw new Error('GITHUB_EVENT_PATH, GITHUB_REPOSITORY, and GITHUB_TOKEN are required.')
  }

  const event = JSON.parse(await readFile(eventPath, 'utf8'))
  try {
    const result = await processSkillIssue({
      event,
      repository,
      githubToken,
      apiBaseUrl: process.env.OPENAGENTSKILL_API_BASE_URL || DEFAULT_API_BASE_URL,
    })
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    if (event.issue?.number) {
      await upsertIssueComment({
        repository,
        issueNumber: event.issue.number,
        token: githubToken,
        body: buildFailureComment(error instanceof Error ? error.message : error),
      })
    }
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
