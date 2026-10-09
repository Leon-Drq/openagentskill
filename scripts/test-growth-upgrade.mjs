import assert from 'node:assert/strict'
import { GROWTH_ATTRIBUTION_KEY, GROWTH_SESSION_MS, analyticsPath, analyticsPageType, inferGrowthAttribution, readGrowthSession } from '../lib/growth-attribution.ts'
import { trackAnalyticsEvent, trackAnalyticsPageView, updateAnalyticsConsent } from '../lib/analytics.ts'
import { SKILL_GROWTH_PROFILES, getSkillGrowthProfile, growthProfileSource } from '../lib/seo/skill-growth-profiles.ts'

const origin = 'https://www.openagentskill.com'
assert.equal(inferGrowthAttribution(origin + '/skills/a?utm_source=chatgpt.com&task=private#receipt=secret', '').acquisition_source, 'chatgpt')
assert.equal(inferGrowthAttribution(origin + '/skills/a', 'https://www.google.com/search?q=private').acquisition_channel, 'organic_search')
assert.equal(inferGrowthAttribution(origin, 'https://www.perplexity.ai/search/private').acquisition_source, 'perplexity')
assert.equal(inferGrowthAttribution(origin, 'https://chatgpt.com.evil.example').acquisition_source, 'referral')
assert.equal(inferGrowthAttribution(origin + '?utm_source=private-token', '').acquisition_source, 'campaign')
assert.equal(inferGrowthAttribution(origin + '/skills/a', origin + '/best/presentation-generation').acquisition_source, 'direct')
assert.equal(analyticsPath('/resolve?task=secret#fragment'), '/resolve')
assert.equal(analyticsPath('/zh/profile/private-user?key=secret'), '/private')
assert.equal(analyticsPageType('/zh/skills/a'), 'skill_detail')
assert.equal(analyticsPageType('/best/presentation-generation'), 'topic')
assert.equal(readGrowthSession('{broken', Date.now()), null)
assert.equal(readGrowthSession(JSON.stringify({lastSeen: Date.now(), activated: false, attribution: {acquisition_channel:'direct',acquisition_source:'direct',landing_path:'/skills?token=secret'}}), Date.now()), null)

const memory = () => { const data = new Map(); return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) } }
const calls = []
globalThis.window = { location: new URL(origin + '/skills/tt-a1i-archify?utm_source=chatgpt.com&task=private#receipt=secret'), localStorage: memory(), sessionStorage: memory(), gtag: (...args) => calls.push(args) }
globalThis.document = { referrer: 'https://chatgpt.com/c/private-conversation', title: 'Archify' }
trackAnalyticsPageView(window.location.href)
trackAnalyticsEvent('skill_install_copy')
assert.equal(calls.length, 0, 'No analytics events before consent')
assert.equal(window.sessionStorage.getItem(GROWTH_ATTRIBUTION_KEY), null)
updateAnalyticsConsent('granted')
trackAnalyticsPageView(window.location.href)
window.location = new URL(origin + '/skills/next?task=private')
trackAnalyticsEvent('resolve_copy', { asset: 'api_url' })
assert.equal(calls.filter(c => c[1] === 'growth_activation').length, 0, 'Copying an API URL is not usage activation')
trackAnalyticsEvent('skill_install_copy', { target: 'codex' })
trackAnalyticsEvent('showcase_task_copy')
assert.equal(calls.filter(c => c[1] === 'growth_activation').length, 1, 'Activation is deduplicated within the tab session')
const activation = calls.find(c => c[1] === 'growth_activation')[2]
assert.equal(activation.acquisition_source, 'chatgpt')
assert.equal(activation.landing_path, '/skills/tt-a1i-archify', 'Attribution survives internal navigation')
assert.doesNotMatch(JSON.stringify(calls), /private|receipt=|utm_source|task=/, 'URLs are stripped of sensitive queries and fragments')
assert.doesNotMatch(window.sessionStorage.getItem(GROWTH_ATTRIBUTION_KEY), /private|receipt=|utm_source|task=/)
const beforeExpiry = Date.now
Date.now = () => beforeExpiry() + GROWTH_SESSION_MS + 1
trackAnalyticsEvent('skill_install_copy')
Date.now = beforeExpiry
assert.equal(calls.filter(c => c[1] === 'growth_activation').length, 2, 'An expired session can activate again')
updateAnalyticsConsent('denied')
const count = calls.length
trackAnalyticsEvent('skill_install_copy')
trackAnalyticsPageView('/skills')
assert.equal(calls.length, count)
assert.equal(window.sessionStorage.getItem(GROWTH_ATTRIBUTION_KEY), null)
window.sessionStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') }, removeItem() { throw Error('blocked') } }
updateAnalyticsConsent('granted')
trackAnalyticsEvent('skill_install_copy')
trackAnalyticsEvent('skill_install_copy')
assert.equal(calls.filter(c => c[1] === 'growth_activation').length, 3, 'Storage failure retains in-memory deduplication')

assert.equal(SKILL_GROWTH_PROFILES.length, 17)
assert.equal(new Set(SKILL_GROWTH_PROFILES.map(p => p.slug)).size, 17)
for (const p of SKILL_GROWTH_PROFILES) {
  assert.match(p.commit, /^[a-f0-9]{40}$/)
  assert.equal(getSkillGrowthProfile({slug:p.slug,github_repo:p.repository,source_path:p.path}), p)
  assert.equal(getSkillGrowthProfile({slug:p.slug,github_repo:'unrelated/repository'}), undefined)
  assert.equal(getSkillGrowthProfile({slug:p.slug,github_repo:p.repository,source_path:'different/SKILL.md'}), undefined)
  assert.equal(getSkillGrowthProfile({slug:p.slug,github_repo:p.repository}, 'zh'), undefined, 'Do not replace translated content with English')
  assert.match(growthProfileSource(p), /^https:\/\/github\.com\//)
  assert.ok(p.summary && p.setup && p.limitation)
}
console.log('Growth upgrade: channel classification, consent, private URL redaction, activation deduplication, expiry, storage failures and 17 source-bound editorial profiles passed.')
