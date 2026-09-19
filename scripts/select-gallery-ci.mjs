import { readFile, appendFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export async function selectGalleryCI(eventName, event, branchesForSha) {
  if (eventName !== 'deployment_status') return true
  if (event.sender?.login !== 'vercel[bot]' || event.deployment_status?.state !== 'success'
    || event.deployment?.environment !== 'Preview – openagentskill'
    || !/^[a-f0-9]{40}$/.test(event.deployment?.sha || '')) return false
  const branches = await branchesForSha(event.deployment.sha)
  return branches.some((branch) => /^codex\/gallery-sync-\d+-\d+$/.test(branch.name))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))
  const selected = await selectGalleryCI(process.env.GITHUB_EVENT_NAME,event,async(sha)=> {
    if (process.env.GITHUB_REPOSITORY !== 'Leon-Drq/openagentskill') throw new Error('Unexpected repository')
    const response = await fetch(`https://api.github.com/repos/Leon-Drq/openagentskill/commits/${sha}/branches-where-head`,{
      redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'},
    })
    if (!response.ok) throw new Error(`Candidate lookup failed: ${response.status}`)
    return response.json()
  })
  await appendFile(process.env.GITHUB_OUTPUT,`selected=${selected}\n`)
}
