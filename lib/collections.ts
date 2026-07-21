import type { SkillRecord } from '@/lib/db/skills'
import { getSkillQualityProfile } from '@/lib/quality'
import { getUseCaseBySlug, scoreSkillForUseCase } from '@/lib/use-cases'

export interface SkillStackDefinition {
  slug: string
  shortTitle: string
  title: string
  eyebrow: string
  description: string
  persona: string
  useCaseSlug: string
  keywords: string[]
  featuredSlugs?: string[]
  outcomes: string[]
  workflowSteps: Array<{
    title: string
    description: string
  }>
  idealFor: string[]
  avoidWhen: string[]
}

export const SKILL_STACKS: SkillStackDefinition[] = [
  {
    slug: 'web-data-pipeline',
    shortTitle: 'Web data pipeline',
    title: 'Web data pipeline stack',
    eyebrow: 'Scrape, clean, and reuse web data',
    description:
      'A practical stack for agents that crawl public pages, extract clean content, normalize data, and hand it to downstream research or RAG workflows.',
    persona: 'Growth, research, and data teams building repeatable web collection workflows.',
    useCaseSlug: 'web-scraping',
    keywords: ['crawl', 'scrape', 'browser', 'extract', 'markdown', 'html', 'data', 'web'],
    outcomes: ['Collect target URLs', 'Extract structured content', 'Normalize messy pages', 'Feed downstream reports'],
    workflowSteps: [
      { title: 'Crawl', description: 'Start with a crawler or browser skill that can discover and fetch target pages.' },
      { title: 'Extract', description: 'Use extraction skills to turn HTML, tables, and page metadata into structured text.' },
      { title: 'Validate', description: 'Add checks for freshness, duplicates, blocked pages, and schema consistency.' },
      { title: 'Reuse', description: 'Send clean output into reports, databases, or knowledge-base ingestion.' },
    ],
    idealFor: ['Competitor monitoring', 'Lead enrichment', 'Dataset collection', 'RAG ingestion'],
    avoidWhen: ['You need private site access without consent', 'The workflow depends on brittle one-off scraping rules'],
  },
  {
    slug: 'coding-review-agent',
    shortTitle: 'Coding review agent',
    title: 'Coding review agent stack',
    eyebrow: 'Inspect, patch, and verify code',
    description:
      'A stack for software agents that inspect repositories, review pull requests, generate tests, and turn findings into shippable patches.',
    persona: 'Engineering teams using AI agents inside active codebases.',
    useCaseSlug: 'coding-agents',
    keywords: ['code', 'github', 'review', 'pull request', 'testing', 'debug', 'repository', 'developer'],
    outcomes: ['Understand a repo', 'Review risky changes', 'Generate focused tests', 'Ship verified patches'],
    workflowSteps: [
      { title: 'Orient', description: 'Use repository skills to map files, dependencies, and existing test commands.' },
      { title: 'Review', description: 'Prioritize bugs, regressions, missing tests, and integration risks.' },
      { title: 'Patch', description: 'Apply scoped code changes that follow the project style.' },
      { title: 'Verify', description: 'Run local checks and summarize residual risk before handoff.' },
    ],
    idealFor: ['PR review', 'Bug fixing', 'Regression testing', 'Release preparation'],
    avoidWhen: ['You cannot run tests locally', 'The repository contains secrets or unreviewed generated changes'],
  },
  {
    slug: 'rag-knowledge-base',
    shortTitle: 'RAG knowledge base',
    title: 'RAG knowledge-base stack',
    eyebrow: 'Ingest, retrieve, and cite',
    description:
      'A stack for document-heavy agents that ingest files, create searchable knowledge, retrieve relevant context, and answer with grounded sources.',
    persona: 'Teams building support, research, internal documentation, or compliance assistants.',
    useCaseSlug: 'rag-knowledge',
    keywords: ['rag', 'retrieval', 'embedding', 'vector', 'document', 'pdf', 'knowledge', 'search'],
    outcomes: ['Ingest documents', 'Chunk and index content', 'Retrieve context', 'Cite sources in answers'],
    workflowSteps: [
      { title: 'Ingest', description: 'Collect documents, pages, or notes and preserve source metadata.' },
      { title: 'Index', description: 'Chunk content and store embeddings in a retrievable format.' },
      { title: 'Retrieve', description: 'Fetch only the relevant context for each user question.' },
      { title: 'Answer', description: 'Generate grounded responses with citations and confidence checks.' },
    ],
    idealFor: ['Internal docs assistants', 'Research archives', 'Support knowledge bases', 'Policy lookup'],
    avoidWhen: ['The corpus changes every few seconds', 'You cannot expose source documents to the agent runtime'],
  },
  {
    slug: 'browser-qa-agent',
    shortTitle: 'Browser QA agent',
    title: 'Browser QA agent stack',
    eyebrow: 'Operate and verify web apps',
    description:
      'A stack for agents that navigate products, fill forms, take screenshots, and verify real user flows across web applications.',
    persona: 'Product and QA teams that want repeatable browser checks without writing every test from scratch.',
    useCaseSlug: 'browser-automation',
    keywords: ['browser', 'playwright', 'puppeteer', 'selenium', 'test', 'screenshot', 'form', 'ui'],
    outcomes: ['Run web flows', 'Fill forms safely', 'Capture visual evidence', 'Report broken states'],
    workflowSteps: [
      { title: 'Navigate', description: 'Open the target app and move through the same path a user would follow.' },
      { title: 'Interact', description: 'Click, type, upload, and choose options with explicit state checks.' },
      { title: 'Assert', description: 'Verify DOM text, URLs, console errors, screenshots, and data changes.' },
      { title: 'Report', description: 'Return concise findings with reproduction steps and artifacts.' },
    ],
    idealFor: ['Signup flows', 'Checkout smoke tests', 'Dashboard QA', 'Visual regression triage'],
    avoidWhen: ['The flow requires bypassing platform controls', 'The target site disallows automation'],
  },
  {
    slug: 'frontend-product-ui',
    shortTitle: 'Frontend and UI',
    title: 'Frontend and product UI skill stack',
    eyebrow: 'Design, build, test, and ship interfaces',
    description:
      'A complete stack for agents that turn product briefs or Figma designs into polished frontend code, review the result, test it in a browser, and prepare a safe deployment.',
    persona: 'Product, design, and engineering teams shipping high-fidelity web interfaces with AI agents.',
    useCaseSlug: 'design-creative',
    keywords: ['frontend', 'ui', 'ux', 'figma', 'react', 'next.js', 'design', 'accessibility', 'browser', 'test', 'deploy'],
    featuredSlugs: [
      'design-taste-frontend',
      'anthropic-frontend-design',
      'figma-implement-design',
      'vercel-web-design-guidelines',
      'vercel-react-best-practices',
      'openai-playwright',
      'anthropic-webapp-testing',
      'anthropic-canvas-design',
      'anthropic-brand-guidelines',
      'vercel-deploy-to-vercel',
    ],
    outcomes: ['Set a visual direction', 'Implement Figma faithfully', 'Review UI and performance', 'Test and deploy safely'],
    workflowSteps: [
      { title: 'Direct', description: 'Choose an intentional visual direction and capture the product constraints before coding.' },
      { title: 'Implement', description: 'Translate Figma or a brief into accessible components and production-ready frontend code.' },
      { title: 'Review', description: 'Audit interface quality, React performance, and real browser behavior before release.' },
      { title: 'Ship', description: 'Create a preview deployment only after the target project and configuration are reviewed.' },
    ],
    idealFor: ['Landing pages', 'Product UI redesigns', 'Figma-to-code handoff', 'Frontend QA and preview deploys'],
    avoidWhen: ['The brand or design source is not authorized', 'A deployment would change a production environment without review'],
  },
  {
    slug: 'research-report-agent',
    shortTitle: 'Research report agent',
    title: 'Research report agent stack',
    eyebrow: 'Find, compare, and synthesize',
    description:
      'A stack for agents that gather sources, compare claims, summarize long material, and draft useful research briefs.',
    persona: 'Founders, analysts, and content teams who need sourced research without losing the evidence trail.',
    useCaseSlug: 'research-agents',
    keywords: ['research', 'analysis', 'summarize', 'report', 'search', 'source', 'market', 'news'],
    outcomes: ['Collect credible sources', 'Extract claims', 'Compare evidence', 'Write concise reports'],
    workflowSteps: [
      { title: 'Discover', description: 'Search and collect candidate sources with dates and provenance.' },
      { title: 'Extract', description: 'Pull claims, numbers, names, and constraints from each source.' },
      { title: 'Compare', description: 'Separate consensus, disagreement, and unknowns.' },
      { title: 'Brief', description: 'Produce a short report with links back to supporting material.' },
    ],
    idealFor: ['Market maps', 'Competitor scans', 'Technical research', 'News synthesis'],
    avoidWhen: ['You need legal, financial, or medical certainty without human review', 'Sources are unavailable or unverifiable'],
  },
  {
    slug: 'content-growth-agent',
    shortTitle: 'Content growth agent',
    title: 'Content growth agent stack',
    eyebrow: 'Turn skills into distribution',
    description:
      'A stack for turning newly indexed skills into SEO briefs, social drafts, comparison pages, and reusable publishing workflows.',
    persona: 'Indie builders and marketers growing an AI tool directory.',
    useCaseSlug: 'workflow-automation',
    keywords: ['content', 'blog', 'seo', 'social', 'twitter', 'x', 'workflow', 'automation', 'summary'],
    outcomes: ['Generate SEO topics', 'Draft social posts', 'Create comparison angles', 'Schedule repeatable updates'],
    workflowSteps: [
      { title: 'Pick', description: 'Choose high-quality skills with clear user scenarios and strong signals.' },
      { title: 'Frame', description: 'Turn each skill into a problem-led story rather than a generic feature list.' },
      { title: 'Publish', description: 'Create a blog guide, X draft, or collection page with internal links.' },
      { title: 'Measure', description: 'Track clicks, saves, and feedback to decide what to promote next.' },
    ],
    idealFor: ['Daily skill updates', 'SEO landing pages', 'Social posts', 'Newsletter roundups'],
    avoidWhen: ['The skill has weak quality signals', 'The content has no concrete user scenario'],
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

export function getSkillStackBySlug(slug: string) {
  return SKILL_STACKS.find((stack) => stack.slug === slug)
}

export function scoreSkillForStack(skill: SkillRecord, stack: SkillStackDefinition) {
  const text = searchableSkillText(skill)
  const useCase = getUseCaseBySlug(stack.useCaseSlug)
  let score = useCase ? scoreSkillForUseCase(skill, useCase) : 0

  for (const keyword of stack.keywords) {
    const normalized = keyword.toLowerCase()
    if (text.includes(normalized)) score += normalized.includes(' ') ? 5 : 3
  }

  if (stack.featuredSlugs?.includes(skill.slug)) score += 180

  const quality = getSkillQualityProfile(skill)
  score += quality.score / 12
  score += Math.min(6, Math.log10(Math.max(1, skill.github_stars || 0)) * 1.6)

  return score
}

export function selectSkillsForStack(skills: SkillRecord[], stack: SkillStackDefinition, limit = 8) {
  return skills
    .map((skill) => ({ skill, score: scoreSkillForStack(skill, stack) }))
    .filter((item) => item.score >= 10)
    .sort((a, b) => b.score - a.score || b.skill.github_stars - a.skill.github_stars)
    .slice(0, limit)
    .map((item) => item.skill)
}

export function getStacksForSkill(skill: SkillRecord, limit = 3) {
  return SKILL_STACKS
    .map((stack) => ({ stack, score: scoreSkillForStack(skill, stack) }))
    .filter((item) => item.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.stack)
}
