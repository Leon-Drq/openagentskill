// Read-only production/local smoke. No cache busting, credentials or mutations.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
const origin = process.env.BASE_URL || 'http://localhost:3100'
const results = []
async function read(path, headers) {
  let last
  for (let retry = 0; retry < 3; retry++) {
    try {
      const response = await fetch(new URL(path, origin), { headers, redirect:'manual', signal:AbortSignal.timeout(45_000) })
      return {response, html:await response.text()}
    } catch(error) { last = error }
  }
  throw last
}
function checkSeo(html, path, noindex) {
  assert.ok(html.includes(`rel="canonical" href="https://www.openagentskill.com${path}"`), path+': canonical')
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,path+': SSR heading')
  assert.doesNotMatch(html,/href="(?:https?:\/\/[^/]+)?\/(?:cached-public|render-query)\//)
  const robots=html.match(/<meta name="robots" content="([^"]*)"/)?.[1] || ''
  assert.equal(robots.includes('noindex'),noindex,path+': robots')
}
for (const [path, canonical, noindex] of [
  ['/skills','/skills',false], ['/skills?sort=new','/skills',true],
  ['/zh/skills?sort=fresh','/zh/skills',true], ['/skills?page=2','/skills',true],
  ['/skills?category=design-creative&sort=stars','/skills',true],
  ['/skills?examples=true','/skills',true], ['/skills?view=all','/skills',true],
  ['/zh/docs?lang=zh','/zh/docs',true],
  ['/alternatives/design-taste-frontend','/alternatives/design-taste-frontend',true],
]) {
  let hit=false
  for(let attempt=0;attempt<4;attempt++) {
    const {response,html}=await read(path)
    assert.equal(response.status,200,path)
    checkSeo(html,canonical,noindex)
    assert.doesNotMatch(response.headers.get('cache-control')||'',/private|no-store/,path+': public response')
    if (canonical.endsWith('/skills')) assert.ok((html.match(/<article\b[^>]*\bdata-directory-skill(?:[\s=>])/g)||[]).length>0,path+': server rendered cards')
    const cache=response.headers.get('x-vercel-cache')||response.headers.get('x-nextjs-cache')
    results.push({path,status:response.status,cache,bytes:Buffer.byteLength(html)})
    if(cache==='HIT'){hit=true;break}
    await new Promise(resolve=>setTimeout(resolve,1500))
  }
  assert.ok(hit,path+': actual HTML cache HIT')
  console.log(path+': cache/SSR/SEO passed')
}
for(const path of ['/skills?q=design','/zh/skills?category=design-creative&access=free']) {
  const {response,html}=await read(path)
  assert.equal(response.status,200,path)
  assert.match(response.headers.get('cache-control')||'',/private|no-store/)
  checkSeo(html,path.split('?')[0],true)
}
for(const path of ['/cached-public/en/directory/new~1~all~all','/cached-public/zh/core/docs','/skills?page=0','/skills?page=99999999']) {
  const {response}=await read(path)
  assert.equal(response.status,404,path)
}
// Next 16 redirects bare RSC requests to include its transport marker.
const rsc = await read('/skills?sort=new&_rsc',{'RSC':'1'})
assert.equal(rsc.response.status,200)
assert.match(rsc.response.headers.get('content-type')||'',/text\/x-component/)
assert.doesNotMatch(rsc.html,/<html\b/)
const html = await read('/skills?sort=new')
assert.match(html.response.headers.get('content-type')||'',/text\/html/)
checkSeo(html.html,'/skills',true)
if(process.env.REPORT_PATH)writeFileSync(process.env.REPORT_PATH,JSON.stringify({origin,at:new Date().toISOString(),results},null,2))
console.log('Browse cache smoke passed: finite variants HIT, dynamic search, SSR/SEO, RSC isolation and internal/invalid 404s.')
