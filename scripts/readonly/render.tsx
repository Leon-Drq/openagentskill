/* Build-time renderer only. No Next server, database or analytics clients. */
/* eslint-disable @next/next/no-img-element -- Media is pre-optimized and served without an image transformation service. */
import fs from 'node:fs'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {BrandMark} from '@/components/brand-mark'
import {SiteHeaderFrame} from '@/components/site-header-frame'
import {SKILL_CATEGORIES,normalizeSkillCategory,classifySkill,categoryLabel} from '@/lib/skills/taxonomy'
import {getSkillCommerce} from '@/lib/skills/commerce'
import {getSkillSourcePreview} from '@/lib/skill-previews'
import {SHOWCASE_CASES,getShowcasesForSkill,getShowcaseImageSrc} from '@/lib/showcase'
import {getShowcaseEvidenceLabel,localizeShowcase} from '@/lib/showcase-shared'
import {previewText} from '@/lib/skill-preview-shared'
import {GROWTH_GUIDES} from '@/lib/seo/growth-guides'
import {BEST_SKILL_PAGES} from '@/lib/seo/growth-pages'
import {getPresentationPage,getPresentationSources,presentationSourceUrl} from '@/lib/seo/presentation-pages'
import {STATIC_BLOG_POSTS} from '@/lib/blog/static-posts'
import {reaArticleMarkdown,REA_ARTICLE_COPY} from '@/lib/blog/rea-guide'
import {creatorArticleMarkdown,CREATOR_ARTICLE_COPY} from '@/lib/blog/creator-workflows'
import {CREATOR_BLOG_SLUG,REA_BLOG_SLUG,BLOG_LOCALES,type BlogLocale} from '@/lib/blog/routes'
import {safeUrl} from '@/lib/readonly/catalog.mjs'
import type {BrowseSkill,PublicSkill,PublicCatalog,PublicPost} from '@/lib/readonly/types'

export const languages=['en','zh'] as const
type Language=typeof languages[number]
export const pageSize=16
const origin='https://www.openagentskill.com'
const tx=(locale:Language,en:string,zh:string)=>locale==='zh'?zh:en
export const href=(locale:Language,path:string)=>`${locale==='zh'?'/zh':''}${path==='/'?'':path}`||'/'
export const text=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const short=(value:string,length=220)=>value.length>length?value.slice(0,length-1)+'…':value
const exists=(src:string|undefined|null):src is string=>Boolean(src&&src.startsWith('/')&&!src.includes('..')&&fs.existsSync('public'+src)&&fs.statSync('public'+src).size<=25*1024*1024)
const compact=(n:number|null)=>n===null?'—':Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(n)
export const categoryName=(key:string,locale:Language)=>categoryLabel(key,locale)
const actualCases=SHOWCASE_CASES.filter(item=>item.media.some(media=>exists(getShowcaseImageSrc(media.src,'card'))||exists(media.src)))
let publicSlugs=new Set<string>()
export function setPublicSkills(rows:PublicSkill[]) {publicSlugs=new Set(rows.map(row=>row.slug))}
function previewImage(row:PublicSkill) {
  const source=getSkillSourcePreview(row.slug)
  const media=source?.media.find(item=>exists(item.cardSrc))
  const examples=getShowcasesForSkill(row.slug),example=examples.flatMap(item=>item.media).find(media=>exists(getShowcaseImageSrc(media.src,'card')))
  const pictures=[...(source?.media.map(item=>item.previewSrc)||[]),...examples.flatMap(item=>item.media.map(media=>getShowcaseImageSrc(media.src,'preview')))].filter(exists)
  return {image:media?.cardSrc||(example?getShowcaseImageSrc(example.src,'card'):null),exampleCount:new Set(pictures).size}
}
export function browseRow(row:PublicSkill):BrowseSkill {
  const category=normalizeSkillCategory(row.primary_category||row.category)||classifySkill(row).primary_category,preview=previewImage(row)
  return {slug:row.slug,name:row.name,description:short(row.tagline||row.description,300),author:row.author_name,
    repository:row.github_repo,category,tags:[...row.tags,...row.taxonomy_tags].slice(0,12),
    stars:row.github_stars,quality:row.quality_score,downloads:row.site_downloads,created:row.created_at,
    updated:row.github_last_pushed_at||row.updated_at,price:getSkillCommerce(row.slug).type,
    listing:row.listing_status,...preview}
}
function A({to,children,className}:{to:string|undefined|null;children:React.ReactNode;className?:string}) {
  const valid=safeUrl(to)
  return valid?<a href={valid} className={className} {...(valid.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{children}</a>:<span>{children}</span>
}
function Button({to,children,primary=false}:{to:string;children:React.ReactNode;primary?:boolean}) {
  return <a href={to} className={`ro-button${primary?' ro-button-primary':''}`}>{children}</a>
}
const shellCache=new Map<string,string>()
function header(locale:Language,contentLanguage=String(locale),translatedArticle=false) {
  const cacheKey=locale+':'+contentLanguage+':'+translatedArticle
  if(shellCache.has(cacheKey))return shellCache.get(cacheKey)!
  const names:Record<string,string>={en:'English',zh:'中文',ja:'日本語',ko:'한국어',es:'Español',de:'Deutsch',fr:'Français',id:'Indonesia'}
  const items=[['/skills',tx(locale,'Skills','技能目录')],['/rankings',tx(locale,'Rankings','固定榜单')],
    ['/showcase',tx(locale,'Examples','案例')],['/best',tx(locale,'Categories','分类')],['/guides',tx(locale,'Resources','资源')]]
  const links=items.map(([path,label])=><a key={path} href={href(locale,path)}>{label}</a>)
  const result=renderToStaticMarkup(<SiteHeaderFrame brand={<a className="ro-brand" href={href(locale,'/')}><BrandMark className="ro-brandmark"/><span>OpenAgentSkill</span></a>}
    navigation={<nav className="ro-nav" aria-label={tx(locale,'Primary navigation','主导航')}>{links}</nav>}
    actions={<><A to="https://github.com/Leon-Drq/openagentskill" className="ro-github">GitHub</A>
      <label><span className="ro-sr-only" hidden>{tx(locale,'Language','语言')}</span><select className="ro-language" data-language aria-label={tx(locale,'Language','语言')} defaultValue={contentLanguage}>{(translatedArticle?BLOG_LOCALES:languages).map(language=><option value={language} key={language}>{names[language]}</option>)}</select></label>
      <noscript><a href={locale==='zh'?'/':'/zh'}>{locale==='zh'?'English':'中文'}</a></noscript>
      <details className="ro-mobile"><summary aria-label={tx(locale,'Open navigation','打开导航')}>☰</summary><nav>{links}</nav></details></>}/> )
  shellCache.set(cacheKey,result);return result
}
function footer(locale:Language,capturedAt:string) {
  return renderToStaticMarkup(<footer className="ro-footer"><div className="ro-wrap"><a className="ro-brand" href={href(locale,'/')}><BrandMark className="ro-brandmark"/>OpenAgentSkill</a>
    <nav aria-label={tx(locale,'Footer navigation','页脚导航')}>{[['/skills','Skills','技能目录'],['/showcase','Examples','案例'],['/blog','Blog','文章'],['/guides','Guides','指南'],['/rankings','Rankings','榜单'],['/sitemap.xml','Sitemap','站点地图']].map(([path,en,zh])=><a key={path} href={path==='/sitemap.xml'?path:href(locale,path)}>{tx(locale,en,zh)}</a>)}<A to="https://github.com/Leon-Drq/openagentskill">GitHub</A></nav>
    <p>{tx(locale,'Browse, search and copy installation commands. Accounts, checkout and submissions are temporarily unavailable.','支持浏览、搜索和复制安装命令；账户、支付及提交服务暂不可用。')}</p>
    <p>{tx(locale,'Catalog captured','目录记录日期')}：{capturedAt.slice(0,10)} · {tx(locale,'Source information and examples are not a guarantee of safety or execution results.','来源信息和案例不代表安全保证或运行结果保证。')}</p></div></footer>)
}
export function documentPage({locale,path,title,description,body,capturedAt,assets,jsonld,noindex=false,alternates=true,contentLanguage=locale,languageAlternates}:{locale:Language;path:string;title:string;description:string;body:string;capturedAt:string;assets:{css:string;js:string;homeCss?:string;homeJs?:string};jsonld?:unknown;noindex?:boolean;alternates?:boolean;contentLanguage?:string;languageAlternates?:Record<string,string>}) {
  const canonical=origin+href(locale,path)
  const alternateLinks=languageAlternates?Object.entries(languageAlternates).map(([lang,url])=>`<link rel="alternate" hreflang="${text(lang)}" href="${text(url)}">`).join(''):alternates?languages.map(lang=>`<link rel="alternate" hreflang="${lang==='zh'?'zh-CN':'en'}" href="${text(origin+href(lang,path))}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${text(origin+href('en',path))}">`:''
  const home=path==='/'&&Boolean(assets.homeCss)
  const contents=home?body:`<a class="ro-skip" href="#content">${tx(locale,'Skip to content','跳至正文')}</a>${header(locale,contentLanguage,Boolean(languageAlternates))}<div class="ro-notice">${tx(locale,'Browsing is open · Catalog captured','浏览已开放 · 目录记录日期')} ${capturedAt.slice(0,10)} · ${tx(locale,'Automatic updates and account services are paused.','自动更新和账户服务暂时关闭。')}</div><main id="content">${body}</main>${footer(locale,capturedAt)}`
  return `<!doctype html><html lang="${contentLanguage==='zh'?'zh-CN':contentLanguage}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${text(title)} | OpenAgentSkill</title><meta name="description" content="${text(short(description,170))}"><link rel="canonical" href="${text(canonical)}">${noindex?'<meta name="robots" content="noindex,follow">':''}${alternateLinks}<meta property="og:type" content="website"><meta property="og:title" content="${text(title)}"><meta property="og:description" content="${text(short(description,170))}"><meta property="og:url" content="${text(canonical)}"><meta name="twitter:card" content="summary"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="${home?assets.homeCss:assets.css}"><script defer src="${home?(assets.homeJs||assets.js):assets.js}"></script>${jsonld?`<script type="application/ld+json">${JSON.stringify(jsonld).replaceAll('<','\\u003c')}</script>`:''}</head><body class="${home?'readonly-home font-sans antialiased':'ro-site'}" data-locale="${locale}">${contents}</body></html>`
}
export function Card({skill,locale}:{skill:BrowseSkill;locale:Language}) {
  return <article className="ro-card">
    {skill.image&&<a href={href(locale,`/skills/${skill.slug}#examples`)}><img className="ro-card-image" src={skill.image} alt={`${skill.name} ${tx(locale,'source example','来源案例')}`} width="480" height="300" loading="lazy"/></a>}
    <div className="ro-card-body"><a className="ro-card-category" href={href(locale,`/best/${skill.category}`)}>{categoryName(skill.category,locale)}</a>
      <h3><a href={href(locale,`/skills/${skill.slug}`)}>{skill.name}</a></h3><p className="ro-card-author">{skill.author}</p><p className="ro-card-description">{skill.description}</p>
      <div className="ro-tags"><span className="ro-tag">{skill.price==='unknown'?tx(locale,'Price unconfirmed','价格待确认'):skill.price==='free'?tx(locale,'Free source','免费来源'):skill.price}</span>{skill.exampleCount>0&&<a className="ro-tag" href={href(locale,`/skills/${skill.slug}#examples`)}>{skill.exampleCount} {tx(locale,'examples','个示例')}</a>}</div></div>
    <div className="ro-card-footer"><span>☆ {compact(skill.stars)} GitHub</span><a className="ro-link" href={href(locale,`/skills/${skill.slug}`)}>{tx(locale,'View details','查看详情')} →</a></div></article>
}
function Cards({rows,locale}:{rows:BrowseSkill[];locale:Language}) {return <div className="ro-grid">{rows.map(row=><Card key={row.slug} skill={row} locale={locale}/>)}</div>}
function Search({locale}:{locale:Language}) {return <form className="ro-search" id="ro-search" action={href(locale,'/skills')} role="search"><input id="ro-query" name="q" type="search" maxLength={160} placeholder={tx(locale,'Search skills or describe a task…','搜索技能或描述你的任务…')} aria-label={tx(locale,'Search skills','搜索技能')}/><button className="ro-button ro-button-primary" type="submit">{tx(locale,'Search','搜索')}</button></form>}
function Pagination({locale,page,pages}:{locale:Language;page:number;pages:number}) {return <nav className="ro-pagination" id="ro-pagination" aria-label={tx(locale,'Pagination','分页')}>
  {page>1&&<Button to={href(locale,page===2?'/skills':`/skills/page/${page-1}`)}>{tx(locale,'Previous','上一页')}</Button>}<span>{page.toLocaleString()} / {pages.toLocaleString()}</span>{page<pages&&<Button to={href(locale,`/skills/page/${page+1}`)}>{tx(locale,'Next','下一页')}</Button>}</nav>}
export function directoryBody(locale:Language,rows:BrowseSkill[],page:number,searchManifest:string,capturedAt:string) {
  const pages=Math.ceil(rows.length/pageSize),visible=rows.slice((page-1)*pageSize,page*pageSize)
  return renderToStaticMarkup(<div className="ro-wrap"><Search locale={locale}/><div className="ro-directory" data-directory data-search-manifest={searchManifest} data-initial-page={page} data-total={rows.length}>
    <aside className="ro-filter" aria-label={tx(locale,'Filters','筛选')}><fieldset><legend>{tx(locale,'Access','获取方式')}</legend>{[['all','All','全部'],['free','Free','免费'],['paid','Paid','付费'],['unknown','Unconfirmed','待确认']].map(([value,en,zh])=><label key={value}><input type="radio" name="access" value={value} defaultChecked={value==='all'}/>{tx(locale,en,zh)}</label>)}</fieldset>
      <fieldset><legend>{tx(locale,'Examples','示例')}</legend><label><input id="ro-examples" type="checkbox"/>{tx(locale,'With examples','有示例图片')}</label></fieldset>
      <fieldset><legend>{tx(locale,'Category','分类')}</legend><nav className="ro-category-links"><a href={href(locale,'/skills')} data-category="all">{tx(locale,'All categories','全部分类')}</a>{SKILL_CATEGORIES.map(([key])=><a key={key} href={href(locale,`/skills?category=${key}`)} data-category={key}>{categoryName(key,locale)}</a>)}</nav></fieldset>
      <a className="ro-link" href={href(locale,'/skills')} id="ro-reset">{tx(locale,'Reset filters','重置筛选')}</a></aside>
    <section><div className="ro-results-head"><div><h1>{tx(locale,'All skills','全部技能')}</h1><p className="ro-muted" id="ro-count">{rows.length.toLocaleString()} Skills</p></div><select id="ro-sort" className="ro-sort" aria-label={tx(locale,'Sort skills','技能排序')} defaultValue="quality">{[['quality','Quality','质量记录'],['stars','GitHub stars','GitHub 星标'],['new','Recently added','最近收录'],['fresh','Recently updated','最近更新'],['downloads','Site downloads','站内下载']].map(([value,en,zh])=><option key={value} value={value}>{tx(locale,en,zh)}</option>)}</select></div>
      <p className="ro-status" id="ro-status" role="status" aria-live="polite">{tx(locale,'Search uses this published catalog; rankings and counts are snapshots.','搜索范围为本次公开目录；榜单和数量均为记录时的数据。')}</p><div id="ro-results"><Cards rows={visible} locale={locale}/></div><Pagination locale={locale} page={page} pages={pages}/>
      <noscript><p>{tx(locale,'Search needs JavaScript. You can still browse every published detail using pagination, categories and the sitemap.','搜索需要 JavaScript；仍可通过分页、分类和站点地图浏览公开详情。')}</p></noscript><p className="ro-snapshot">{tx(locale,'Catalog captured','目录记录日期')}：{capturedAt.slice(0,10)}</p></section></div>
    <template id="ro-card-template"><article className="ro-card"><a data-part="preview-link" hidden><img className="ro-card-image" data-part="preview" alt="" width="480" height="300" loading="lazy"/></a><div className="ro-card-body"><a className="ro-card-category" data-part="category"/><h3><a data-part="name"/></h3><p className="ro-card-author" data-part="author"/><p className="ro-card-description" data-part="description"/><div className="ro-tags"><span className="ro-tag" data-part="price"/><a className="ro-tag" data-part="examples" hidden/></div></div><div className="ro-card-footer"><span data-part="stars"/><a className="ro-link" data-part="details"/></div></article></template></div>)
}
function categoryLinks(locale:Language,rows:BrowseSkill[]) {
  const counts=new Map<string,number>();for(const row of rows)counts.set(row.category,(counts.get(row.category)||0)+1)
  return <div className="ro-categories">{SKILL_CATEGORIES.map(([key])=><a key={key} href={href(locale,`/best/${key}`)}>{categoryName(key,locale)}<small>{(counts.get(key)||0).toLocaleString()} Skills</small></a>)}</div>
}
function Markdown({content}:{content:string}) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={value=>safeUrl(value)||''} components={{h1:({children})=><h2>{children}</h2>,img:({src,alt})=>exists(typeof src==='string'?src:null)?<img src={src} alt={alt||''} loading="lazy"/>:null,a:({href:to,children})=><A to={to} className="ro-link">{children}</A>}}>{content}</ReactMarkdown>
}
export function detailBody(locale:Language,row:PublicSkill,browse:BrowseSkill) {
  const source=getSkillSourcePreview(row.slug),examples=getShowcasesForSkill(row.slug).filter(item=>actualCases.some(valid=>valid.slug===item.slug))
  const githubRepository=/^[-\w.]+\/[-\w.]+$/.test(row.github_repo)?`https://github.com/${row.github_repo}`:null
  const repo=githubRepository||safeUrl(row.repository)
  const reference=row.source_commit_sha||row.source_ref
  const sourcePath=row.source_path&&!row.source_path.split('/').some(segment=>segment==='..'||segment==='.')?row.source_path:null
  const sourceUrl=githubRepository&&reference&&sourcePath?`${githubRepository}/blob/${encodeURIComponent(reference)}/${sourcePath.split('/').map(encodeURIComponent).join('/')}`:repo
  const state=row.ai_review_approved?tx(locale,'AI review on file','已有 AI 审核记录'):row.listing_status==='owner_published'?tx(locale,'Owner publication','站主发布'):tx(locale,'Static checks on file','已有静态检查记录')
  return renderToStaticMarkup(<div className="ro-wrap ro-detail"><nav className="ro-breadcrumb" aria-label={tx(locale,'Breadcrumb','面包屑')}><a href={href(locale,'/')}>Home</a> / <a href={href(locale,'/skills')}>Skills</a> / <a href={href(locale,`/best/${browse.category}`)}>{categoryName(browse.category,locale)}</a></nav>
    <span className="ro-kicker">{categoryName(browse.category,locale)}</span><h1 className="ro-detail-title">{row.name}</h1><p className="ro-lead">{row.description}</p><p className="ro-muted">{row.author_name} · {state}</p>
    <div className="ro-actions">{repo&&<A to={repo} className="ro-button ro-button-primary">GitHub ↗</A>}{browse.exampleCount>0&&<Button to="#examples">{tx(locale,'View examples','查看示例')}</Button>}{sourceUrl&&<A to={sourceUrl} className="ro-button">{tx(locale,'Read the source','阅读来源文件')} ↗</A>}</div>
    <div className="ro-detail-columns"><div><section className="ro-panel"><h2>{tx(locale,'Installation','安装与使用')}</h2><p>{tx(locale,'Read the source and dependencies before running a command. Copying does not install or execute anything.','运行命令前先阅读来源与依赖说明。复制命令不会自动安装或执行。')}</p>{row.install_command?<div className="ro-install"><code className="ro-code" id="ro-install-command">{row.install_command}</code><button className="ro-button" data-copy="ro-install-command" type="button">{tx(locale,'Copy','复制')}</button></div>:<p><A to={sourceUrl} className="ro-link">{tx(locale,'See the author’s installation instructions','查看作者提供的安装说明')} ↗</A></p>}<p className="ro-status" id="ro-copy-status" role="status"/></section>
      {row.long_description&&<section className="ro-article"><h2>{tx(locale,'About this skill','技能说明')}</h2><Markdown content={row.long_description}/>{row.long_description.length>=6000&&<A to={sourceUrl} className="ro-link">{tx(locale,'Read the complete source','阅读完整来源')} ↗</A>}</section>}
      {browse.exampleCount>0&&<section id="examples" className="ro-section"><h2>{tx(locale,'A closer look','先看看实际效果')}</h2>{source&&<><p className="ro-muted">{previewText(source.note,locale)}</p>{source.media.filter(media=>exists(media.previewSrc)).map(media=><figure className="ro-media" key={media.src}><img src={media.previewSrc} alt={previewText(media.alt,locale)} width={media.width} height={media.height} loading="lazy"/><figcaption>{previewText(media.title,locale)} · <A to={media.sourceUrl} className="ro-link">{tx(locale,'Source','原始来源')}</A> · {source.license} · <A to={source.licenseUrl} className="ro-link">{tx(locale,'License','许可')}</A>{source.notices?.map(notice=><React.Fragment key={notice.url}> · <A to={notice.url} className="ro-link">{notice.title}</A></React.Fragment>)}</figcaption></figure>)}</>}{examples.map(item=><div key={item.slug}><h3><a href={href(locale,`/showcase/${item.slug}`)}>{localizeShowcase(item.title,locale)}</a></h3><p className="ro-muted">{getShowcaseEvidenceLabel(item,locale)} · {localizeShowcase(item.productionNote,locale)}</p>{item.media.slice(0,2).map(media=>{const src=exists(getShowcaseImageSrc(media.src,'preview'))?getShowcaseImageSrc(media.src,'preview'):media.src;return exists(src)?<figure key={src} className="ro-media"><img src={src} alt={localizeShowcase(media.alt,locale)} width={media.width} height={media.height} loading="lazy"/><figcaption><a className="ro-link" href={href(locale,`/showcase/${item.slug}`)}>{tx(locale,'View example and attribution','查看案例和来源署名')} →</a></figcaption></figure>:null})}</div>)}</section>}
    </div><aside className="ro-panel"><h2>{tx(locale,'Source record','来源记录')}</h2><dl><dt>GitHub stars</dt><dd>{(row.github_stars??0).toLocaleString()}</dd><dt>{tx(locale,'Publication','发布状态')}</dt><dd>{state}</dd><dt>{tx(locale,'License recorded','记录的许可')}</dt><dd>{row.license||tx(locale,'Not confirmed','未确认')}</dd><dt>{tx(locale,'Source activity recorded','记录的来源更新时间')}</dt><dd>{row.github_last_pushed_at?.slice(0,10)||'—'}</dd><dt>{tx(locale,'Version recorded','记录的版本')}</dt><dd>{row.version||'—'}</dd><dt>{tx(locale,'Price','价格')}</dt><dd>{browse.price==='unknown'?tx(locale,'Unconfirmed; check the author’s terms.','待确认；请查看作者的使用条件。'):browse.price==='free'?tx(locale,'Free source; dependencies may cost extra.','来源免费；依赖服务可能另收费。'):browse.price}</dd><dt>{tx(locale,'Review notes','审核提示')}</dt><dd>{row.ai_review_issues.length?row.ai_review_issues.join(' · '):tx(locale,'No additional notes recorded. This is not a runtime-test or safety guarantee.','未记录额外提示，不代表经过运行测试或提供安全保证。')}</dd></dl><div className="ro-tags">{row.tags.slice(0,8).map(tag=><span className="ro-tag" key={tag}>{tag}</span>)}</div></aside></div></div>)
}
export function rankProjects(rows:BrowseSkill[],metric:'stars'|'quality'|'updated') {
  const value=(row:BrowseSkill)=>metric==='updated'?Date.parse(row.updated)||0:metric==='stars'?row.stars||0:row.quality||0
  const seen=new Set<string>()
  return [...rows].sort((a,b)=>value(b)-value(a)||a.slug.localeCompare(b.slug)).filter(row=>{const key=(row.repository||row.slug).toLowerCase();if(seen.has(key))return false;seen.add(key);return true})
}
export function rankingList(locale:Language,rows:BrowseSkill[],metric:'stars'|'quality'|'updated') {
  return <ol className="ro-ranking">{rows.map((row,index)=><li key={row.slug}><span className="ro-muted">{index+1}</span><div><a href={href(locale,`/skills/${row.slug}`)}><strong>{row.name}</strong></a><p>{row.repository||row.author}</p></div><span>{metric==='stars'?compact(row.stars):metric==='quality'?row.quality?.toFixed(0)||'—':row.updated?.slice(0,10)||'—'}</span></li>)}</ol>
}
export const rankings=[['most-starred-agent-skills','stars','Most starred agent skills','GitHub 星标榜'],['highest-quality-agent-skills','quality','Highest recorded quality scores','质量记录榜'],['recently-updated-agent-skills','updated','Recently updated projects','最近更新榜']] as const
export function rankingBody(locale:Language,rows:BrowseSkill[],slug?:string) {
  const definition=rankings.find(item=>item[0]===slug),metric=definition?.[1]||'stars'
  return renderToStaticMarkup(<div className="ro-wrap ro-narrow ro-section"><span className="ro-kicker">OpenAgentSkill rankings</span><h1>{definition?tx(locale,definition[2],definition[3]):tx(locale,'Agent skill rankings','Agent Skill 固定榜单')}</h1><p className="ro-lead">{tx(locale,'A fixed catalog snapshot, with one entry per repository. Scores and stars are existing records; this is not a comparative runtime benchmark.','基于固定目录记录，每个仓库只出现一次。分数与星标来自已有记录，不是运行效果对比测试。')}</p><nav className="ro-actions">{rankings.map(([path,,en,zh])=><Button key={path} to={href(locale,`/rankings/${path}`)} primary={path===definition?.[0]}>{tx(locale,en,zh)}</Button>)}</nav><section className="ro-section">{rankingList(locale,rankProjects(rows,metric).slice(0,100),metric)}</section></div>)
}
export function categoryBody(locale:Language,rows:BrowseSkill[],slug?:string) {
  const taxonomy=SKILL_CATEGORIES.find(item=>item[0]===slug),definition=BEST_SKILL_PAGES.find(item=>item.slug===slug),presentation=slug?getPresentationPage(slug):undefined
  if(!slug)return renderToStaticMarkup(<div className="ro-wrap ro-section"><h1>{tx(locale,'Skills by task','按任务寻找技能')}</h1><div className="ro-section">{categoryLinks(locale,rows)}</div><h2>{tx(locale,'More shortlists','更多专题')}</h2><div className="ro-actions">{BEST_SKILL_PAGES.map(page=><Button key={page.slug} to={href(locale,`/best/${page.slug}`)}>{page.shortTitle}</Button>)}</div></div>)
  const terms=(presentation?.sourceIds||[definition?.useCaseSlug||slug]).flatMap(s=>s.split('-')).filter(term=>term.length>2)
  const selected=taxonomy?rows.filter(row=>row.category===slug):rows.filter(row=>terms.some(term=>`${row.name} ${row.description} ${row.tags.join(' ')}`.toLowerCase().includes(term)))
  const title=presentation?.title||(taxonomy?categoryName(slug,locale):definition?.title||slug)
  return renderToStaticMarkup(<div className="ro-wrap ro-section"><span className="ro-kicker">{tx(locale,'Task shortlist','任务专题')}</span><h1>{title}</h1><p className="ro-lead">{presentation?.description||definition?.description||tx(locale,`Browse ${selected.length.toLocaleString()} published skills in this category.`,`本分类共 ${selected.length.toLocaleString()} 条公开技能。`)}</p>
    <div className="ro-actions"><Button primary to={href(locale,`/skills?${taxonomy?'category='+slug:'q='+encodeURIComponent(definition?.shortTitle||slug.replaceAll('-',' '))}`)}>{tx(locale,'Search the full directory','搜索完整目录')}</Button></div>
    {presentation&&<section className="ro-section ro-article" lang="en"><p>{presentation.intro}</p><h2>{presentation.selectionTitle}</h2>
      <ul>{presentation.quickPicks.map(pick=><li key={pick.task}><strong>{pick.task}</strong> — {pick.reason}</li>)}</ul>
      {presentation.sections.map(section=><section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</section>)}
      {presentation.platformGuide&&<section><h2>{presentation.platformGuide.title}</h2><p>{presentation.platformGuide.intro}</p><ol>{presentation.platformGuide.steps.map(step=><li key={step}>{step}</li>)}</ol><pre><code>{presentation.platformGuide.prompt}</code></pre>{presentation.platformGuide.links.map(link=><p key={link.href}><A to={link.href}>{link.label}</A></p>)}</section>}
      <h2>{tx(locale,'Sources','来源')}</h2><ul>{getPresentationSources(presentation).map(source=><li key={source.id}><A to={presentationSourceUrl(source)}>{source.name}</A> — {source.summary}</li>)}</ul>
      {presentation.faq.map(faq=><section key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></section>)}</section>}
    <section className="ro-section"><Cards rows={selected.slice(0,48)} locale={locale}/>{!selected.length&&<p>{tx(locale,'Use the full catalog search to refine this task.','请使用完整目录搜索进一步查找。')}</p>}</section></div>)
}
export function examplePages() {return actualCases}
export function examplesBody(locale:Language,slug?:string) {
  const item=actualCases.find(item=>item.slug===slug)
  if(!item)return renderToStaticMarkup(<div className="ro-wrap ro-section"><h1>{tx(locale,'See what skills can produce','先看 Skill 能做出什么')}</h1><p className="ro-lead">{tx(locale,'Source examples, templates and work made here keep their original attribution. An example does not establish a successful installation or a safety guarantee.','来源案例、模板与本站作品保留各自署名。展示案例不代表安装成功或提供安全保证。')}</p><div className="ro-grid">{actualCases.map(item=>{const media=item.media[0],src=exists(getShowcaseImageSrc(media.src,'card'))?getShowcaseImageSrc(media.src,'card'):media.src;return <article className="ro-card" key={item.slug}><a href={href(locale,`/showcase/${item.slug}`)}><img className="ro-card-image" src={src} alt={localizeShowcase(media.alt,locale)} loading="lazy" width="480" height="300"/></a><div className="ro-card-body"><p className="ro-card-category">{getShowcaseEvidenceLabel(item,locale)}</p><h3><a href={href(locale,`/showcase/${item.slug}`)}>{localizeShowcase(item.title,locale)}</a></h3><p className="ro-card-description">{localizeShowcase(item.description,locale)}</p></div></article>})}</div></div>)
  return renderToStaticMarkup(<article className="ro-wrap ro-narrow ro-section"><span className="ro-kicker">{getShowcaseEvidenceLabel(item,locale)}</span><h1>{localizeShowcase(item.title,locale)}</h1><p className="ro-lead">{localizeShowcase(item.description,locale)}</p><div className="ro-actions">{publicSlugs.has(item.skillSlug)&&<Button primary to={href(locale,`/skills/${item.skillSlug}`)}>{tx(locale,'Explore this skill','查看此技能')}</Button>}<A to={item.sourceUrl} className="ro-button">{tx(locale,'Original source','原始来源')} ↗</A></div>
    {exists(item.videoUrl)&&<figure className="ro-media"><video controls preload="none" src={item.videoUrl}/></figure>}{item.media.map(media=>{const src=exists(getShowcaseImageSrc(media.src,'preview'))?getShowcaseImageSrc(media.src,'preview'):media.src;return exists(src)?<figure className="ro-media" key={src}><img src={src} alt={localizeShowcase(media.alt,locale)} width={media.width} height={media.height} loading="lazy"/></figure>:null})}<section className="ro-article"><h2>{tx(locale,'About the example','案例说明')}</h2><p>{localizeShowcase(item.productionNote,locale)}</p><h3>{tx(locale,'Input','输入')}</h3><p>{localizeShowcase(item.input,locale)}</p><h3>{tx(locale,'Output','输出')}</h3><p>{localizeShowcase(item.output,locale)}</p><h3>{tx(locale,'Requirements','前置条件')}</h3><p>{localizeShowcase(item.requirements,locale)}</p><h3>{tx(locale,'Prompt','提示词')}</h3><pre><code>{localizeShowcase(item.prompt,locale)}</code></pre><p>{item.license} · <A to={item.licenseUrl} className="ro-link">{tx(locale,'License','许可')}</A> · {item.sourceRevision}</p></section></article>)
}
export function publicPosts(catalog:PublicCatalog):PublicPost[] {
  const map=new Map(catalog.posts.map(post=>[post.slug,post]))
  for(const post of STATIC_BLOG_POSTS)map.set(post.slug,post)
  return [...map.values()].filter(post=>/^[a-z0-9][a-z0-9-]{0,239}$/.test(post.slug)).sort((a,b)=>b.published_at.localeCompare(a.published_at))
}
export function postBody(locale:Language,posts:PublicPost[],slug?:string,contentLanguage:BlogLocale=locale) {
  const post=posts.find(post=>post.slug===slug)
  if(!post)return renderToStaticMarkup(<div className="ro-wrap ro-section"><h1>{tx(locale,'Articles and practical notes','文章与实践笔记')}</h1><section className="ro-section ro-grid">{posts.map(post=><article className="ro-card" key={post.slug}><div className="ro-card-body"><small>{post.published_at.slice(0,10)}</small><h3><a href={href(locale,`/blog/${post.slug}`)}>{post.title}</a></h3><p className="ro-card-description">{post.summary}</p></div></article>)}</section></div>)
  const copy=post.slug===REA_BLOG_SLUG?REA_ARTICLE_COPY[contentLanguage]:post.slug===CREATOR_BLOG_SLUG?CREATOR_ARTICLE_COPY[contentLanguage]:undefined
  const content=post.slug===REA_BLOG_SLUG?reaArticleMarkdown(contentLanguage):post.slug===CREATOR_BLOG_SLUG?creatorArticleMarkdown(contentLanguage):post.content
  return renderToStaticMarkup(<article className="ro-wrap ro-narrow ro-section" lang={copy?(contentLanguage==='zh'?'zh-CN':contentLanguage):''}><nav className="ro-breadcrumb"><a href={href(locale,'/blog')}>{tx(locale,'Blog','文章')}</a></nav><h1>{copy?.title||post.title}</h1><p className="ro-lead">{copy?.summary||post.summary}</p><p className="ro-muted">{post.published_at.slice(0,10)}</p>{!copy&&<p className="ro-muted">{tx(locale,'Original published text; no automatic translation.','保留发布时的原文，未自动翻译。')}</p>}<div className="ro-article"><Markdown content={content}/></div>{post.truncated&&<p>{tx(locale,'This archived article is abridged.','此归档文章已节选。')}</p>}</article>)
}
export const guidePages=GROWTH_GUIDES
export const categoryPages=[...new Set([...SKILL_CATEGORIES.map(item=>item[0]),...BEST_SKILL_PAGES.map(item=>item.slug)])]
export const brandIcon=()=>renderToStaticMarkup(<BrandMark/>).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')
export function categoryMetadata(slug:string,locale:Language) {
  const definition=getPresentationPage(slug)||BEST_SKILL_PAGES.find(item=>item.slug===slug)
  return {title:definition?.title||categoryName(slug,locale),description:definition?.description||tx(locale,'Browse published skills in this category.','浏览此分类中的公开技能。'),updatedAt:definition?.updatedAt,localized:!definition}
}
export const translatedPostSlugs=[CREATOR_BLOG_SLUG,REA_BLOG_SLUG]
export const translatedPostLanguages=BLOG_LOCALES
export function postMetadata(post:PublicPost,locale:BlogLocale) {
  const copy=post.slug===REA_BLOG_SLUG?REA_ARTICLE_COPY[locale]:post.slug===CREATOR_BLOG_SLUG?CREATOR_ARTICLE_COPY[locale]:undefined
  return {title:copy?.title||post.title,description:copy?.summary||post.summary,
    languageAlternates:copy?{...Object.fromEntries(BLOG_LOCALES.map(lang=>[lang==='zh'?'zh-CN':lang,`${origin}${lang==='en'?'':'/'+lang}/blog/${post.slug}`])),'x-default':`${origin}/blog/${post.slug}`}:undefined}
}
export function guideBody(locale:Language,rows:BrowseSkill[],slug?:string) {
  const guide=GROWTH_GUIDES.find(item=>item.slug===slug)
  if(!guide)return renderToStaticMarkup(<div className="ro-wrap ro-section"><h1>{tx(locale,'Practical skill guides','实用技能指南')}</h1><section className="ro-section ro-grid">{GROWTH_GUIDES.map(item=><article className="ro-card" key={item.slug}><div className="ro-card-body"><h3><a href={href(locale,`/guides/${item.slug}`)}>{item.title}</a></h3><p className="ro-card-description">{item.description}</p></div></article>)}</section></div>)
  const selected=rows.filter(row=>guide.primarySkillSlugs?.includes(row.slug)).slice(0,12)
  return renderToStaticMarkup(<article className="ro-wrap ro-narrow ro-section"><span className="ro-kicker">{guide.eyebrow}</span><h1>{guide.title}</h1><p className="ro-lead">{guide.description}</p><div className="ro-article" lang="en">{guide.sections.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.body}</p><ul>{section.bullets.map(bullet=><li key={bullet}>{bullet}</li>)}</ul></section>)}{guide.steps.length>0&&<section><h2>{tx(locale,'Steps','操作步骤')}</h2><ol>{guide.steps.map(step=><li key={step.title}><strong>{step.title}</strong><p>{step.description}</p></li>)}</ol></section>}{guide.faq.map(faq=><section key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></section>)}</div>{selected.length>0&&<section className="ro-section"><h2>{tx(locale,'Related published skills','相关公开技能')}</h2><Cards rows={selected} locale={locale}/></section>}</article>)
}
