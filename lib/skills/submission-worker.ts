import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { GitHubRepoSchema } from '@/lib/schema/skill-schema'
import { validateGitHubRepo } from '@/lib/github/api'
import { discoverGitHubSkills, fetchSkillPackageSnapshot, parseGitHubSkillReference } from '@/lib/github/skill-source'
import { reviewOpenSubmission } from '@/lib/skills/open-submission'
import { SUBMISSION_LEASE_MS, SUBMISSION_MAX_ATTEMPTS, submissionJobEligible } from '@/lib/skills/submission-contract'

/** Existing private submission rows are the durable queue. Claim with compare-and-swap. */
export async function processSubmissionJob(id: string) {
  const db = createAdminClient({ requestTimeoutMs: 12_000 })
  const { data: row, error } = await db.from('skill_submissions').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!row || !submissionJobEligible(row)) return 'skipped'
  const validation = row.validation_result || {}
  const previousAttempts = Math.max(0, Number(validation.queue?.attempts) || 0)
  const startedAt = new Date().toISOString()
  const { data: claimed, error: claimError } = await db.from('skill_submissions').update({
    status: 'processing', review_started_at: startedAt,
    validation_result: { ...validation, queue: { ...validation.queue, attempts: Math.min(previousAttempts + 1, SUBMISSION_MAX_ATTEMPTS), last_started_at: startedAt } },
  }).eq('id', id).eq('status', row.status).eq('updated_at', row.updated_at).select('id').maybeSingle()
  if (claimError) throw claimError
  if (!claimed) return 'skipped'

  const finish = async (values: Record<string, unknown>) => {
    const { error: saveError } = await db.from('skill_submissions').update(values)
      .eq('id', id).eq('status', 'processing').eq('review_started_at', startedAt)
    if (saveError) throw saveError
  }
  const manual = async (reason: string) => {
    await finish({ status: 'listed', reviewed_at: new Date().toISOString(), ai_review_result: {
      ...(row.ai_review_result || {}), approved: false, stage: 'recovery_manual',
      issues: [...new Set([...(Array.isArray(row.ai_review_result?.issues) ? row.ai_review_result.issues : []), reason])],
      suggestions: [...new Set([...(Array.isArray(row.ai_review_result?.suggestions) ? row.ai_review_result.suggestions : []), 'Submit an updated immutable SKILL.md revision or request human review.'])],
    } })
    return 'manual_review'
  }
  // Only interrupted/submitted jobs are eligible. Rejected, quarantined and completed reviews are never retried here.
  if (previousAttempts >= SUBMISSION_MAX_ATTEMPTS) return manual('Automatic processing could not finish after three attempts. Human review is required.')
  if (!row.source_ref || !/^[a-f0-9]{40}$/i.test(row.source_ref)) {
    return manual('This older submission does not record an immutable source commit. Resubmit to review the current version.')
  }

  try {
    const reference = parseGitHubSkillReference(row.github_repo)
    if (!reference || !row.skill_path) return manual('The submitted repository or SKILL.md path is incomplete.')
    const storedRepo = GitHubRepoSchema.safeParse(validation.repository_snapshot)
    const repository = storedRepo.success ? storedRepo.data : await validateGitHubRepo(`${reference.owner}/${reference.repo}`, { checkReadme: false, checkSkillJson: false })
    const discovery = await discoverGitHubSkills({ ...reference, ref: row.source_ref, path: row.skill_path }, repository)
    const skill = discovery.skills.find(item => item.path === row.skill_path)
    if (!skill) throw new Error('SourceUnavailable')
    const snapshot = await fetchSkillPackageSnapshot(skill, { repositoryTree: discovery.tree })
    await reviewOpenSubmission({
      repository, skill, category: row.category || undefined, tags: row.tags || [],
      submissionSource: row.submission_source === 'agent' ? 'agent' : row.submission_source === 'api' ? 'api' : 'web',
      submittedByAgent: row.submitted_by_agent || undefined,
      makerGithub: row.submitter_github || undefined, makerX: row.submitter_x || undefined,
      requestFingerprint: row.request_fingerprint || '', codeFiles: snapshot.files,
      packageFingerprint: snapshot.fingerprint,
      packageComplete: !discovery.truncated && !snapshot.truncated && !snapshot.hasUnreviewedFiles,
    }, id, startedAt)
    return 'processed'
  } catch {
    if (previousAttempts + 1 >= SUBMISSION_MAX_ATTEMPTS) return manual('Automatic processing could not finish after three attempts. Human review is required.')
    // Retain the lease until it expires: durable backoff, not an immediate expensive loop.
    await finish({ validation_result: { ...validation, queue: {
      ...validation.queue, attempts: previousAttempts + 1, last_started_at: startedAt,
      last_error: 'Processing interrupted; retry after lease expiry.',
    } } })
    return 'retry_scheduled'
  }
}

export async function runSubmissionQueue() {
  const db = createAdminClient({ requestTimeoutMs: 12_000 })
  const cutoff = new Date(Date.now() - SUBMISSION_LEASE_MS).toISOString()
  const { data, error } = await db.from('skill_submissions').select('id')
    .or(`status.eq.submitted,and(status.eq.processing,updated_at.lt.${cutoff})`)
    .order('created_at', { ascending: true }).limit(3)
  if (error) throw error
  const started = Date.now()
  const results: string[] = []
  for (const row of data || []) {
    if (Date.now() - started > 120_000) break
    results.push(await processSubmissionJob(row.id))
  }
  const { count: waitingManual } = await db.from('skill_submissions').select('id', { count: 'exact', head: true }).eq('status', 'listed')
  const summary = { processed: results.length, results, waitingManual: waitingManual ?? null }
  if (results.includes('manual_review') || results.includes('retry_scheduled')) console.warn('[submission-queue] Needs attention', summary)
  return summary
}
