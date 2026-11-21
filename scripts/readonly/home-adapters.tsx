/* Build-time adapters only. They never ship React, Next, auth or telemetry clients. */
/* eslint-disable @next/next/no-img-element -- Existing optimized media uses ordinary static files. */
import React, {type ComponentProps, type CSSProperties} from 'react'
import {Globe, Github, Menu, X} from 'lucide-react'
import {useI18n} from '@/lib/i18n/context'
import {getLocalizedNavigationHref} from '@/lib/i18n/market-routing'
import {HEADER_NAVIGATION, navigationLabel, getNavigationCopy} from '@/lib/site-navigation'
import {getShowcaseNavLabel} from '@/lib/i18n/showcase-label'
import {BrandMark} from '@/components/brand-mark'
import styles from '@/components/site-header.module.css'

export const useRouter=()=>({prefetch(){},push(){},replace(){}})
export const usePathname=()=>'/'
export const useSearchParams=()=>new URLSearchParams()
export const useLinkStatus=()=>({pending:false})
export function StaticLink({href,prefetch: _prefetch,replace: _replace,scroll: _scroll,...props}:ComponentProps<'a'>&{href:string;prefetch?:boolean;replace?:boolean;scroll?:boolean}) {
  void [_prefetch,_replace,_scroll]
  const route=href.replace(/^\/zh(?=\/|$)/,'').split(/[?#]/)[0]||'/'
  const creator=route.match(/^\/creators\/github\/([A-Za-z0-9-]+)$/)
  if(creator)return <a {...props} href={`https://github.com/${creator[1]}`} target="_blank" rel="noopener noreferrer"/>
  const available=/^(?:\/|\/skills(?:\/[^/]+)?|\/showcase(?:\/[^/]+)?|\/blog(?:\/[^/]+)?|\/guides(?:\/[^/]+)?|\/best(?:\/[^/]+)?|\/rankings(?:\/(?:most-starred-agent-skills|highest-quality-agent-skills|recently-updated-agent-skills))?|\/trending|\/agent-skill)$/.test(route)
  if(href.startsWith('/')&&!available)return <a {...props} role="link" aria-disabled="true" tabIndex={-1} title="Temporarily unavailable · 暂时关闭"/>
  return <a {...props} href={href}/>
}
export function StaticImage({src,alt='',fill,priority: _priority,unoptimized: _unoptimized,quality: _quality,style,...props}:Omit<ComponentProps<'img'>,'src'>&{src:string|{src:string};fill?:boolean;priority?:boolean;unoptimized?:boolean;quality?:number}) {
  void [_priority,_unoptimized,_quality]
  const fillStyle:CSSProperties=fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{}
  return <img {...props} src={typeof src==='string'?src:src.src} alt={alt} style={{...fillStyle,...style}}/>
}
export function EditorialLink({eventName: _eventName,eventData: _eventData,...props}:ComponentProps<typeof StaticLink>&{eventName?:string;eventData?:unknown}) {void [_eventName,_eventData];return <StaticLink {...props}/>}
export function CreatorMenuProfile(){return null}
export function ConnectAiInline(){return null}
export function NavUserMenu(){
  const {locale}=useI18n()
  return <div className={styles.authLinks}><button disabled className={styles.login} title={locale==='zh'?'账户服务暂时关闭':'Account services are paused'}>{locale==='zh'?'登录暂缓':'Login paused'}</button></div>
}
export function GitHubStarButton(){
  return <a href="https://github.com/Leon-Drq/openagentskill" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg text-sm font-medium text-foreground transition-colors hover:text-[#006b4f]"><Github className="h-4 w-4" aria-hidden="true"/>GitHub</a>
}
export function LanguageSwitcher({className=''}:{className?:string;showName?:boolean}){
  const {locale}=useI18n()
  return <label className={`readonly-home-language ${className}`}><Globe size={15} aria-hidden="true"/><span className="sr-only">{locale==='zh'?'语言':'Language'}</span><select data-language defaultValue={locale} aria-label={locale==='zh'?'语言':'Language'}><option value="en">EN</option><option value="zh">中文</option></select></label>
}
export function MobileNav(){
  const {locale,t}=useI18n(),href=(path:string)=>getLocalizedNavigationHref(path,locale)
  return <details className="readonly-home-mobile" data-home-mobile><summary className={styles.mobileTrigger} aria-label={locale==='zh'?'打开菜单':'Open menu'}><Menu size={20}/></summary><div className={styles.mobilePanel}><div className={styles.mobileTop}><a href={href('/')} className={styles.brand}><BrandMark className="h-7 w-7"/>OpenAgentSkill</a><button data-home-mobile-close className={styles.mobileClose} aria-label={locale==='zh'?'关闭菜单':'Close menu'}><X size={20}/></button></div><nav className={styles.mobileBody} aria-label={getNavigationCopy(locale).navigation}>{HEADER_NAVIGATION.map(section=><div key={section.id} className={styles.mobileSections}><div className={styles.mobileSectionRow}><a href={href(section.href)}>{navigationLabel(section,locale,t.nav,getShowcaseNavLabel(locale))}</a></div>{section.items&&<div className={styles.mobileContent}><ul className={styles.menuLinks}>{section.items.map(item=><li key={item.href}><a href={href(item.href)}>{navigationLabel(item,locale,t.nav,getShowcaseNavLabel(locale))}</a></li>)}</ul></div>}</div>)}</nav></div></details>
}
