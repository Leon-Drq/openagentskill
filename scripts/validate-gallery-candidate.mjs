import { pathToFileURL } from 'node:url'

const requiredJobs = ['Lint and typecheck', 'Regression tests', 'Production build']
const eligibleRuns = (runs, sha, workflow, afterId, branch) => runs
  .filter(run => run.head_sha === sha && run.event === 'workflow_dispatch'
    && run.path === `.github/workflows/${workflow}` && run.id > afterId
    && (!branch || run.head_branch === branch))
  .sort((a, b) => b.id - a.id)

export function candidateCIState(runs, jobs, sha, { workflow = 'ci.yml', afterId = 0, branch, required = requiredJobs } = {}) {
  const latest = eligibleRuns(runs, sha, workflow, afterId, branch)[0]
  if (!latest || latest.status !== 'completed' || latest.conclusion === 'cancelled') return 'waiting'
  if (latest.conclusion !== 'success') return 'failed'
  return required.every(name => jobs.some(job => job.name === name && job.conclusion === 'success')) ? 'passed' : 'failed'
}

export async function validateGalleryCandidate({ repository, branch, sha, token, fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 120, workflows = ['ci.yml', 'cloudflare-migration.yml'] }) {
  if (repository !== 'Leon-Drq/openagentskill' || !/^codex\/gallery-sync-\d+-\d+$/.test(branch || '') || !/^[a-f0-9]{40}$/.test(sha || '') || !token) throw new Error('Invalid Gallery CI context')
  const api = async (endpoint, body) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}/${endpoint}`, {
      redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'OpenAgentSkill-Gallery-CI', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
    })
    if (!response.ok) throw new Error(`GitHub CI API returned ${response.status}`)
    return response.status === 204 ? null : response.json()
  }
  // Explicit dispatch runs on the candidate ref/SHA even with GITHUB_TOKEN.
  // No Vercel event or synthetic check is needed. Dispatch mutations never replay.
  await Promise.all(workflows.map(async workflow => {
    if (!['ci.yml', 'cloudflare-migration.yml'].includes(workflow)) throw new Error('Invalid Gallery workflow')
    const endpoint = `actions/workflows/${workflow}/runs?event=workflow_dispatch&head_sha=${sha}&per_page=50`
    const before = await api(endpoint)
    const afterId = Math.max(0, ...before.workflow_runs.map(run => run.id))
    await api(`actions/workflows/${workflow}/dispatches`, { ref: branch })
    const required = workflow === 'ci.yml' ? requiredJobs : ['validate']
    for (let attempt = 0; attempt < attempts; attempt++) {
      const {workflow_runs: runs} = await api(endpoint)
      const latest = eligibleRuns(runs, sha, workflow, afterId, branch)[0]
      const {jobs} = latest?.status === 'completed' ? await api(`actions/runs/${latest.id}/jobs?per_page=100`) : {jobs: []}
      const state = candidateCIState(runs, jobs, sha, { workflow, afterId, branch, required })
      if (state === 'failed') throw new Error(`Gallery ${workflow} failed or omitted required jobs: ${latest.html_url}`)
      if (state === 'passed') {
        console.log(`Required ${workflow} passed for ${sha}: ${latest.html_url}`)
        return
      }
      await sleep(15000)
    }
    throw new Error(`Gallery ${workflow} did not finish within 30 minutes`)
  }))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await validateGalleryCandidate({
  repository: process.env.GITHUB_REPOSITORY, branch: process.env.CANDIDATE_BRANCH,
  sha: process.env.EXPECTED_SHA, token: process.env.GH_TOKEN,
})
