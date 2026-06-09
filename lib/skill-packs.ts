import type { SkillRecord } from '@/lib/db/skills'
import { getSkillQualityProfile } from '@/lib/quality'

export interface SkillPackDefinition {
  slug: string
  shortTitle: string
  title: string
  eyebrow: string
  description: string
  persona: string
  keywords: string[]
  outcomes: string[]
  workflowSteps: Array<{
    title: string
    description: string
  }>
  bestFor: string[]
  avoidWhen: string[]
}

export const SKILL_PACKS: SkillPackDefinition[] = [
  {
    slug: 'frontend-engineer-agent-pack',
    shortTitle: 'Frontend engineer',
    title: 'Frontend engineer agent pack',
    eyebrow: 'Build, inspect, and verify UI work',
    description:
      'A practical pack for agents working on React, Next.js, design systems, component quality, browser QA, and frontend regression checks.',
    persona: 'Frontend engineers and product teams using agents to ship UI changes faster.',
    keywords: ['frontend', 'react', 'next', 'next.js', 'ui', 'component', 'css', 'browser', 'playwright', 'testing', 'design'],
    outcomes: ['Map the frontend stack', 'Patch components', 'Check responsive states', 'Verify browser flows'],
    workflowSteps: [
      { title: 'Inspect', description: 'Identify framework, routes, components, styling system, and test commands.' },
      { title: 'Patch', description: 'Apply scoped UI changes that match the existing design language.' },
      { title: 'Verify', description: 'Run lint/build checks plus desktop and mobile browser smoke tests.' },
      { title: 'Document', description: 'Summarize changed surfaces, residual risks, and follow-up test gaps.' },
    ],
    bestFor: ['React apps', 'Next.js products', 'Design system cleanup', 'Mobile responsive QA'],
    avoidWhen: ['The agent cannot run the app locally', 'The task needs private design files that are unavailable'],
  },
  {
    slug: 'seo-automation-agent-pack',
    shortTitle: 'SEO automation',
    title: 'SEO automation agent pack',
    eyebrow: 'Programmatic SEO and publishing workflows',
    description:
      'A pack for agents that turn indexed skills into SEO pages, comparison pages, social drafts, and content update workflows.',
    persona: 'Growth teams, directory founders, and indie builders growing organic traffic.',
    keywords: ['seo', 'content', 'blog', 'search', 'keyword', 'marketing', 'growth', 'social', 'twitter', 'x', 'newsletter'],
    outcomes: ['Find page opportunities', 'Generate structured briefs', 'Create internal links', 'Prepare social drafts'],
    workflowSteps: [
      { title: 'Discover', description: 'Find high-intent keywords, comparison angles, and category pages.' },
      { title: 'Draft', description: 'Create pages with clear titles, canonical URLs, schema, and internal links.' },
      { title: 'Distribute', description: 'Turn each useful skill into scenario-led posts and newsletter segments.' },
      { title: 'Measure', description: 'Track clicks, saves, installs, and indexed pages to guide the next batch.' },
    ],
    bestFor: ['Directory SEO', 'Comparison pages', 'Daily skill updates', 'Newsletter and X drafts'],
    avoidWhen: ['The content has no concrete user scenario', 'Pages are generated without quality filtering'],
  },
  {
    slug: 'data-analyst-agent-pack',
    shortTitle: 'Data analyst',
    title: 'Data analyst agent pack',
    eyebrow: 'Collect, clean, analyze, and report',
    description:
      'A pack for agents that work with spreadsheets, SQL, datasets, reports, charts, and evidence-backed analysis.',
    persona: 'Analysts and operators who want agents to turn messy data into decisions.',
    keywords: ['data', 'analysis', 'csv', 'spreadsheet', 'excel', 'sql', 'postgres', 'database', 'chart', 'visualization', 'report'],
    outcomes: ['Ingest data', 'Clean columns', 'Run analysis', 'Create a report'],
    workflowSteps: [
      { title: 'Ingest', description: 'Load files, tables, or database outputs with source metadata preserved.' },
      { title: 'Clean', description: 'Normalize fields, remove duplicates, and identify missing values.' },
      { title: 'Analyze', description: 'Compute trends, segments, and anomalies with reproducible logic.' },
      { title: 'Explain', description: 'Return charts, tables, and a concise decision-oriented summary.' },
    ],
    bestFor: ['CSV analysis', 'SQL workflows', 'Metric reviews', 'Research tables'],
    avoidWhen: ['The data contains regulated private information without controls', 'The agent cannot verify calculations'],
  },
  {
    slug: 'startup-founder-agent-pack',
    shortTitle: 'Startup founder',
    title: 'Startup founder agent pack',
    eyebrow: 'Research, positioning, growth, and ops',
    description:
      'A pack for founders using agents to research competitors, sharpen positioning, draft launches, inspect pricing, and automate repeated operating work.',
    persona: 'Early-stage founders who need leverage without adding process overhead.',
    keywords: ['startup', 'founder', 'research', 'market', 'competitor', 'pricing', 'growth', 'product', 'customer', 'pitch', 'strategy'],
    outcomes: ['Map competitors', 'Find growth angles', 'Draft launch assets', 'Automate weekly work'],
    workflowSteps: [
      { title: 'Research', description: 'Collect market, competitor, and user evidence with links.' },
      { title: 'Position', description: 'Turn evidence into sharper product messaging and comparison angles.' },
      { title: 'Launch', description: 'Prepare landing copy, X drafts, Product Hunt notes, and update posts.' },
      { title: 'Operate', description: 'Repeat weekly reports, feedback summaries, and priority reviews.' },
    ],
    bestFor: ['Market research', 'Launch preparation', 'Product positioning', 'Founder operating cadence'],
    avoidWhen: ['You need validated customer evidence but have not talked to users', 'The agent cannot access source material'],
  },
  {
    slug: 'supabase-vercel-stripe-builder-pack',
    shortTitle: 'SaaS builder',
    title: 'Supabase, Vercel, and Stripe builder pack',
    eyebrow: 'Ship full-stack SaaS workflows',
    description:
      'A pack for agents building SaaS products with database auth, deployments, payments, webhooks, and production checks.',
    persona: 'Builders creating hosted web products with Supabase, Vercel, Stripe, and Next.js.',
    keywords: ['supabase', 'vercel', 'stripe', 'next', 'next.js', 'postgres', 'database', 'auth', 'payment', 'billing', 'webhook', 'deployment'],
    outcomes: ['Design data flows', 'Deploy safely', 'Wire payments', 'Check production readiness'],
    workflowSteps: [
      { title: 'Model', description: 'Design database tables, auth policies, and server boundaries.' },
      { title: 'Build', description: 'Implement product flows with clear environment variables and typed APIs.' },
      { title: 'Bill', description: 'Add subscriptions, checkout, webhooks, and lifecycle handling.' },
      { title: 'Deploy', description: 'Verify build output, production URLs, logs, and mobile-critical flows.' },
    ],
    bestFor: ['Next.js SaaS apps', 'Supabase backends', 'Stripe billing', 'Vercel deployment workflows'],
    avoidWhen: ['Secrets are not available in a secure environment', 'Payment changes cannot be tested safely'],
  },
]

function searchableSkillText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function getSkillPackBySlug(slug: string) {
  return SKILL_PACKS.find((pack) => pack.slug === slug)
}

export function scoreSkillForPack(skill: SkillRecord, pack: SkillPackDefinition) {
  const text = searchableSkillText(skill)
  let score = 0

  for (const keyword of pack.keywords) {
    const normalized = keyword.toLowerCase()
    if (text.includes(normalized)) score += normalized.includes(' ') ? 7 : 4
  }

  const quality = getSkillQualityProfile(skill)
  score += quality.score / 12
  score += Math.min(8, Math.log10(Math.max(1, skill.github_stars || 0)) * 1.8)
  if (skill.verified) score += 3
  if (skill.install_command || skill.github_repo) score += 2

  return score
}

export function selectSkillsForPack(skills: SkillRecord[], pack: SkillPackDefinition, limit = 10) {
  return skills
    .map((skill) => ({ skill, score: scoreSkillForPack(skill, pack) }))
    .filter((item) => item.score >= 10)
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, limit)
    .map((item) => item.skill)
}
