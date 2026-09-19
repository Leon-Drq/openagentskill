const repository = process.env.GITHUB_REPOSITORY
const branch = process.env.CANDIDATE_BRANCH
const sha = process.env.EXPECTED_SHA
if (repository !== 'Leon-Drq/openagentskill' || !/^codex\/gallery-sync-\d+-\d+$/.test(branch || '') || !/^[a-f0-9]{40}$/.test(sha || '') || !process.env.GH_TOKEN) throw new Error('Invalid Gallery CI dispatch context')
const api = async (endpoint, options={}) => {
  const response = await fetch(`https://api.github.com/repos/${repository}/${endpoint}`,{
    ...options, redirect:'error',signal:AbortSignal.timeout(30000),
    headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},
  })
  if (!response.ok) throw new Error(`GitHub CI API returned ${response.status}`)
  return response.status === 204 ? null : response.json()
}
// Vercel's external GitHub App emits deployment_status after building the candidate.
// Unlike workflow_dispatch, this event produces checks eligible for branch protection.
for (let attempt=0;attempt<120;attempt++) {
  const result=await api(`actions/workflows/ci.yml/runs?event=deployment_status&head_sha=${sha}&per_page=50`)
  let run
  // Unrelated deployment events deliberately have different skipped check names.
  // Require all three real jobs on the exact SHA, never accept an all-skipped run.
  for (const candidate of result.workflow_runs.filter((item)=>item.head_sha===sha && item.status==='completed')) {
    const {jobs} = await api(`actions/runs/${candidate.id}/jobs?per_page=100`)
    if (['Lint and typecheck','Regression tests','Production build'].every((name)=>jobs.some((job)=>job.name===name))) {
      if (candidate.conclusion !== 'success' || jobs.some((job)=>['Lint and typecheck','Regression tests','Production build'].includes(job.name) && job.conclusion !== 'success')) throw new Error(`Gallery CI failed: ${candidate.html_url}`)
      run=candidate; break
    }
  }
  if (run) {
    if (run.conclusion!=='success') throw new Error(`Gallery CI failed: ${run.html_url} (${run.conclusion})`)
    console.log(`Required CI passed for ${sha}: ${run.html_url}`)
    process.exit(0)
  }
  await new Promise((resolve)=>setTimeout(resolve,15000))
}
throw new Error('Gallery candidate CI did not finish within 30 minutes')
