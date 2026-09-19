import { readFile } from 'node:fs/promises'
const expected = process.env.EXPECTED_SHA
if (!/^[a-f0-9]{40}$/.test(expected || '')) throw new Error('EXPECTED_SHA must be a full tested commit SHA')
const entries = JSON.parse(await readFile(new URL('../lib/showcase-auto.json',import.meta.url),'utf8'))
const expectedStatus = JSON.parse(await readFile(new URL('../lib/showcase-sync.json',import.meta.url),'utf8'))
const base = 'https://www.openagentskill.com'
for (let attempt=0; attempt<60; attempt++) {
  try {
    const response = await fetch(`${base}/api/showcase/sync-status?check=${Date.now()}`,{signal:AbortSignal.timeout(15000),redirect:'error'})
    const status = response.ok ? await response.json() : null
    if (status?.commit === expected && status.checkedAt === expectedStatus.checkedAt && status.cases === 101+entries.length) {
      for (const url of ['/showcase',...entries.slice(-1).flatMap((entry)=>[`/showcase/${entry.slug}`,entry.media.src.replace(/\.[^.]+$/,'.card.webp')])]) {
        const check = await fetch(`${base}${url}`,{signal:AbortSignal.timeout(15000),redirect:'error'})
        if (!check.ok) throw new Error(`Production check failed: ${url} (${check.status})`)
        await check.body?.cancel()
      }
      console.log(`Gallery production verified: ${expected}, ${status.cases} cases`)
      process.exit(0)
    }
  } catch (error) { console.log(`Deployment not ready: ${error.message}`) }
  await new Promise((resolve)=>setTimeout(resolve,15000))
}
throw new Error('Production did not serve the tested Gallery commit within 15 minutes; inspect the Vercel deployment before retrying')
