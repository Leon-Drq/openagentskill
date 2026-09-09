import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const AUTOMATION_MARKER = '<!-- openagentskill-auto-ingest -->'

const FINAL_STATUSES = new Set(['listed', 'reviewed', 'duplicate', 'quarantined'])
const DEFAULT_API_BASE_URL = 'https://www.openagentskill.com'
const ATTEMPT_MARKER = '<!-- openagentskill-review-attempt:'
const REVIEW_COOLDOWN_MS = 6 * 60 * 60 * 1000

export function parseMaintainerCommand(body) {
  const match = String(body || '').trim().match(/^\/oas\s+(review\s+([a-f0-9]{40})|reconcile)$/i)
  return match ? { operation: match[2] ? 'review' : 'reconcile', revision: match[2]?.toLowerCase() } : null
}

export function reviewAttemptDecision(comments, { repository, path, commit }, now = Date.now()) {
  const attempts = comments.filter(c => c.user?.login === 'github-actions[bot]').flatMap(c => {
    const match = c.body?.match(/<!-- openagentskill-review-attempt:(\{[^\n]+\}) -->/)
    if (!match) return []
    try { return [{ ...JSON.parse(match[1]), createdAt: Date.parse(c.created_at) }] } catch { return [] }
  })
  if (attempts.some(a => a.repository === repository && a.path === path && a.commit === commit)) return 'This immutable revision was already submitted. Reconcile its status instead of paying for another review.'
  if (attempts.some(a => !Number.isFinite(a.createdAt) || now - a.createdAt < REVIEW_COOLDOWN_MS)) return 'Re-review cooldown: wait six hours before submitting another revision of this Issue.'
  return null
}

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
    const method = review?.method === 'static' ? 'Static checks passed (not an AI review or runtime test).'
      : review?.method === 'ai' ? 'AI review passed for the submitted revision (not a runtime test or safety guarantee).'
      : 'The submission pipeline reports publication; the review method is not recorded.'
    return `${AUTOMATION_MARKER}\nThanks for submitting **${name}**. ${method}\n\n${publicUrl || 'Public URL is not yet available; this Issue remains open.'}`
  }
  if (status === 'duplicate') {
    return `${AUTOMATION_MARKER}\nThanks for submitting **${name}**. This Skill is already in OpenAgentSkill${publicUrl ? `:\n\n${publicUrl}` : '.'}\n\nPublication and review are separate facts. ${skill?.reviewEvidence?.manual_reviewed ? 'A manual source review is recorded; this is not an AI review or runtime test.' : skill?.reviewEvidence?.static_checked ? 'Static checks are recorded, not an AI review or runtime test.' : skill?.reviewEvidence?.ai_reviewed ? 'AI review evidence is recorded; runtime safety is not guaranteed.' : 'No current, classified AI-review evidence is recorded.'}${skill?.license ? ` License: ${skill.license}.` : ''}`
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
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: 'error', ...options })
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
  // Append rather than rewrite: previous review decisions remain visible.
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
  if (new URL(statusUrl).origin !== apiBaseUrl) throw new Error('Invalid receipt origin.')

  for (let attempt = 0; attempt < 45; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    const payload = await fetchJson(statusUrl, {
      headers: { 'User-Agent': 'OpenAgentSkill-Issue-Ingest/1.0' },
    })
    if (FINAL_STATUSES.has(payload.submission?.status)) return payload.submission
  }

  return receipt
}

async function issueComments(repository, number, token) {
  const comments = []
  for (let page = 1; page <= 3; page++) {
    const batch = await fetchJson(`https://api.github.com/repos/${repository}/issues/${number}/comments?per_page=100&page=${page}`, { headers: githubHeaders(token) })
    comments.push(...batch)
    if (batch.length < 100) return comments
  }
  throw new Error('Issue history exceeds the automatic review window; inspect manually.')
}

export async function processSkillIssue({ event, repository, githubToken, apiBaseUrl = DEFAULT_API_BASE_URL, operation, revision }) {
  const issue = event.issue
  if (!issue || issue.pull_request || issue.state === 'closed' || !/^\[Skill\]:/i.test(issue.title || '')) {
    return { skipped: true, reason: 'Not a Skill submission issue.' }
  }
  if (!isNewSkillRequest(issue.body || '')) {
    return { skipped: true, reason: 'This issue is not a New Skill request.' }
  }

  if (event.comment) {
    const command = parseMaintainerCommand(event.comment.body)
    if (!command || event.action !== 'created') return { skipped: true, reason: 'Not a maintainer command.' }
    const actor = event.comment.user?.login
    const permission = await fetchJson(`https://api.github.com/repos/${repository}/collaborators/${encodeURIComponent(actor || '')}/permission`, { headers: githubHeaders(githubToken) })
    if (!['admin', 'maintain', 'write'].includes(permission.permission)) return { skipped: true, reason: 'Maintainer permission required.' }
    ;({ operation, revision } = command)
  }

  const sourceUrl = extractGitHubSource(issue.body || '')
  if (!sourceUrl) throw new Error('No supported public GitHub repository, directory, or SKILL.md URL was found.')

  const baseUrl = apiBaseUrl.replace(/\/$/, '')
  if (baseUrl !== DEFAULT_API_BASE_URL) throw new Error('Issue ingestion only targets the production first-party API.')
  const comments = await issueComments(repository, issue.number, githubToken)
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

  const sourceParts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  const sourceRepository = sourceParts.slice(0, 2).join('/').toLowerCase()
  const lookupUrl = `${baseUrl}/api/skills/lookup?${new URLSearchParams({ repository: sourceRepository, path: candidate.path })}`
  const existing = (await fetchJson(lookupUrl)).skill
  if (existing) {
    if (operation === 'review' && revision && existing.commit !== revision) {
      return { skipped: true, reason: 'A different revision is already published. Use source-version sync; do not overwrite its review with a new submission.' }
    }
    await upsertIssueComment({ repository, issueNumber: issue.number, token: githubToken, body: buildResultComment({ status: 'duplicate', skill: existing, apiBaseUrl: baseUrl }) })
    await closeIssue({ repository, issueNumber: issue.number, token: githubToken })
    return { status: 'duplicate', skill: existing }
  }
  if (operation === 'reconcile') return { skipped: true, reason: 'No public listing matches this repository and Skill path. The Issue remains open.' }
  const requestedRef = revision || candidate.ref
  if (operation === 'review' && !/^[a-f0-9]{40}$/.test(revision || '')) throw new Error('Re-review requires a full immutable commit SHA.')
  const commitResult = await fetchJson(`https://api.github.com/repos/${sourceRepository}/commits/${encodeURIComponent(requestedRef)}`, { headers: githubHeaders(githubToken) })
  if (!/^[a-f0-9]{40}$/.test(commitResult.sha || '')) throw new Error('Could not pin source commit.')
  const attempt = { repository: sourceRepository, path: candidate.path, commit: commitResult.sha }
  const decision = reviewAttemptDecision(comments, attempt)
  if (decision) return { skipped: true, reason: decision }
  await upsertIssueComment({ repository, issueNumber: issue.number, token: githubToken,
    body: `${ATTEMPT_MARKER}${JSON.stringify(attempt)} -->\nReview requested for immutable revision \`${attempt.commit}\`. Previous reviews remain unchanged. Publication requires the normal submission checks.` })

  const submitted = await fetchJson(`${baseUrl}/api/skills/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'OpenAgentSkill-Issue-Ingest/1.0' },
    body: JSON.stringify({
      repository: sourceUrl,
      skillPath: candidate.path,
      sourceRef: attempt.commit,
      tags: extractSuggestedTags(issue.body || ''),
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
  if (['reviewed', 'duplicate'].includes(result.status) && result.skill?.slug) {
    const confirmed = (await fetchJson(lookupUrl)).skill
    if (confirmed?.slug !== result.skill.slug) throw new Error('Publication could not be confirmed; Issue remains open.')
    await closeIssue({ repository, issueNumber: issue.number, token: githubToken })
  }

  return { skipped: false, sourceUrl, commit: attempt.commit, status: result.status, skill: result.skill, review: result.review }
}

async function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  const repository = process.env.GITHUB_REPOSITORY
  const githubToken = process.env.GITHUB_TOKEN
  if (!eventPath || !repository || !githubToken) {
    throw new Error('GITHUB_EVENT_PATH, GITHUB_REPOSITORY, and GITHUB_TOKEN are required.')
  }

  const event = JSON.parse(await readFile(eventPath, 'utf8'))
  if (process.env.GITHUB_EVENT_NAME === 'schedule') {
    const issues = await fetchJson(`https://api.github.com/repos/${repository}/issues?state=open&sort=created&direction=asc&per_page=100`, { headers: githubHeaders(githubToken) })
    const candidates = issues.filter(issue => !issue.pull_request && /^\[Skill\]:/i.test(issue.title || '') && isNewSkillRequest(issue.body || ''))
    // Bounded rotating sweep. It only reconciles publication; never starts a review.
    const offset = candidates.length ? (Math.floor(Date.now() / 86400000) * 5) % candidates.length : 0
    const selected = [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(0, 5)
    for (const issue of selected) {
      try {
        const result = await processSkillIssue({ event: { issue }, repository, githubToken, operation: 'reconcile' })
        console.log(JSON.stringify({ issue: issue.number, ...result }))
      } catch {
        // An outage is not a rejection. Avoid overwriting review comments or spamming the Issue.
        console.error(`Publication reconciliation unavailable for Issue #${issue.number}; left open.`)
        process.exitCode = 1
        break
      }
    }
    return
  }
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    if (!/^\d+$/.test(event.inputs?.issue_number || '')) throw new Error('Invalid issue number.')
    event.issue = await fetchJson(`https://api.github.com/repos/${repository}/issues/${event.inputs.issue_number}`, { headers: githubHeaders(githubToken) })
  }
  try {
    const result = await processSkillIssue({
      event,
      repository,
      githubToken,
      apiBaseUrl: process.env.OPENAGENTSKILL_API_BASE_URL || DEFAULT_API_BASE_URL,
      operation: event.inputs?.operation,
      revision: event.inputs?.revision,
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
