export {DOQueueHandler} from './paused-worker.mjs'
const message=(zh)=>`<!doctype html><html lang="${zh?'zh-CN':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenAgentSkill</title><body style="margin:0;background:#f8f7f3;color:#171717;font:16px/1.8 system-ui;padding:48px 24px"><main style="max-width:720px;margin:auto"><p>OpenAgentSkill</p><h1 style="font:400 40px Georgia,serif">${zh?'此功能暂未开放':'This feature is temporarily unavailable'}</h1><p>${zh?'目录、搜索、案例和固定榜单已开放。账户、支付及提交服务仍然关闭；部分归档页面稍后开放。':'The catalog, search, examples and fixed rankings are open. Accounts, checkout and submissions remain closed; some archive pages are not available yet.'}</p><p><a href="${zh?'/zh/skills':'/skills'}">${zh?'浏览技能目录':'Browse skills'}</a> · <a href="${zh?'/zh/showcase':'/showcase'}">${zh?'查看效果案例':'See examples'}</a></p></main></body></html>`
export function readonlyResponse(request) {
  const url=new URL(request.url),zh=/^\/zh(?:\/|$)/.test(url.pathname)
  const headers={'Cache-Control':'no-store','Retry-After':'3600','X-OAS-Mode':'readonly','X-OAS-Dynamic-Fallback':'1','X-Content-Type-Options':'nosniff'}
  const api=/^\/(?:en\/|zh\/|ja\/|ko\/|es\/|de\/|fr\/|id\/)?(?:api|auth)(?:\/|$)/.test(url.pathname)
  if(api||!['GET','HEAD'].includes(request.method))return new Response(request.method==='HEAD'?null:JSON.stringify({error:'feature_temporarily_unavailable',mode:'readonly',retryAfter:3600}),{status:503,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}})
  // Keep old locale URLs useful without inventing translations or re-running Next.
  // A pathname assignment preserves the origin even for a double slash in input.
  if(/^\/(?:en|ja|ko|es|de|fr|id)(?:\/|$)/.test(url.pathname)) {
    url.pathname=url.pathname.replace(/^\/(?:en|ja|ko|es|de|fr|id)(?=\/|$)/,'')||'/'
    return new Response(null,{status:302,headers:{...headers,Location:url.href}})
  }
  return new Response(request.method==='HEAD'?null:message(zh),{status:503,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}})
}
export default {fetch:readonlyResponse,async scheduled(){}}
