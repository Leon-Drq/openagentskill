import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { sqliteD1 } from './fixtures/sqlite-d1.mjs'
import { createD1ReadFetch } from '../lib/db/cloudflare-read.ts'
import { readPublishedBlogPost, readPublishedBlogPosts, readPublishedBlogSitemap } from '../lib/blog/read.ts'

const { sqlite, database } = sqliteD1()
for (const name of ['0001_commerce','0002_auth','0003_business','0004_catalog']) sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${name}.sql`, import.meta.url), 'utf8'))
const client = transport => createClient('https://d1.internal', 'fixture', { auth:{persistSession:false,autoRefreshToken:false}, db:{retry:false}, global:{fetch:transport} })
const pub = client(createD1ReadFetch(database))
try {
  sqlite.exec(`INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved)
    VALUES ('visible','visible','Visible skill','Fixture','Author','https://example.invalid','fixture/visible','development','MIT',1),
    ('private','private','Private skill','Fixture','Author','https://example.invalid','fixture/private','development','MIT',0)`)
  const insert = sqlite.prepare('INSERT INTO blog_posts(slug,skill_id,title,summary,content,published_at) VALUES (?,?,?,?,?,?)')
  insert.run('restored-article','visible','Original title','Original summary','Original full content','2026-10-01T00:00:00Z')
  insert.run('private-reference','private','Published article','Summary','Independent public article','2026-10-02T00:00:00Z')
  insert.run('standalone',null,'Editorial article','Summary','No Skill relation','2026-10-03T00:00:00Z')
  assert.ok((await pub.from('blog_posts').select('slug,skills(slug)').eq('slug','restored-article').single()).error, 'Reproduce the unsupported legacy relation')
  const restored = await readPublishedBlogPost(pub,'restored-article')
  assert.equal(restored.content,'Original full content'); assert.equal(restored.skills.slug,'visible')
  assert.equal((await readPublishedBlogPost(pub,'private-reference')).skills,null, 'Do not expose unpublished related Skills')
  assert.equal((await readPublishedBlogPost(pub,'standalone')).content,'No Skill relation')
  assert.equal(await readPublishedBlogPost(pub,'not-a-post'),null)
  const summaries = await readPublishedBlogPosts(pub,2)
  assert.deepEqual(summaries.map(p=>p.slug),['standalone','private-reference'])
  assert.ok(summaries.every(p=>!('content' in p)), 'List pages do not transfer full articles')
  for(let i=0;i<1050;i++) insert.run(`archive-${i.toString().padStart(4,'0')}`,null,'Archive title','Summary','Preserved article','2026-09-01T00:00:00Z')
  const sitemap = await readPublishedBlogSitemap(pub)
  assert.equal(sitemap.length,1053); assert.equal(new Set(sitemap.map(p=>p.slug)).size,1053)
  assert.ok(sitemap.some(p=>p.slug==='standalone'), 'Read beyond D1/PostgREST default 1,000-row page')
  const outage = client(async()=>Response.json({code:'DB_UNAVAILABLE',message:'Unavailable'},{status:503}))
  await assert.rejects(readPublishedBlogPost(outage,'restored-article'),/temporarily unavailable/)
  await assert.rejects(readPublishedBlogSitemap(outage),/temporarily unavailable/)
  const referencesOutage = client(async(input,init)=>new URL(String(input)).pathname.endsWith('/skills')
    ? Response.json({code:'D1_OVERLOADED',message:'Unavailable'},{status:503})
    : createD1ReadFetch(database)(input,init))
  const duringReferenceOutage = await readPublishedBlogPost(referencesOutage,'restored-article')
  assert.equal(duringReferenceOutage.content,'Original full content', 'Optional cards cannot hide a published article')
  assert.equal(duringReferenceOutage.skills,null)
  const listDuringReferenceOutage = await readPublishedBlogPosts(referencesOutage,1000)
  assert.ok(listDuringReferenceOutage.length > 0)
  assert.ok(listDuringReferenceOutage.every(post=>post.skills===null), 'Failed references expose no unchecked Skill data')
  let reads=0
  const partial = client(async(input,init)=>++reads===1?createD1ReadFetch(database)(input,init):Response.json({message:'Unavailable'},{status:503}))
  await assert.rejects(readPublishedBlogSitemap(partial),/temporarily unavailable/, 'Never publish a partial sitemap on second-page failure')
  console.log('Blog recovery passed: D1 detail/list, original content, optional reference outage, null/private references, true missing vs outage, 1,053 sitemap rows and partial-read failure.')
} finally { sqlite.close() }
