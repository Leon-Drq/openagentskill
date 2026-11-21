import fs from 'node:fs/promises'
import path from 'node:path'
import {createRequire} from 'node:module'
import {createHash,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {loadSnapshot} from '../lib/readonly/snapshot.mjs'
import {searchable} from '../lib/readonly/search.mjs'

const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler'))
const {build}=wranglerRequire('esbuild')
const sha=value=>createHash('sha256').update(value).digest('hex')
const workspace=await fs.realpath(process.cwd()),buildRoot=path.resolve('.readonly-build'),publishedRoot=path.resolve('.readonly')
for(const target of [buildRoot,publishedRoot])if(!target.startsWith(workspace+path.sep))throw new Error('Output must stay inside this worktree')
await fs.mkdir(buildRoot,{recursive:true})
if((await fs.realpath(buildRoot))!==buildRoot)throw new Error('Build output must not be a junction or symlink')
const root=path.join(buildRoot,'site-'+randomUUID())
await fs.mkdir(root,{recursive:true})
await fs.mkdir(path.join(root,'reader'),{recursive:true})
// Build a new tree each time: withdrawn records must never survive an update.
await build({entryPoints:['scripts/readonly/render.tsx'],outfile:path.join(buildRoot,'render.cjs'),bundle:true,platform:'node',format:'cjs',target:'node22',
  loader:{'.css':'local-css'},logLevel:'warning',plugins:[{name:'offline-only',setup(api){api.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));api.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:''}))}}]})
const render=require(path.join(buildRoot,'render.cjs')),complete=await loadSnapshot(),sample=process.argv.includes('--sample')
const catalog=sample?{...complete,skills:complete.skills.slice(0,48),posts:complete.posts.slice(0,3)}:complete
render.setPublicSkills(catalog.skills)
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
const palette=(await fs.readFile('app/globals.css','utf8')).match(/:root\s*\{[\s\S]*?\}/)?.[0]
if(!palette)throw new Error('Shared site palette is missing')
const css=(palette+'\n'+await fs.readFile(path.join(buildRoot,'render.css'),'utf8')+'\n'+await fs.readFile('components/readonly/reader.css','utf8')).replaceAll('\r\n','\n')
const cssPath=`/reader/site.${sha(css).slice(0,12)}.css`
await fs.writeFile(path.join(root,cssPath),css)
const client=await build({entryPoints:['components/readonly/reader-client.mjs'],bundle:true,platform:'browser',target:'es2020',minify:true,write:false,logLevel:'warning'})
const js=client.outputFiles[0].contents,jsPath=`/reader/reader.${sha(js).slice(0,12)}.js`
await fs.writeFile(path.join(root,jsPath),js)
const assets={css:cssPath,js:jsPath}
const ordered=catalog.skills.map(render.browseRow).sort((a,b)=>(b.quality||0)-(a.quality||0)||a.slug.localeCompare(b.slug))
const browseBySlug=new Map(ordered.map(row=>[row.slug,row]))
const indexBuckets=Array.from({length:32},()=>[])
for(const row of ordered)indexBuckets[parseInt(sha(row.slug).slice(0,2),16)%32].push({...row,search:searchable(row)})
const searchFiles=[]
await fs.mkdir(path.join(root,'reader/index'),{recursive:true})
for(const rows of indexBuckets) {
  const data=JSON.stringify(rows),file=`/reader/index/${sha(data).slice(0,20)}.json`
  if(Buffer.byteLength(data)>25*1024*1024)throw new Error('Search shard exceeds static asset size limit')
  await fs.writeFile(path.join(root,file),data);searchFiles.push(file)
}
const taxonomy=require(path.join(buildRoot,'render.cjs'))
// Labels come from the shared taxonomy through the renderer.
const categories=Object.fromEntries([...new Set(ordered.map(row=>row.category))].map(key=>[key,{en:taxonomy.categoryName(key,'en'),zh:taxonomy.categoryName(key,'zh')}]))
const searchManifest=JSON.stringify({version:1,count:ordered.length,capturedAt:catalog.capturedAt,categories,shards:searchFiles})
const searchManifestPath=`/reader/search.${sha(searchManifest).slice(0,12)}.json`
await fs.writeFile(path.join(root,searchManifestPath),searchManifest)
const sitemap=[];let pages=0
async function writePage(locale,route,title,description,body,{lastModified=catalog.capturedAt,jsonld,noindex=false,alternates=true,contentLanguage,languageAlternates}={}) {
  const publicPath=render.href(locale,route),file=publicPath==='/'?'index.html':`${publicPath.slice(1)}.html`
  if(!/^[a-zA-Z0-9_./-]+$/.test(file)||file.includes('..'))throw new Error('Unsafe static page path')
  const output=path.join(root,file)
  await fs.mkdir(path.dirname(output),{recursive:true})
  await fs.writeFile(output,render.documentPage({locale,path:route,title,description,body,capturedAt:catalog.capturedAt,assets,jsonld,noindex,alternates,contentLanguage,languageAlternates}))
  if(!noindex)sitemap.push({path:publicPath,modified:lastModified})
  pages++
}
const posts=render.publicPosts(catalog),ranked=render.rankProjects(ordered,'stars')
for(const locale of render.languages) {
  const zh=locale==='zh'
  await writePage(locale,'/',zh?'发现适合你的 Agent Skill':'Discover reusable agent skills',zh?'浏览公开技能、分类、案例与安装说明。':'Browse public agent skills, categories, examples and installation instructions.',render.homeBody(locale,ordered,ranked))
  const totalPages=Math.ceil(ordered.length/render.pageSize)
  for(let page=1;page<=totalPages;page++)await writePage(locale,page===1?'/skills':`/skills/page/${page}`,`${zh?'全部 Agent Skill':'All agent skills'}${page>1?' · '+page:''}`,zh?'搜索和筛选完整公开目录，查看技能来源与安装说明。':'Search and filter the published catalog, inspect sources and installation instructions.',render.directoryBody(locale,ordered,page,searchManifestPath,catalog.capturedAt))
  console.log(`${locale}: directory pages generated (${totalPages})`)
  let completed=0
  for(const row of catalog.skills) {
    const publicPath=render.href(locale,`/skills/${row.slug}`)
    await writePage(locale,`/skills/${row.slug}`,row.name,row.description,render.detailBody(locale,row,browseBySlug.get(row.slug)),{
      lastModified:row.updated_at||catalog.capturedAt,jsonld:{'@context':'https://schema.org','@type':'WebPage',name:row.name,
        description:row.description,url:'https://www.openagentskill.com'+publicPath,inLanguage:locale==='zh'?'zh-CN':'en'},
    })
    completed++;if(completed%5000===0)console.log(`${locale}: ${completed}/${catalog.skills.length} skill details`)
  }
  await writePage(locale,'/rankings',zh?'Agent Skill 固定榜单':'Agent skill rankings',zh?'固定目录记录中的项目榜单。':'Project rankings from a fixed published catalog snapshot.',render.rankingBody(locale,ordered))
  for(const [slug,,en,titleZh] of render.rankings)await writePage(locale,`/rankings/${slug}`,zh?titleZh:en,'Fixed catalog snapshot; one entry per repository.',render.rankingBody(locale,ordered,slug))
  await writePage(locale,'/best',zh?'按任务寻找技能':'Skills by task','Task-specific skill shortlists.',render.categoryBody(locale,ordered))
  for(const slug of render.categoryPages){const meta=render.categoryMetadata(slug,locale);await writePage(locale,`/best/${slug}`,meta.title,meta.description,render.categoryBody(locale,ordered,slug),{lastModified:meta.updatedAt||catalog.capturedAt})}
  await writePage(locale,'/showcase',zh?'Skill 效果案例':'Skill examples','Source examples, templates and their original attribution.',render.examplesBody(locale))
  for(const example of render.examplePages())await writePage(locale,`/showcase/${example.slug}`,zh?example.title.zh:example.title.en,zh?example.description.zh:example.description.en,render.examplesBody(locale,example.slug),{lastModified:example.updatedAt,noindex:example.discoveryKind==='source-preview'})
  await writePage(locale,'/blog',zh?'文章与实践笔记':'Articles and practical notes','Published articles and practical skill notes.',render.postBody(locale,posts))
  for(const post of posts){const meta=render.postMetadata(post,locale);await writePage(locale,`/blog/${post.slug}`,meta.title,meta.description,render.postBody(locale,posts,post.slug),{lastModified:post.updated_at||post.published_at,languageAlternates:meta.languageAlternates})}
  await writePage(locale,'/guides',zh?'实用技能指南':'Practical skill guides','Source-based guidance for using agent skills.',render.guideBody(locale,ordered))
  for(const guide of render.guidePages)await writePage(locale,`/guides/${guide.slug}`,guide.title,guide.description,render.guideBody(locale,ordered,guide.slug),{lastModified:guide.updatedAt||catalog.capturedAt})
}
for(const slug of render.translatedPostSlugs) {
  const post=posts.find(item=>item.slug===slug)
  if(!post)continue
  for(const language of render.translatedPostLanguages.filter(lang=>!render.languages.includes(lang))) {
    const meta=render.postMetadata(post,language)
    await writePage('en',`/${language}/blog/${slug}`,meta.title,meta.description,render.postBody('en',posts,slug,language),
      {lastModified:post.updated_at||post.published_at,contentLanguage:language,languageAlternates:meta.languageAlternates})
  }
}
// Copy existing local media without image transformations, remote fetches or R2.
let media=0
async function copyMedia(directory,relative='') {
  for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const rel=path.posix.join(relative,entry.name),source=path.join(directory,entry.name)
    if(entry.isSymbolicLink())throw new Error('Unexpected symlink in public media')
    if(entry.isDirectory()){await copyMedia(source,rel);continue}
    if(!/\.(webp|png|jpe?g|gif|svg|avif|ico|woff2?|mp4|webm|pdf)$/i.test(entry.name)&&!(/^[a-f0-9]{32}\.txt$/i.test(entry.name)))continue
    if((await fs.stat(source)).size>25*1024*1024)continue
    const target=path.join(root,rel);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target);media++
  }
}
await copyMedia('public')
await fs.writeFile(path.join(root,'icon.svg'),render.brandIcon())
const xml=value=>String(value).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))
const sitemapNames=[]
for(let offset=0;offset<sitemap.length;offset+=45000) {
  const name=`sitemap-readonly-${offset/45000+1}.xml`
  const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap.slice(offset,offset+45000).map(item=>`<url><loc>https://www.openagentskill.com${xml(item.path)}</loc><lastmod>${xml(item.modified.slice(0,10))}</lastmod></url>`).join('')}</urlset>`
  await fs.writeFile(path.join(root,name),body);sitemapNames.push(name)
}
await fs.writeFile(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapNames.map(name=>`<sitemap><loc>https://www.openagentskill.com/${name}</loc></sitemap>`).join('')}</sitemapindex>`)
await fs.writeFile(path.join(root,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\nDisallow: /creator\nDisallow: /membership\nSitemap: https://www.openagentskill.com/sitemap.xml\n')
await fs.writeFile(path.join(root,'_headers'),`/*
  X-OAS-Mode: readonly
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
  Cache-Control: public, max-age=300
/reader/*
  Cache-Control: public, max-age=604800, immutable
/*.webp
  Cache-Control: public, max-age=604800
/*.png
  Cache-Control: public, max-age=604800
/*.jpg
  Cache-Control: public, max-age=604800
/*.jpeg
  Cache-Control: public, max-age=604800
/*.svg
  Cache-Control: public, max-age=604800
/*.mp4
  Cache-Control: public, max-age=604800
/*.webm
  Cache-Control: public, max-age=604800
/reader/status.json
  Cache-Control: no-store
`)
// Finite aliases retain established public discovery entry points.
await fs.writeFile(path.join(root,'_redirects'),`/agentskill /agent-skill 308
/trending /rankings/most-starred-agent-skills 302
/zh/trending /zh/rankings/most-starred-agent-skills 302
/agent-skill /guides 302
/zh/agent-skill /zh/guides 302
/skills/new /skills?sort=new 302
/zh/skills/new /zh/skills?sort=new 302
/categories /best 302
/zh/categories /zh/best 302
`)
const status={mode:'readonly',snapshot:catalog.capturedAt,sourceUpdatedThrough:catalog.skills.reduce((max,row)=>row.updated_at>max?row.updated_at:max,''),
  skills:catalog.skills.length,posts:posts.length,examplePages:render.examplePages().length,pages,media,sourceCommit:commit,sample,
  disabled:['accounts','checkout','submissions','automatic-ingestion','ai-analysis'],dynamicDatabaseReads:false,cacheWrites:false}
await fs.writeFile(path.join(root,'reader/status.json'),JSON.stringify(status))
let files=0,bytes=0
async function inventory(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await inventory(file);else{files++;const size=(await fs.stat(file)).size;if(size>25*1024*1024)throw new Error('Oversized static asset');bytes+=size}}}
await inventory(root)
if(files>99000)throw new Error(`Static asset count ${files} exceeds the safe deployment budget`)
try {
  const current=await fs.lstat(publishedRoot)
  if(!current.isDirectory()||current.isSymbolicLink()||await fs.realpath(publishedRoot)!==publishedRoot)throw new Error('Unexpected publication directory')
  const previous=path.join(buildRoot,'previous-'+randomUUID())
  // Both resolved paths are constrained to this worktree; retain the old tree.
  if(!previous.startsWith(buildRoot+path.sep))throw new Error('Unsafe archive path')
  await fs.rename(publishedRoot,previous)
} catch(error) {if(error.code!=='ENOENT')throw error}
await fs.rename(root,publishedRoot)
await fs.writeFile(path.join(buildRoot,'report.json'),JSON.stringify({...status,files,bytes,searchManifest:searchManifestPath,assets,sitemaps:sitemapNames,
  snapshotManifestHash:sha(await fs.readFile('data/readonly/manifest.json'))},null,2))
console.log(JSON.stringify({...status,files,bytes}))
