import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { buildXEditorialCopy, getXEditorialFormat, getXTextLength } from '../lib/x/editorial.ts'

function compile(path, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  new Function('exports', 'require', code)(exports, name => {
    assert.ok(name in dependencies, `Missing dependency: ${name}`)
    return dependencies[name]
  })
  return exports
}

const likeness = compile('lib/skill-likeness.ts', {})
const candidates = compile('lib/x/candidates.ts', { '@/lib/skill-likeness': likeness })
const attribution = compile('lib/x/attribution.ts', {})
const editorial = { buildXEditorialCopy, getXEditorialFormat, getXTextLength, X_EDITORIAL_VERSION: 2 }
const shortlist = compile('lib/x/shortlist.ts', {
  '@/lib/db/skills': {}, '@/lib/x/candidates': candidates, '@/lib/x/attribution': attribution,
  '@/lib/x/editorial': editorial, '@/lib/skill-likeness': likeness,
  '@/lib/skills/source-evidence': compile('lib/skills/source-evidence.ts', {}),
  '@/lib/install-targets': { getPrimaryInstallCommand: skill => skill.install_command || '' },
  '@/lib/quality': { getSkillQualityProfile: skill => ({ score: skill.quality_score }), formatCompactNumber: String },
})

function skill(slug, overrides = {}) {
  return {
    slug, id: slug, name: slug, description: 'Agent skill for code review and verification of a git diff.',
    github_repo: `author/${slug}`, repository: `https://github.com/author/${slug}`,
    category: 'coding-agents', tags: ['agent-skill'], frameworks: [], github_stars: 500,
    quality_score: 80, ai_review_approved: true, verified: false,
    created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
    install_command: `npx skills add author/${slug} --skill ${slug}`, ...overrides,
  }
}
const review = skill('code-review', { name: 'Code Review', description: 'Review a branch or diff against repository standards and the originating spec in two independent analysis passes.' })
assert.equal(shortlist.getXShortlistRole(review, 'coding'), 'Review', 'A spec reference must not turn code review into planning')
for (const [description, lane] of [
  ['Academic research skills for Claude Code: research, write, review, revise.', 'research'],
  ['Marketing skills for Claude Code and Codex: SEO and newsletters.', 'growth'],
  ['Skill for HTML slide decks, also works with Codex.', 'presentation'],
  ['Agent skill for code review of a git diff.', 'coding'],
]) assert.equal(candidates.getXContentLane(skill('topic', { category: 'agent-skills', description })), lane)
assert.equal(candidates.isGoodXCandidate(skill('unreviewed', { ai_review_approved: false }), 50), false)
assert.equal(candidates.getXContentLane(skill('last30days', {
  name: 'Last30days Skill', description: 'Research the last 30 days across Reddit, X and the web.',
  long_description: 'Can analyze financial markets and stock portfolios.', category: 'research',
})), 'research', 'A secondary use case must not override the stated task')
assert.equal(candidates.getXContentLane(skill('khoj', {
  description: 'Get answers from your docs and do deep research.', tags: ['image-generation'],
})), 'research', 'An image tag must not override the research purpose')
assert.equal(candidates.getXContentLane(skill('design-portfolio', {
  description: 'Design a portfolio website with good typography.',
})), 'creative', 'A design portfolio is not a financial portfolio')
const sourcePreferred = shortlist.buildXShortlist('coding', [
  skill('generic-tool', { github_stars: 100000, quality_score: 100 }),
  skill('specific-skill', { github_stars: 50, quality_score: 60, source_path: 'SKILL.md' }),
], { edition: '2026-10-02' })
assert.equal(sourcePreferred.picks[0].skill.slug, 'specific-skill', 'Recorded Skill instructions outrank an untracked high-star tool')

const pool = [review, skill('tests'), skill('debugging'), skill('planning'), skill('release'),
  skill('duplicate', { github_repo: 'AUTHOR/code-review' }),
  skill('paper-writing', { description: 'Academic research skills for Claude Code.', category: 'research' }),
  skill('unreviewed', { ai_review_approved: false })]
const selected = shortlist.buildXShortlist('coding', pool, { edition: '2026-10-02' })
assert.equal(selected.picks.length, 5)
assert.equal(new Set(selected.picks.map(pick => pick.skill.github_repo.toLowerCase())).size, 5)
assert.ok(selected.picks.every(pick => !['paper-writing', 'unreviewed', 'duplicate'].includes(pick.skill.slug)))
assert.match(selected.picks.find(pick => pick.skill.slug === 'code-review').reason, /two independent analysis passes/)
assert.doesNotMatch(selected.config.title, /\b5\b/, 'Landing titles cannot claim a fixed count')

const picks = pool.slice(0, 5).map(record => ({ slug: record.slug, name: record.name,
  description: record.description, githubRepo: record.github_repo, installCommand: record.install_command }))
const url = 'https://www.openagentskill.com/shortlists/coding?utm_content=' + 'tracking'.repeat(30)
for (const format of ['skill_spotlight_v2', 'task_shortlist_v2']) {
  const copy = buildXEditorialCopy({ lane: 'coding', edition: '2026-10-02', picks, url, format })
  assert.ok(getXTextLength(copy.mainText) <= 280)
  assert.ok(getXTextLength(copy.replyText) <= 280)
  assert.doesNotMatch(copy.mainText, /https?:|audit scores|\b5 (skills|picks)\b|I tested|saved.*hours/)
  assert.ok(copy.replyText.includes(url), 'Attribution URL is kept intact')
  if (format === 'skill_spotlight_v2') {
    assert.deepEqual(copy.featuredSlugs, ['code-review'])
    assert.match(copy.mainText, /Try: Review this diff/)
    assert.ok(copy.replyText.includes(picks[0].installCommand), 'Exact --skill selector is kept')
  } else {
    assert.equal(copy.featuredSlugs.length, 3)
    assert.match(copy.mainText, /^3 picks/)
    assert.equal((copy.mainText.match(/^\d\. /gm) || []).length, 3, 'Count equals visible list entries')
    for (const pick of picks.slice(0, 3)) assert.ok(copy.replyText.includes(`https://github.com/${pick.githubRepo}`))
  }
}
assert.notEqual(getXEditorialFormat('coding', '2026-10-02'), getXEditorialFormat('coding', '2026-10-03'))
assert.equal(getXTextLength('中文'), 4)
assert.equal(getXTextLength('😀'), 2)
assert.equal(getXTextLength(url), 23)
const longPick = { ...picks[0], name: '中😀'.repeat(60), description: '源文档分析与检查 '.repeat(80), installCommand: 'npx skills add author/' + 'x'.repeat(400) }
const long = buildXEditorialCopy({ lane: 'coding', edition: '2026-10-02', picks: [longPick], url })
assert.ok(getXTextLength(long.mainText) <= 280)
assert.doesNotMatch(long.replyText, /npx|Install:/, 'An oversized command is omitted, never truncated')
assert.equal(buildXEditorialCopy({ lane: 'coding', edition: '2026-10-02', picks: [], url }), null)
const noCommand = buildXEditorialCopy({ lane: 'coding', edition: '2026-10-02', picks: [{ ...picks[0], installCommand: '' }], url })
assert.doesNotMatch(noCommand.replyText, /npx|Install:/, 'No fabricated installation fallback')

let failRead = false, claimDuringRefresh = false, writes = 0
const rows = [
  { id: 'old', source: 'editorial_shortlist_generator', status: 'queued', campaign: 'custom-campaign', metadata: { lane: 'coding', edition: '2026-10-02', skills: pool.slice(0, 5).map(({ slug }) => ({ slug })), tracking_code: 'original-code', experiment_id: 'original-experiment' } },
  { id: 'posted', source: 'editorial_shortlist_generator', status: 'posted', metadata: {} },
  { id: 'manual', source: 'owner', status: 'queued', metadata: {} },
]
const admin = { from(table) {
  const filters = []; let update
  const query = {
    select() { return query }, order() { return query }, limit() { return query }, or() { return query },
    in() { return query }, eq(key, value) { filters.push([key, value]); return query },
    update(value) { update = value; return query },
    then(resolve, reject) {
      if (table === 'skills') return Promise.resolve({ data: failRead ? null : pool, error: failRead ? new Error('database unavailable') : null }).then(resolve, reject)
      if (claimDuringRefresh && update) rows[0].status = 'posting'
      const matches = rows.filter(row => filters.every(([key, value]) => row[key] === value))
      if (update) { writes += matches.length; for (const row of matches) Object.assign(row, update) }
      return Promise.resolve({ data: matches, error: null }).then(resolve, reject)
    },
  }
  return query
} }
const growth = compile('lib/x/growth.ts', {
  '@/lib/audits': {}, '@/lib/db/skills': {}, '@/lib/supabase/admin': { createAdminClient: () => admin },
  '@/lib/supabase/public': {}, '@/lib/x/client': {}, '@/lib/trust': {}, '@/lib/x/oauth': {},
  '@/lib/x/poster': {}, '@/lib/x/candidates': candidates, '@/lib/x/shortlist': shortlist,
  '@/lib/x/attribution': attribution, '@/lib/x/editorial': editorial,
  '@/lib/skills/publication': { PUBLIC_SKILL_FILTER: 'ai_review_approved.eq.true' },
})
failRead = true
await assert.rejects(growth.refreshQueuedXEditorialContent(), /database unavailable/)
assert.equal(writes, 0, 'An outage cannot retire or rewrite queue drafts')
failRead = false; claimDuringRefresh = true
assert.equal(await growth.refreshQueuedXEditorialContent(), 0)
assert.equal(writes, 0, 'A concurrently claimed draft must not be changed')
rows[0].status = 'queued'; claimDuringRefresh = false
assert.equal(await growth.refreshQueuedXEditorialContent(), 1)
assert.equal(rows[0].metadata.editorial_version, 2)
assert.equal(rows[0].metadata.skills.length, rows[0].metadata.content_format === 'skill_spotlight_v2' ? 1 : 3)
assert.match(rows[0].reply_text, /utm_campaign=custom-campaign/)
assert.match(rows[0].reply_text, /utm_content=original-code/)
assert.equal(await growth.refreshQueuedXEditorialContent(), 0, 'A refreshed draft is not rebuilt on every run')
assert.equal(rows[1].status, 'posted')
assert.equal(rows[2].post_text, undefined)
delete rows[0].metadata.editorial_version
rows[0].metadata.experiment_id = 'x-feedback-loop-v1'
assert.equal(await growth.refreshQueuedXEditorialContent(), 1)
assert.equal(rows[0].metadata.experiment_id, 'x-feedback-loop-v2')
assert.equal(rows[0].metadata.previous_experiment_id, 'x-feedback-loop-v1')

const reportTables = {
  x_content_queue: [
    { id: 'q1', content_type: 'weekly_thread', created_at: '2026-09-01T16:00:00Z', metadata: { experiment_started_at: '2026-10-02T16:00:00Z', experiment_id: 'x-feedback-loop-v2', content_format: 'skill_spotlight_v2', lane: 'coding', experiment_topic: 'coding-1', tracking_code: 'c1' } },
    { id: 'q2', content_type: 'weekly_thread', created_at: '2026-10-02T16:01:00Z', metadata: { experiment_id: 'x-feedback-loop-v2', content_format: 'task_shortlist_v2', lane: 'creative', experiment_topic: 'creative-1', tracking_code: 'c2' } },
  ],
  x_post_history: [
    { queue_item_id: 'q1', x_post_id: 'p1', posted_at: '2026-10-02T16:02:00Z', metadata: { post_role: 'main' } },
    { queue_item_id: 'q2', x_post_id: 'p2', posted_at: '2026-10-02T16:03:00Z', metadata: { post_role: 'main' } },
    { queue_item_id: 'q1', x_post_id: 'reply1', posted_at: '2026-10-02T16:03:00Z', metadata: { post_role: 'thread_follow_up' } },
  ],
  x_post_metrics: [{ x_post_id: 'p1', captured_at: '2026-10-02T16:04:00Z', impression_count: 100, like_count: 2, bookmark_count: 1 }],
  skill_events: [{ skill_slug: 'code-review', event_type: 'install_copy', session_id: 's1', created_at: '2026-10-02T16:04:00Z', metadata: { attribution: { experiment_id: 'x-feedback-loop-v2', content: 'c1' } } }],
}
const report = compile('lib/x/report.ts', {
  'server-only': {}, '@/lib/x/attribution': attribution,
  '@/lib/supabase/admin': { createAdminClient: () => ({ from(table) {
    const query = { select() { return query }, eq() { return query }, gte() { return query },
      limit: async () => ({ data: reportTables[table], error: null }) }
    return query
  } }) },
})
const feedback = await report.getXGrowthReport()
assert.equal(feedback.startedAt, '2026-10-02T16:00:00.000Z', 'Refreshing an old draft starts the new experiment today')
assert.equal(feedback.summary.posts, 2, 'Replies must not count as separate editorial trials')
assert.equal(feedback.summary.measuredPosts, 1, 'Missing metrics are not measured zeroes')
assert.equal(feedback.summary.medianImpressions, 100)
assert.equal(feedback.formats.find(group => group.format === 'skill_spotlight_v2').installCopies, 1)
assert.equal(feedback.formats.find(group => group.format === 'task_shortlist_v2').measuredPosts, 0)
console.log('X editorial: useful copy, accurate counts, weighted limits, source attribution, topical selection, exact installs and safe draft refresh passed.')
