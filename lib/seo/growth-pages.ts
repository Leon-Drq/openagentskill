import { USE_CASES, type UseCaseDefinition } from '@/lib/use-cases'

export interface BestSkillPageDefinition {
  slug: string
  title: string
  shortTitle: string
  eyebrow: string
  description: string
  useCaseSlug: string
  searchIntent: string
  audience: string
}

function titleCase(value: string) {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toBestPage(useCase: UseCaseDefinition): BestSkillPageDefinition {
  return {
    slug: useCase.slug,
    title: `Best ${useCase.shortTitle.toLowerCase()} skills for AI agents`,
    shortTitle: titleCase(useCase.shortTitle),
    eyebrow: useCase.eyebrow,
    description: useCase.description,
    useCaseSlug: useCase.slug,
    searchIntent: `Find production-ready agent skills for ${useCase.shortTitle.toLowerCase()} workflows.`,
    audience: `Builders choosing skills for ${useCase.workflows.slice(0, 2).join(' and ').toLowerCase()}.`,
  }
}

export const BEST_SKILL_PAGES: BestSkillPageDefinition[] = USE_CASES.map(toBestPage)

export const FEATURED_BEST_PAGES = BEST_SKILL_PAGES.filter((page) =>
  ['web-scraping', 'coding-agents', 'browser-automation', 'rag-knowledge', 'data-analysis', 'github-automation']
    .includes(page.slug)
)

export function getBestSkillPage(slug: string) {
  return BEST_SKILL_PAGES.find((page) => page.slug === slug)
}
