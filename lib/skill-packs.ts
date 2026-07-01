import type { SkillRecord } from '@/lib/db/skills'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { getPrimaryInstallCommand, getSkillRepoRef } from '@/lib/install-targets'
import { getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'

export interface SkillPackDefinition {
  slug: string
  shortTitle: string
  title: string
  eyebrow: string
  description: string
  persona: string
  keywords: string[]
  featuredSlugs?: string[]
  outcomes: string[]
  workflowSteps: Array<{
    title: string
    description: string
  }>
  bestFor: string[]
  avoidWhen: string[]
}

export interface SkillPackInstallPlan {
  version: 'openagentskill-pack-install-plan-v1'
  generated_at: string
  pack: {
    slug: string
    title: string
    persona: string
    url: string
    api_url: string
  }
  selected_skills: Array<{
    rank: number
    slug: string
    name: string
    repository: string
    stars: number
    install_command: string
    skill_url: string
    audit_url: string
    quality_score: number
    trust_score: number
    audit_score: number
    risk_level: string
    why: string
  }>
  workflow: Array<{
    step: number
    title: string
    description: string
    suggested_skill_slug: string | null
    suggested_skill_name: string | null
  }>
  review_checklist: string[]
  outcome_feedback: {
    endpoint: string
    method: 'POST'
    required_fields: string[]
    recommended_fields: string[]
    expected_outcomes: string[]
  }
  agent_prompt: string
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
    slug: 'design-agent-pack',
    shortTitle: 'Design agent',
    title: 'Design agent skill pack',
    eyebrow: 'Motion, UI systems, and visual production',
    description:
      'A curated pack for agents that turn product direction into motion assets, design-system notes, UI components, interactive maps, and polished creative workflows.',
    persona: 'Designers, design engineers, and frontend teams using agents for visual production work.',
    keywords: [
      'design',
      'designer',
      'creative',
      'motion',
      'animation',
      'lottie',
      'gsap',
      'svg',
      'figma',
      'ui',
      'ux',
      'shadcn',
      'component',
      'design system',
      'design-md',
      'three',
      '3d',
      'dashboard',
      'map',
      'visual',
      'presentation',
    ],
    featuredSlugs: [
      'diffusionstudio-lottie',
      'greensock-gsap-skills',
      'songsummer920-dazzle-three-scope-map-skill',
      'paidax01-web-to-design-md',
      'masonjames-shadcnblocks-skill',
    ],
    outcomes: ['Extract design context', 'Generate motion assets', 'Compose UI blocks', 'Prototype visual systems'],
    workflowSteps: [
      { title: 'Extract', description: 'Turn public references, UI surfaces, or SVG assets into agent-readable design context.' },
      { title: 'Animate', description: 'Generate Lottie, GSAP, SVG, or scroll-motion directions with editable output paths.' },
      { title: 'Compose', description: 'Pick UI blocks, shadcn components, and layout primitives that match the product system.' },
      { title: 'Verify', description: 'Review license, install command, browser output, responsive states, and production risks.' },
    ],
    bestFor: ['Motion design', 'Design-system extraction', 'Shadcn/ui page generation', 'Interactive data visuals'],
    avoidWhen: ['The source assets are private and unavailable', 'The output will ship without human visual review', 'The license blocks the intended commercial use'],
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
    slug: 'presentation-agent-pack',
    shortTitle: 'Presentation agent',
    title: 'Presentation agent skill pack',
    eyebrow: 'Decks, PPTX, HTML slides, and speaker notes',
    description:
      'A practical pack for agents that turn source docs, URLs, outlines, research notes, or product briefs into editable presentations and polished slide workflows.',
    persona: 'Founders, designers, marketers, analysts, and operator teams using agents to create decks without starting from a blank slide.',
    keywords: [
      'presentation',
      'presentations',
      'ppt',
      'pptx',
      'powerpoint',
      'slides',
      'slide deck',
      'deck',
      'pitch deck',
      'html slides',
      'speaker notes',
      'visual story',
      'design',
      'notebooklm',
    ],
    featuredSlugs: [
      'hugohe3-ppt-master',
      'zarazhangrui-frontend-slides',
      'alchaincyf-huashu-design',
      'op7418-guizang-ppt-skill',
      'lewislulu-html-ppt-skill',
      'jimliu-baoyu-skills',
      'joeseesun-qiaomu-anything-to-notebooklm',
    ],
    outcomes: ['Choose deck workflow', 'Generate editable slides', 'Add visual polish', 'Export and review'],
    workflowSteps: [
      { title: 'Frame', description: 'Turn the brief, URL, PDF, or research notes into a clear presentation outline.' },
      { title: 'Generate', description: 'Pick PPTX, HTML slides, or image-first workflows based on the editing surface needed.' },
      { title: 'Polish', description: 'Improve layout, hierarchy, speaker notes, and visual consistency before export.' },
      { title: 'Verify', description: 'Check license, install path, output format, and whether the deck needs human design review.' },
    ],
    bestFor: ['Pitch decks', 'Research presentations', 'PPTX generation', 'HTML slide decks', 'Product update decks'],
    avoidWhen: [
      'The presentation contains confidential strategy without a private workflow',
      'You need legally approved investor materials without human review',
      'The skill only outputs images but downstream users need editable PPTX',
    ],
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

  if (pack.featuredSlugs?.includes(skill.slug)) score += 80

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

export function buildSkillPackInstallPlan(
  pack: SkillPackDefinition,
  skills: SkillRecord[],
  options: { baseUrl?: string; limit?: number } = {}
): SkillPackInstallPlan {
  const baseUrl = (options.baseUrl || 'https://www.openagentskill.com').replace(/\/$/, '')
  const selected = skills.slice(0, Math.max(1, options.limit || 5))
  const selectedSkills = selected.map((skill, index) => {
    const audit = buildSkillAudit(skill)
    const quality = getSkillQualityProfile(skill)
    const trust = getSkillTrustProfile(skill)
    const repoRef = getSkillRepoRef(skill)

    return {
      rank: index + 1,
      slug: skill.slug,
      name: skill.name,
      repository: skill.repository || `https://github.com/${repoRef}`,
      stars: skill.github_stars || 0,
      install_command: getPrimaryInstallCommand(skill),
      skill_url: `${baseUrl}/skills/${skill.slug}`,
      audit_url: `${baseUrl}/skills/${skill.slug}/audit`,
      quality_score: quality.score,
      trust_score: trust.score,
      audit_score: audit.audit_score,
      risk_level: auditRiskLabel(audit.risk_level),
      why: `${quality.label} quality, ${trust.label.toLowerCase()} trust profile, and a clear install path for ${pack.shortTitle.toLowerCase()} workflows.`,
    }
  })

  const workflow = pack.workflowSteps.map((step, index) => {
    const suggested = selectedSkills[index] || selectedSkills[0] || null

    return {
      step: index + 1,
      title: step.title,
      description: step.description,
      suggested_skill_slug: suggested?.slug || null,
      suggested_skill_name: suggested?.name || null,
    }
  })

  const reviewChecklist = [
    'Open the audit_url for every selected skill before installation.',
    'Install only inside a sandbox, local branch, or disposable workspace first.',
    'Review license, recent repository activity, README/SKILL.md completeness, and dependency surface.',
    'Run one narrow task before using the pack in production workflows.',
    'Report success, setup friction, risk blocks, or low-quality output to the outcome endpoint.',
  ]

  return {
    version: 'openagentskill-pack-install-plan-v1',
    generated_at: new Date().toISOString(),
    pack: {
      slug: pack.slug,
      title: pack.title,
      persona: pack.persona,
      url: `${baseUrl}/skill-packs/${pack.slug}`,
      api_url: `${baseUrl}/api/agent/packs/${pack.slug}`,
    },
    selected_skills: selectedSkills,
    workflow,
    review_checklist: reviewChecklist,
    outcome_feedback: {
      endpoint: `${baseUrl}/api/agent/outcome`,
      method: 'POST',
      required_fields: ['event_id', 'skill_slug', 'task', 'outcome'],
      recommended_fields: ['agent', 'install_used', 'output_quality', 'workspace', 'time_to_useful_ms', 'notes'],
      expected_outcomes: ['success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required'],
    },
    agent_prompt:
      `Use the OpenAgentSkill pack "${pack.title}" for this workflow. ` +
      `Start with the highest-ranked relevant skill, read its audit URL before installation, install in a sandbox, ` +
      `complete one narrow task, then report the outcome to ${baseUrl}/api/agent/outcome. ` +
      `Avoid this pack when: ${pack.avoidWhen.join('; ')}.`,
  }
}
