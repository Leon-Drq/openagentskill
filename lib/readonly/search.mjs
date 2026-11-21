export function normalizeQuery(query) {
  return String(query||'').normalize('NFKC').trim().toLowerCase().slice(0,160)
}
export function searchable(row) {
  return [row.name,row.slug,row.description,row.author,row.repository,...row.tags].join(' ').normalize('NFKC').toLowerCase().slice(0,5000)
}
export function filterCatalog(rows,state,terms) {
  const query=normalizeQuery(state.q),tokens=(terms||[query]).map(normalizeQuery).filter(Boolean)
  const match=[]
  for(const row of rows) {
    if(state.category&&state.category!=='all'&&row.category!==state.category)continue
    if(state.access&&state.access!=='all'&&row.price!==state.access)continue
    if(state.examples&&!(row.exampleCount>0))continue
    const haystack=row.search||searchable(row)
    if(query&&!haystack.includes(query)&&!tokens.some(token=>haystack.includes(token)))continue
    const exact=query&&(row.slug.toLowerCase()===query||row.name.toLowerCase()===query||row.repository.toLowerCase()===query)
    match.push({row,exact})
  }
  const metric=row=>state.sort==='stars'?row.stars:state.sort==='downloads'?row.downloads:state.sort==='new'?Date.parse(row.created)||0:state.sort==='fresh'?Date.parse(row.updated)||0:row.quality
  match.sort((a,b)=>Number(Boolean(b.exact))-Number(Boolean(a.exact))||(metric(b.row)||0)-(metric(a.row)||0)||a.row.slug.localeCompare(b.row.slug))
  return match.map(item=>item.row)
}
export function readState(url) {
  const q=url.searchParams
  const rawPage=q.get('page')||url.pathname.match(/\/skills\/page\/(\d+)\/?$/)?.[1]||'1'
  return {q:(q.get('q')||'').slice(0,160),category:(q.get('category')||'all').slice(0,80),access:q.get('access')||q.get('pricing')||'all',
    examples:['true','1'].includes(q.get('examples')),sort:['quality','stars','downloads','new','fresh'].includes(q.get('sort'))?q.get('sort'):'quality',
    page:/^\d{1,6}$/.test(rawPage)?Math.max(1,Number(rawPage)):1}
}
