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
// workflow_dispatch deliberately triggers CI even when this candidate was pushed
// with GITHUB_TOKEN. Ordinary push events from that token do not start workflows.
await api('actions/workflows/ci.yml/dispatches',{method:'POST',body:JSON.stringify({ref:branch})})
for (let attempt=0;attempt<120;attempt++) {
  const result=await api(`actions/workflows/ci.yml/runs?branch=${encodeURIComponent(branch)}&event=workflow_dispatch&per_page=10`)
  const run=result.workflow_runs.find((item)=>item.head_sha===sha)
  if (run?.status==='completed') {
    if (run.conclusion!=='success') throw new Error(`Gallery CI failed: ${run.html_url} (${run.conclusion})`)
    console.log(`Required CI passed for ${sha}: ${run.html_url}`)
    process.exit(0)
  }
  await new Promise((resolve)=>setTimeout(resolve,15000))
}
throw new Error('Gallery candidate CI did not finish within 30 minutes')
