import {filterCatalog,readState} from '../../lib/readonly/search.mjs'
import {getSearchTerms} from '../../lib/search-query.ts'
const locale=document.body.dataset.locale==='zh'?'zh':'en'
const tr=(en,zh)=>locale==='zh'?zh:en
const path=value=>(locale==='zh'?'/zh':'')+value
const format=n=>n===null?'—':Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(n)
document.querySelectorAll('[data-language]').forEach(select=>select.addEventListener('change',()=>{
  const next=new URL(location.href),route=next.pathname.replace(/^\/(en|zh|ja|ko|es|de|fr|id)(?=\/|$)/,'')||'/'
  next.pathname=(select.value==='zh'?'/zh':'')+(route==='/'?'':route)||'/'
  location.assign(next.href)
}))
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  const target=document.getElementById(button.dataset.copy),status=document.getElementById('ro-copy-status')
  if(!target)return
  try {await navigator.clipboard.writeText(target.textContent);button.textContent=tr('Copied','已复制');if(status)status.textContent=tr('Copied. Nothing has been executed.','已复制，未执行任何命令。')}
  catch {const range=document.createRange();range.selectNodeContents(target);getSelection()?.removeAllRanges();getSelection()?.addRange(range);if(status)status.textContent=tr('Select and copy the command manually.','请选中命令后手动复制。')}
}))
const directory=document.querySelector('[data-directory]')
if(directory) {
  const query=document.getElementById('ro-query'),sort=document.getElementById('ro-sort'),examples=document.getElementById('ro-examples')
  const status=document.getElementById('ro-status'),results=document.getElementById('ro-results'),count=document.getElementById('ro-count'),pagination=document.getElementById('ro-pagination')
  const template=document.getElementById('ro-card-template'),form=document.getElementById('ro-search')
  let current=readState(new URL(location.href)),catalogPromise,manifest,requestId=0
  const controls=()=>{
    query.value=current.q;sort.value=current.sort;examples.checked=current.examples
    directory.querySelectorAll('input[name=access]').forEach(input=>{input.checked=input.value===current.access})
    directory.querySelectorAll('[data-category]').forEach(link=>{if(link.dataset.category===current.category)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')})
  }
  async function fetchJson(url) {
    if(!url.startsWith('/reader/'))throw new Error('Unexpected search asset')
    for(let attempt=0;attempt<2;attempt++) {
      try {const response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Search asset unavailable');return await response.json()}
      catch(error){if(attempt)throw error}
    }
  }
  async function loadCatalog() {
    if(catalogPromise)return catalogPromise
    catalogPromise=(async()=>{
      manifest=await fetchJson(directory.dataset.searchManifest)
      if(manifest.version!==1||!Array.isArray(manifest.shards)||manifest.shards.length>64)throw new Error('Invalid search manifest')
      const loaded=[],queue=[...manifest.shards];let done=0
      await Promise.all(Array.from({length:4},async()=>{
        while(queue.length) {
          const file=queue.shift(),rows=await fetchJson(file)
          if(!Array.isArray(rows))throw new Error('Invalid search index')
          loaded.push(...rows);done++
          status.textContent=tr(`Loading search directory ${done}/${manifest.shards.length}…`,`正在加载搜索目录 ${done}/${manifest.shards.length}…`)
        }
      }))
      if(loaded.length!==manifest.count)throw new Error('Incomplete search index')
      return loaded
    })().catch(error=>{catalogPromise=undefined;throw error})
    return catalogPromise
  }
  const put=(node,name,value)=>{const target=node.querySelector(`[data-part="${name}"]`);target.textContent=value??'';return target}
  function card(row) {
    const node=template.content.firstElementChild.cloneNode(true),detail=path('/skills/'+row.slug)
    const category=put(node,'category',manifest.categories[row.category]?.[locale]||row.category)
    category.href=path('/best/'+row.category)
    put(node,'name',row.name).href=detail;put(node,'author',row.author);put(node,'description',row.description)
    put(node,'price',row.price==='unknown'?tr('Price unconfirmed','价格待确认'):row.price==='free'?tr('Free source','免费来源'):row.price)
    put(node,'stars','☆ '+format(row.stars)+' GitHub');put(node,'details',tr('View details →','查看详情 →')).href=detail
    if(row.image&&/^\/(?!\/)/.test(row.image)&&!row.image.includes('..')) {
      const link=node.querySelector('[data-part="preview-link"]'),image=node.querySelector('[data-part="preview"]')
      link.hidden=false;link.href=detail+'#examples';image.src=row.image;image.alt=row.name+' '+tr('source example','来源案例')
    }
    if(row.exampleCount>0) {const link=put(node,'examples',row.exampleCount+' '+tr('examples','个示例'));link.hidden=false;link.href=detail+'#examples'}
    return node
  }
  function pageLink(label,page) {
    const url=new URL(path('/skills'),location.origin)
    for(const [key,value] of Object.entries(current))if(value&&value!=='all'&&key!=='page'&&!(key==='sort'&&value==='quality'))url.searchParams.set(key,String(value))
    if(page>1)url.searchParams.set('page',String(page))
    const link=document.createElement('a');link.className='ro-button';link.href=url.pathname+url.search;link.textContent=label
    link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();current.page=page;apply(true,true)})
    return link
  }
  async function apply(updateUrl=false,scroll=false) {
    const id=++requestId
    controls();status.textContent=tr('Preparing search…','正在准备搜索…');results.setAttribute('aria-busy','true')
    try {
      const rows=await loadCatalog();if(id!==requestId)return
      const matched=filterCatalog(rows,current,getSearchTerms(current.q)),pages=Math.max(1,Math.ceil(matched.length/16))
      current.page=Math.min(current.page,pages)
      const grid=document.createElement('div');grid.className='ro-grid'
      for(const row of matched.slice((current.page-1)*16,current.page*16))grid.append(card(row))
      if(!matched.length){const empty=document.createElement('div');empty.className='ro-empty';empty.textContent=tr('No matching skills. Try a shorter query or reset filters.','没有匹配的技能。请缩短关键词或重置筛选。');grid.append(empty)}
      results.replaceChildren(grid);count.textContent=matched.length.toLocaleString()+' Skills'
      pagination.replaceChildren()
      if(current.page>1)pagination.append(pageLink(tr('Previous','上一页'),current.page-1))
      const marker=document.createElement('span');marker.textContent=`${current.page} / ${pages}`;pagination.append(marker)
      if(current.page<pages)pagination.append(pageLink(tr('Next','下一页'),current.page+1))
      status.textContent=tr(`Published catalog captured ${manifest.capturedAt.slice(0,10)}. Search is complete.`,`公开目录记录日期 ${manifest.capturedAt.slice(0,10)}，搜索完成。`)
      if(updateUrl) {
        const url=new URL(path('/skills'),location.origin)
        for(const [key,value] of Object.entries(current))if(value&&value!=='all'&&!(key==='sort'&&value==='quality')&&!(key==='page'&&value===1))url.searchParams.set(key,String(value))
        history.pushState(null,'',url.pathname+url.search)
      }
      if(scroll)results.scrollIntoView({block:'start'})
    } catch {if(id===requestId)status.textContent=tr('Search directory could not load. Retry Search; browsing and page links remain available.','搜索目录未能加载。请点击“搜索”重试；仍可使用现有分页浏览。')}
    finally {if(id===requestId)results.removeAttribute('aria-busy')}
  }
  form.addEventListener('submit',event=>{event.preventDefault();current.q=query.value.slice(0,160);current.page=1;apply(true)})
  sort.addEventListener('change',()=>{current.sort=sort.value;current.page=1;apply(true)})
  examples.addEventListener('change',()=>{current.examples=examples.checked;current.page=1;apply(true)})
  directory.querySelectorAll('input[name=access]').forEach(input=>input.addEventListener('change',()=>{current.access=input.value;current.page=1;apply(true)}))
  directory.querySelectorAll('[data-category]').forEach(link=>link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return
    event.preventDefault();current.category=link.dataset.category;current.page=1;apply(true)
  }))
  document.getElementById('ro-reset').addEventListener('click',event=>{event.preventDefault();current=readState(new URL(path('/skills'),location.origin));apply(true)})
  addEventListener('popstate',()=>{current=readState(new URL(location.href));apply()})
  controls()
  if(location.search)apply()
}
