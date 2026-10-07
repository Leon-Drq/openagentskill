import { pathToFileURL } from 'node:url'

const requiredJobs = ['Lint and typecheck', 'Regression tests', 'Production build']
const eligibleRuns = (runs, sha) => runs
  .filter((run) => run.head_sha === sha && run.event === 'deployment_status')
  .sort((a, b) => b.id - a.id)

export function candidateCIState(runs, jobs, sha) {
  const latest = eligibleRuns(runs, sha)[0]
  if (!latest || latest.status !== 'completed' || latest.conclusion === 'cancelled') return 'waiting'
  if (latest.conclusion !== 'success') return 'failed'
  return requiredJobs.every((name) => jobs.some((job) => job.name === name && job.conclusion === 'success'))
    ? 'passed' : 'failed'
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY
  const branch = process.env.CANDIDATE_BRANCH
  const sha = process.env.EXPECTED_SHA
  if (repository !== 'Leon-Drq/openagentskill' || !/^codex\/gallery-sync-\d+-\d+$/.test(branch || '') || !/^[a-f0-9]{40}$/.test(sha || '') || !process.env.GH_TOKEN) throw new Error('Invalid Gallery CI context')
  const api = async (endpoint) => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${endpoint}`, {
      redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) throw new Error(`GitHub CI API returned ${response.status}`)
    return response.json()
  }
  // An external Vercel event produces eligible branch-protection checks. Always
  // inspect the newest run, including all real jobs, rather than any old success.
  for (let attempt = 0; attempt < 120; attempt++) {
    const {workflow_runs: runs} = await api(`actions/workflows/ci.yml/runs?event=deployment_status&head_sha=${sha}&per_page=50`)
    const latest = eligibleRuns(runs, sha)[0]
    const {jobs} = latest?.status === 'completed' ? await api(`actions/runs/${latest.id}/jobs?per_page=100`) : {jobs: []}
    const state = candidateCIState(runs, jobs, sha)
    if (state === 'failed') throw new Error(`Gallery CI failed or omitted required jobs: ${latest.html_url}`)
    if (state === 'passed') {
      console.log(`Required CI passed for ${sha}: ${latest.html_url}`)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 15000))
  }
  throw new Error('Gallery candidate CI did not finish within 30 minutes')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
