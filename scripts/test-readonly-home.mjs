import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {buildReadonlyHome} from '../lib/readonly/home-build.mjs'
const root='.readonly-build/home-check'
await fs.mkdir(root,{recursive:true})
const {render,css}=await buildReadonlyHome(root)
const fixture=[{slug:'public-skill',name:'Public skill',description:'A published skill',repository:'owner/repo',author:'Owner',category:'development',stars:123,downloads:0}]
for(const locale of ['en','zh']) {
  const html=render.homeBody(locale,fixture,fixture,'2026-11-21T11:38:52.175Z')
  assert.equal((html.match(/<h1\b/g)||[]).length,1)
  assert.equal((html.match(/<header\b/g)||[]).length,1)
  assert.equal((html.match(/<footer\b/g)||[]).length,1)
  assert.match(html,/hero-task-query/)
  assert.match(html,new RegExp(`action="${locale==='zh'?'/zh':''}/skills"`))
  assert.match(html,/name="q"/)
  assert.ok(!html.includes('/_next/'),'Do not restore the Next runtime or image service')
  assert.ok(!html.includes('<script'),'No React hydration, authentication, or tracking bundle')
  assert.match(html,/id="home-showcase-title"/)
  assert.match(html,/id="home-discovery-title"/)
  assert.match(html,/id="home-creators-heading"/)
  assert.match(html,/id="home-directories"/)
  assert.ok(html.indexOf('home-showcase-title')<html.indexOf('home-discovery-title'))
  assert.ok(html.indexOf('home-discovery-title')<html.indexOf('home-creators-heading'))
  assert.ok(html.includes('launchbuff.com/badge-featured-dark.svg'))
  assert.ok(html.includes('/skills/public-skill'))
  assert.ok(html.includes('aria-disabled="true"'),'Unavailable services must not look active')
  const submitButtons=[...html.matchAll(/<button\b[^>]*>/g)].map(match=>match[0]).filter(tag=>tag.includes('type="submit"'))
  assert.equal(submitButtons.length,1)
  assert.ok(!/\sdisabled(?:=|\s|>)/.test(submitButtons[0]),'A static search form must work without hydration')
  assert.ok(!html.includes('ro-hero'),'Do not replace the original homepage with the reader redesign')
  assert.ok(html.includes(locale==='zh'?'AI Agent 的':'The skill layer'))
}
assert.ok(css.includes('5.6rem'),'Preserve the original large display heading utility')
assert.ok(css.includes('18px'),'Preserve the existing design tokens')
console.log('Original home composition, static search, honest paused services and offline runtime isolation passed.')
