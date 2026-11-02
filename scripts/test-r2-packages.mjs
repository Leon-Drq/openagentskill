import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createR2PackageStorage } from '../lib/payments/r2-packages.ts'
import { issueDownloadGrant, verifyDownloadGrant } from '../lib/payments/download-grant.ts'

const bytes = new TextEncoder().encode('private instructions')
const release = { id:'release-1', skill_slug:'test-skill', version:'1.0.0',
  sha256:createHash('sha256').update(bytes).digest('hex'), size_bytes:bytes.length,
  delivery_kind:'skill-instructions', withdrawn:false, released_at:'2026-01-01T00:00:00Z' }
release.object_path=`${release.skill_slug}/${release.version}/${release.sha256}.txt`
let calls=0, mode='ok', cancelled=0
const storage=createR2PackageStorage(async()=>({
  head: async()=>{calls++;return mode==='missing'?null:{size:bytes.length}},
  get: async()=>{ calls++; if(mode==='missing')return null; return {
    size:mode==='wrong-size'?bytes.length+1:bytes.length,
    body:new ReadableStream({start(controller){
      if(mode==='overflow'){controller.enqueue(new Uint8Array(bytes.length+1));return}
      controller.enqueue(mode==='corrupt'?new Uint8Array(bytes.length):mode==='truncated'?bytes.slice(1):bytes)
      controller.close()
    },cancel(){cancelled++}}),
  } },
}))
await storage.verify(release)
assert.deepEqual(await storage.read(release),bytes)
const before=calls
for(const patch of [{object_path:'../secret'},{withdrawn:true},{size_bytes:21*1024*1024}]) {
  await assert.rejects(storage.read({...release,...patch}))
  await assert.rejects(storage.verify({...release,...patch}))
}
assert.equal(calls,before,'invalid release paths are rejected before bucket access')
for(mode of ['missing','wrong-size','overflow','corrupt','truncated']) await assert.rejects(storage.read(release))
assert.equal(cancelled,2,'bad size and overflowing streams are cancelled')
const now=Date.now(), secret='unit-test-download-key-at-least-32-bytes'
const token=issueDownloadGrant(release,'buyer-a',secret,now)
assert.equal(verifyDownloadGrant(token,'buyer-a',secret,now).id,release.id)
assert.equal(verifyDownloadGrant(token,'buyer-b',secret,now),null)
assert.equal(verifyDownloadGrant(token,'buyer-a','different-unit-test-key-at-least-32-bytes',now),null)
assert.equal(verifyDownloadGrant(token,'buyer-a',secret,now+60_000),null)
assert.equal(verifyDownloadGrant(token,'buyer-a',secret,now-61_000),null)
assert.equal(verifyDownloadGrant(token.replace(/^./,token[0]==='e'?'f':'e'),'buyer-a',secret,now),null)
assert.equal(verifyDownloadGrant('invalid','buyer-a',secret,now),null)
assert.throws(()=>issueDownloadGrant(release,'buyer-a','short',now))
assert.throws(()=>issueDownloadGrant({...release,withdrawn:true},'buyer-a',secret,now))
console.log('R2 packages: private release paths, bounded streams, full checksums, buyer-bound grants, tampering and expiry passed.')
