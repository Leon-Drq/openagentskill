import fs from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {spawn,execFileSync} from 'node:child_process'
import assert from 'node:assert/strict'
const config=JSON.parse(await fs.readFile('wrangler.production.jsonc','utf8'))
const dedicated=JSON.parse(await fs.readFile('wrangler.readonly.jsonc','utf8'))
assert.deepEqual(config,dedicated,'Automatic production deploy must use the reviewed read-only configuration')
const report=JSON.parse(await fs.readFile('.readonly-build/report.json','utf8'))
const status=JSON.parse(await fs.readFile('.readonly/reader/status.json','utf8'))
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
assert.equal(report.sample,false,'Sample builds cannot be deployed')
assert.equal(report.sourceCommit,commit,'Rebuild after changing the source commit')
assert.equal(status.sourceCommit,commit)
assert.equal(status.skills,report.skills)
assert.ok(report.files<100000&&report.skills>0)
assert.equal(createHash('sha256').update(await fs.readFile('data/readonly/manifest.json')).digest('hex'),report.snapshotManifestHash,'Rebuild after refreshing the catalog')
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.production.jsonc',...process.argv.slice(2)],{
  stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',OPEN_NEXT_DEPLOY:'true'},
})
child.on('error',error=>{console.error(error.message);process.exitCode=1})
child.on('exit',code=>{process.exitCode=code??1})
