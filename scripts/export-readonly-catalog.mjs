// Explicit owner-operated, read-only export. This file is never bundled into the site.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {publicRow,skillExportQuery,assertCatalog,PUBLICATION_SQL} from '../lib/readonly/catalog.mjs'
import {isMcpOnlySkillRecord} from '../lib/skills/registry-scope.ts'
import {writeSnapshot} from '../lib/readonly/snapshot.mjs'

if(!process.argv.includes('--remote')) throw new Error('Use --remote for an explicit authorized public-data export; no automatic refresh is configured.')
const config=JSON.parse(await fs.readFile('wrangler.active.jsonc','utf8'))
const database=config.d1_databases.find(item=>item.binding==='APP_DB').database_id
const account=config.account_id
const wrangler=path.resolve('node_modules/wrangler/bin/wrangler.js')
const credentialFile=process.platform==='win32'
  ? path.join(process.env.APPDATA,'xdg.config/.wrangler/config/default.toml')
  : path.join(process.env.XDG_CONFIG_HOME||path.join(os.homedir(),'.config'),'.wrangler/config/default.toml')
async function credentials() {
  if(process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN
  const text=await fs.readFile(credentialFile,'utf8')
  const token=text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1]
  if(!token)throw new Error('Cloudflare CLI login or API token is required')
  return token
}
let token=await credentials()
async function query(sql,params=[]) {
  for(let attempt=0;attempt<3;attempt++) {
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(60000),
    })
    if(response.status===401 && !process.env.CLOUDFLARE_API_TOKEN && attempt<2) {
      await promisify(execFile)(process.execPath,[wrangler,'whoami'],{env:{...process.env,WRANGLER_SEND_METRICS:'false'}})
      token=await credentials();continue
    }
    if([429,502,503,504].includes(response.status)&&attempt<2){await response.body?.cancel();await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));continue}
    const data=await response.json()
    if(!response.ok||data.success===false||!data.result?.[0]?.success)throw new Error(`Read-only export failed: HTTP ${response.status}`)
    return data.result[0].results
  }
  throw new Error('Public export retry budget exhausted')
}
const capturedAt=new Date().toISOString(),skills=[]
let cursor=0
for(;;) {
  const batch=await query(skillExportQuery(),[cursor])
  if(!batch.length)break
  for(const raw of batch) {
    if(!Number.isSafeInteger(raw.export_cursor)||raw.export_cursor<=cursor)throw new Error('Invalid export cursor')
    cursor=raw.export_cursor
    const row=publicRow(raw)
    if(row&&!isMcpOnlySkillRecord(row))skills.push(row)
  }
  if(skills.length>50000)throw new Error('Static asset budget exceeded; split the catalog before exporting more')
  console.log(`Public skills exported: ${skills.length}`)
}
const posts=[]
for(let offset=0;offset<500;offset+=50) {
  const batch=await query(`SELECT slug,title,summary,substr(content,1,128000) content,published_at,updated_at,
    length(content)>128000 truncated FROM blog_posts b WHERE published_at IS NOT NULL AND published_at<=?
    AND (skill_id IS NULL OR EXISTS(SELECT 1 FROM skills t WHERE t.id=b.skill_id AND ${PUBLICATION_SQL}))
    ORDER BY published_at DESC,slug LIMIT 50 OFFSET ?`,[capturedAt,offset])
  posts.push(...batch);if(batch.length<50)break
}
const data=assertCatalog({version:1,capturedAt,source:'cloudflare-d1-public-export',skills,posts})
const manifest=await writeSnapshot(data)
console.log(JSON.stringify({capturedAt,skills:skills.length,posts:posts.length,files:manifest.files.length,
  compressedBytes:manifest.files.reduce((sum,file)=>sum+file.compressedBytes,0)}))
