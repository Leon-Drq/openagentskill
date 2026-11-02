import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { rehearseExport } from './rehearse-cloudflare-export.mjs'

function fixture(directory, missingParent=false) {
  mkdirSync(join(directory,'raw'))
  const write=(name,value)=>writeFileSync(join(directory,name),JSON.stringify(value))
  const input={
    users: {cols:['id','payload'],rows:[['9007199254740993','中文\n"quoted"\u0000'],['2',null]]},
    orders:{cols:['id','user_id','amount'],rows:[['order-1',missingParent?'missing':'9007199254740993','9999999999999999.99']]},
  }
  const tables=[],columns=[],verification=[]
  for (const [name,{cols,rows}] of Object.entries(input)) {
    tables.push({schema:'public',name,rows:rows.length,chunk:1,done:true})
    columns.push(...cols.map((column_name,i)=>({schema:'public',name,column_name,position:i+1,not_null:i===0})))
    const body=rows.map(JSON.stringify).join('\n')+'\n'
    const sum=rows.reduce((n,r)=>n+BigInt.asIntN(64,BigInt(`0x${createHash('md5').update(JSON.stringify(r)).digest('hex').slice(0,16)}`)),0n).toString()
    verification.push({schema:'public',name,row_count:String(rows.length),row_hash_sum:sum})
    const file=`raw/public.${name}.00000.jsonl`
    writeFileSync(join(directory,file),body)
    write(`${file}.meta.json`,{row_count:rows.length,raw_bytes:Buffer.byteLength(body),row_hash_sum:sum,sha256:createHash('sha256').update(body).digest('hex')})
  }
  write('catalog-columns.json',columns)
  write('catalog-tables.json',tables)
  write('export-manifest.json',{project:'rtuodkczrlkxwwtaxwrr',tables,verification})
  write('catalog-constraints.json',[
    ...tables.map(t=>({schema:'public',table_name:t.name,kind:'p',columns:['id'],definition:'PRIMARY KEY (id)'})),
    {schema:'public',table_name:'orders',kind:'f',columns:['user_id'],ref_schema:'public',ref_table:'users',ref_columns:['id']},
  ])
  return input
}

for (const missingParent of [false,true]) test(`SQLite rehearsal preserves exact values and audits relationships (orphan=${missingParent})`,async()=>{
  const directory=mkdtempSync(join(tmpdir(),'openagentskill-rehearsal-'))
  try {
    const data=fixture(directory,missingParent)
    const target=join(directory,'rehearsal.sqlite')
    const report=await rehearseExport(directory,target)
    assert.equal(report.totalRows,3)
    assert.equal(report.integrity,'ok')
    assert.equal(report.foreignKeyViolations.length,missingParent?1:0)
    assert.ok(!JSON.stringify(report).includes('order-1'))
    const db=new DatabaseSync(target,{readOnly:true})
    try {
      assert.deepEqual(db.prepare('SELECT id,payload FROM public__users ORDER BY rowid').all().map(r=>[r.id,r.payload]),data.users.rows)
      assert.equal(db.prepare('SELECT amount FROM public__orders').get().amount,'9999999999999999.99')
    } finally { db.close() }
    await assert.rejects(rehearseExport(directory,target),/EEXIST/)
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep))
    rmSync(directory,{recursive:true})
  }
})
