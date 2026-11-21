import fs from 'node:fs/promises'
import path from 'node:path'
import {gzipSync,gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {assertCatalog} from './catalog.mjs'
const sha=value=>createHash('sha256').update(value).digest('hex')
export async function writeSnapshot(data,root='data/readonly') {
  assertCatalog(data)
  await fs.mkdir(root,{recursive:true})
  const groups=new Map()
  for(const row of data.skills){const key=parseInt(sha(row.slug).slice(0,2),16)%128;const list=groups.get(key)||[];list.push(row);groups.set(key,list)}
  const files=[]
  for(const [id,rows] of [...groups].sort((a,b)=>a[0]-b[0])) {
    rows.sort((a,b)=>a.slug.localeCompare(b.slug))
    const file=`skills-${String(id).padStart(3,'0')}.json.gz`,body=Buffer.from(JSON.stringify(rows)),compressed=gzipSync(body,{level:9})
    await fs.writeFile(path.join(root,file),compressed)
    files.push({file,kind:'skills',rows:rows.length,sha256:sha(body),compressedBytes:compressed.length})
  }
  for(let offset=0;offset<data.posts.length;offset+=50) {
    const rows=data.posts.slice(offset,offset+50),file=`posts-${String(offset/50).padStart(3,'0')}.json.gz`
    const body=Buffer.from(JSON.stringify(rows)),compressed=gzipSync(body,{level:9})
    await fs.writeFile(path.join(root,file),compressed)
    files.push({file,kind:'posts',rows:rows.length,sha256:sha(body),compressedBytes:compressed.length})
  }
  const manifest={version:1,capturedAt:data.capturedAt,source:data.source,skills:data.skills.length,posts:data.posts.length,
    sourceUpdatedThrough:data.skills.reduce((max,row)=>row.updated_at>max?row.updated_at:max,''),files}
  await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
  return manifest
}
export async function loadSnapshot(root='data/readonly') {
  const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'))
  if(!Array.isArray(manifest.files)||manifest.files.length>160)throw new Error('Invalid snapshot manifest')
  const skills=[],posts=[]
  for(const file of manifest.files) {
    if(!/^(skills|posts)-\d{3}\.json\.gz$/.test(file.file)||!['skills','posts'].includes(file.kind))throw new Error('Unsafe snapshot file')
    const body=gunzipSync(await fs.readFile(path.join(root,file.file)),{maxOutputLength:20_000_000})
    if(sha(body)!==file.sha256)throw new Error('Snapshot integrity mismatch')
    const rows=JSON.parse(body)
    if(!Array.isArray(rows)||rows.length!==file.rows)throw new Error('Snapshot count mismatch')
    ;(file.kind==='skills'?skills:posts).push(...rows)
  }
  if(skills.length!==manifest.skills||posts.length!==manifest.posts)throw new Error('Snapshot total mismatch')
  return assertCatalog({version:1,capturedAt:manifest.capturedAt,source:manifest.source,skills,posts})
}
