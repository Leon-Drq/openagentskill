import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Run against a LOCAL production build only. Browser requests to the submission
// APIs are fulfilled in memory: no real submission, model call or X post.
const base = process.env.SUBMISSION_TEST_URL || 'http://127.0.0.1:3123'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Never run this fixture against production')
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const browser = await chromium.launch({ headless: true })
const output = '.codex-tmp/submission-qa'
mkdirSync(output, { recursive: true })
const errors = []
const accepted = new Map(), submitCalls = [], validations = []
let mode = 'pending', partialFailure = false
const candidates = Array.from({length:12}, (_,i)=>({ name: `Fixture Skill ${i+1}`, description: 'A sample writing skill for browser-only verification.', path: `skills/example-${i+1}/SKILL.md`, ref: 'a'.repeat(40), sourceUrl: 'https://github.com/fixture/skills' }))
const context = await browser.newContext({ viewport: {width:1280,height:900} })
await context.route('**/*', async route => {
  const req = route.request(), url = new URL(req.url())
  if (url.origin !== base) return route.abort()
  const json = (value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)})
  if (url.pathname === '/api/skills/validate') {
    const body=req.postDataJSON(); validations.push(body)
    const start=body.offset||0, list=body.query ? candidates.filter(x=>x.path.includes(body.query)) : candidates
    return json({valid:true,skills:list.slice(start,start+10),hasMore:start+10<list.length,nextOffset:Math.min(start+10,list.length),totalPaths:list.length})
  }
  if (url.pathname === '/api/skills/submit') {
    const body=req.postDataJSON(); submitCalls.push(body)
    if (partialFailure && body.skillPath === candidates[1].path) return json({code:'SUBMISSION_FAILED'},503)
    if (!accepted.has(body.receiptToken)) {
      const hash=createHash('sha256').update(body.receiptToken).digest('hex')
      const id=`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`
      const skill=candidates.find(x=>x.path===body.skillPath)
      accepted.set(body.receiptToken,{id,token:body.receiptToken,status:mode==='quarantined'?'quarantined':'submitted',statusUrl:`/api/skills/submissions/${id}`,skill})
    }
    return json({success:true,accepted:true,submission:accepted.get(body.receiptToken)},202)
  }
  if (url.pathname.startsWith('/api/skills/submissions/')) {
    assert.equal(url.search, '', 'UI must not put private tokens in query strings')
    const token=req.headers().authorization?.replace('Bearer ','')
    const receipt=accepted.get(token)
    if (!receipt || !url.pathname.endsWith(receipt.id)) return json({error:'Not found'},404)
    return json({submission:{...receipt,token:undefined,status:mode==='published'?'reviewed':mode==='manual'?'listed':mode==='quarantined'?'quarantined':'processing',skill:{...receipt.skill,slug:mode==='published'?'fixture-skill':null},review:{method:mode==='published'?'static':'manual',issues:[],suggestions:[]},queue:{attempts:1,stalled:mode==='delayed'}}})
  }
  // Avoid unrelated first-party analytics, auth and live database APIs.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return json({})
  return route.continue()
})
const page = await context.newPage()
page.on('pageerror', error=>errors.push(error.message))
try {
  await page.goto(`${base}/submit?lang=en`)
  await page.getByLabel('GitHub repository or SKILL.md URL',{exact:true}).waitFor()
  assert.equal(await page.locator('h1').count(),1)
  await page.getByLabel('GitHub repository or SKILL.md URL',{exact:true}).fill('https://github.com/fixture/skills')
  await page.getByRole('button',{name:'Find Skills',exact:true}).first().click()
  await page.getByRole('checkbox').first().waitFor()
  assert.equal(await page.getByRole('checkbox').count(),10)
  await page.getByRole('button',{name:'Load more paths'}).click()
  await page.getByRole('checkbox').nth(11).waitFor()
  assert.equal(validations[1].offset,10)
  // Filling a filter without applying it must not corrupt pagination requests.
  await page.getByText('Optional details',{exact:true}).click()
  assert.equal(await page.locator('#makerGithub').inputValue(),'','Repository owner must not be auto-assigned as submitter')
  await page.locator('#makerGithub').fill('https://evil.com/not-a-github-user')
  await page.getByRole('button',{name:'Submit to community queue'}).click()
  await page.locator('#makerGithub-error').waitFor()
  assert.equal(submitCalls.length,0)
  await page.locator('#makerGithub').fill('https://github.com/curator')
  await page.locator('#makerX').fill('https://x.com/curator')
  await page.locator('#tags').fill('writing')
  await page.getByRole('button',{name:'Submit to community queue'}).click()
  const dialog=page.getByRole('dialog')
  await dialog.waitFor()
  assert.match(await dialog.innerText(),/Your skill is submitted/)
  assert.match(await dialog.innerText(),/not publication/)
  assert.equal(submitCalls[0].makerGithub,'curator')
  assert.deepEqual(submitCalls[0].tags,['writing'],'Uncommitted tag input must not be lost')
  const shareHref=await dialog.getByRole('link',{name:'Share on X'}).getAttribute('href')
  const intent=new URL(shareHref)
  assert.equal(intent.origin,'https://x.com')
  assert.equal(intent.searchParams.get('url'),'https://www.openagentskill.com/submit')
  for(const receipt of accepted.values()) assert.ok(!decodeURIComponent(shareHref).includes(receipt.token))
  await page.screenshot({path:`${output}/success-desktop.png`,animations:'disabled'})
  await page.setViewportSize({width:390,height:844})
  assert.ok(await dialog.isVisible())
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.screenshot({path:`${output}/success-mobile.png`,animations:'disabled'})
  await page.keyboard.press('Escape')
  await dialog.waitFor({state:'hidden'})
  await page.reload()
  await page.getByRole('heading',{name:'Your skill is submitted.'}).waitFor()
  assert.equal(await page.getByRole('dialog').count(),0,'Reload restores receipt without celebrating again')
  assert.equal(await page.locator('#repository').count(),0)
  mode='published'
  await page.getByRole('button',{name:'Refresh status'}).click()
  await page.getByRole('heading',{name:'Your skill is now public.'}).waitFor()
  assert.match(await page.getByRole('link',{name:'Share on X'}).getAttribute('href'),/fixture-skill/)
  await page.getByText('Static checks passed · Not AI reviewed',{exact:true}).waitFor()
  mode='manual'
  await page.getByRole('button',{name:'Refresh status'}).click()
  await page.getByRole('heading',{name:'Human review needed'}).waitFor()
  assert.equal(await page.getByRole('link',{name:'View skill',exact:true}).count(),0)
  mode='delayed'
  await page.getByRole('button',{name:'Refresh status'}).click()
  await page.getByText(/Processing is taking longer/).waitFor()

  // Partial batch: accepted receipts survive and retries reuse each item's token.
  mode='pending'; partialFailure=true
  await page.setViewportSize({width:1280,height:900})
  await page.getByRole('button',{name:'Submit another',exact:true}).click()
  await page.locator('#repository').fill('https://github.com/fixture/skills')
  await page.getByRole('button',{name:'Find Skills',exact:true}).first().click()
  await page.getByRole('checkbox').nth(1).check()
  await page.getByRole('button',{name:'Submit to community queue'}).click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('alert').first().waitFor()
  const batchFirst=submitCalls.at(-2), batchSecond=submitCalls.at(-1)
  partialFailure=false
  await page.getByRole('button',{name:'Submit to community queue'}).click()
  await page.getByRole('dialog').waitFor()
  assert.equal(submitCalls.at(-2).receiptToken,batchFirst.receiptToken)
  assert.equal(submitCalls.at(-1).receiptToken,batchSecond.receiptToken)
  await page.keyboard.press('Escape')

  // Private link on a new tab is captured before third-party scripts and removed
  // from the URL. The status request still authenticates successfully.
  const receipt=[...accepted.values()][0]
  const tracking=await context.newPage()
  await tracking.goto(`${base}/submit?lang=zh#receipt=${receipt.id}.${receipt.token}`)
  await tracking.getByRole('heading',{name:'恭喜，Skill 已提交！'}).waitFor()
  assert.equal(new URL(tracking.url()).hash,'')
  assert.equal(await tracking.getByRole('dialog').count(),0)
  await tracking.close()
  mode='quarantined'
  await page.getByRole('button',{name:'Refresh status'}).click()
  await page.getByRole('heading',{name:'Quarantined and not public'}).waitFor()
  assert.equal(await page.getByRole('link',{name:'Share on X'}).count(),0)
  assert.equal(await page.locator('[data-nextjs-dialog]').count(),0)
  assert.deepEqual(errors,[])
  console.log('Browser submission QA passed: desktop/mobile, validation, batching, idempotent retries, honest modal, public/private share separation, refresh recovery, static/manual/delayed/quarantined states, localized tracking and no page errors. No production submissions or X posts.')
} finally { await browser.close() }
