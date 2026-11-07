import assert from 'node:assert/strict'
import { compileRead } from '../../lib/db/cloudflare-read.ts'

// Run the same equivalence and query-plan checks in SQLite and native D1.
export async function checkSearchCost(db) {
  const run = async (sql, params = []) => (await db.prepare(sql).bind(...params).all()).results
  const names = ['PPT Master','PowerPoint ppt','NanoCoder','NANOCODER extension','文档处理助手','文档',
    'a_% special','quote " skill','café worker','CAFÉ worker','emoji 🚀 rocket','back\\slash','ab','prefix suffix',
    'private ppt master','owner ppt master']
  for (let i=0;i<names.length;i++) await run(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved,listing_status)
    VALUES (?,?,?,'fixture','Fixture','https://example.invalid',?,'development','MIT',?,?)`,
    [`cost-${i}`,`cost-${i}`,names[i],`fixture/cost-${i}`,i<14?1:0,i===15?'owner_published':'reviewed'])
  const patterns=['ppt%','%ppt%','nano%','%coder','%文档处理%','%文档%','a\\_\\%%','%"%','%café%','%CAFÉ%',
    '%🚀 rocket%','%back\\\\slash%','a_','%ab%','prefix%suffix','%no-such-name%','%OR 1=1 --%', 'ppt%_']
  let indexed=0
  for (const pattern of patterns) {
    const url=new URL('https://d1.internal/rest/v1/skills')
    for(const [key,value] of Object.entries({select:'slug,name',name:`ilike.${pattern}`,order:'name.asc,slug.asc',limit:'24',offset:'0'}))url.searchParams.set(key,value)
    const plan=compileRead({url,method:'GET',headers:new Headers({prefer:'count=exact'})})
    const where="(t.ai_review_approved=1 OR t.listing_status IN ('owner_published','static_checked')) AND t.name LIKE ? ESCAPE '\\'"
    const expected=await run(`SELECT t.slug,t.name FROM skills t WHERE ${where} ORDER BY t.name ASC NULLS LAST,t.slug ASC NULLS LAST LIMIT 24`,[pattern])
    assert.deepEqual(await run(plan.sql,plan.params),expected,pattern)
    assert.deepEqual(await run(plan.countSql,plan.params),await run(`SELECT count(*) AS count FROM skills t WHERE ${where}`,[pattern]),`count ${pattern}`)
    if(plan.sql.includes('skills_name_fts')) {
      const explanation=await run('EXPLAIN QUERY PLAN '+plan.sql,plan.params)
      assert.ok(explanation.some(row=>/SEARCH t USING INTEGER PRIMARY KEY/.test(row.detail)),JSON.stringify(explanation))
      assert.ok(!explanation.some(row=>/^SCAN t(?: |$)/.test(row.detail)),JSON.stringify(explanation))
      indexed++
    }
  }
  // Negation and OR must retain rows that do not match the positive candidate.
  for(const query of ['name=not.ilike.%ppt%','or=(name.ilike.%ppt%,slug.eq.cost-2)']) {
    const plan=compileRead({url:new URL(`https://d1.internal/rest/v1/skills?select=slug&${query}`),method:'GET',headers:new Headers()})
    assert.ok(!plan.sql.includes('skills_name_fts'))
    assert.ok((await run(plan.sql,plan.params)).some(row=>row.slug==='cost-2'))
  }
  assert.ok(indexed>=10)
  const indexSnapshot=async()=>JSON.stringify(await run('SELECT id,hex(block) AS block FROM skills_fts_data ORDER BY id'))
  const before=await indexSnapshot()
  await run("UPDATE skills SET site_downloads=site_downloads+1,quality_score=50 WHERE id='cost-2'")
  await run("UPDATE skills SET name=name,description=description WHERE id='cost-2'")
  assert.equal(await indexSnapshot(),before,'Counters and unchanged ingestion must not rewrite FTS')
  await run("UPDATE skills SET name='uniquecostrenamed',description='uniquecostdescription' WHERE id='cost-2'")
  assert.equal((await run("SELECT rowid FROM skills_name_fts WHERE skills_name_fts MATCH 'uniquecostrenamed'")).length,1)
  assert.equal((await run("SELECT rowid FROM skills_fts WHERE skills_fts MATCH 'uniquecostdescription'")).length,1)
  await run("DELETE FROM skills WHERE id LIKE 'cost-%'")
  assert.equal((await run("SELECT rowid FROM skills_name_fts WHERE skills_name_fts MATCH 'uniquecostrenamed'")).length,0)
  assert.equal((await run("SELECT rowid FROM skills_fts WHERE skills_fts MATCH 'uniquecostdescription'")).length,0)
  // External-content integrity checks include the live content table.
  await run("INSERT INTO skills_name_fts(skills_name_fts,rank) VALUES ('integrity-check',1)")
  await run("INSERT INTO skills_fts(skills_fts,rank) VALUES ('integrity-check',1)")
  return {patterns:patterns.length,indexed,resultsEquivalent:true,writeAmplificationRemoved:true}
}
