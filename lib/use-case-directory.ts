import type { UseCaseDefinition } from './use-cases'

export const USE_CASE_GROUPS = [
  {
    id: 'build-automate', title: 'Build & automate',
    description: 'Write better code, operate tools, and turn repeated tasks into workflows.',
    slugs: ['coding-agents', 'github-automation', 'testing-qa', 'security-compliance', 'browser-automation', 'workflow-automation', 'local-desktop'],
  },
  {
    id: 'research-data', title: 'Research & data',
    description: 'Collect information, connect knowledge, and make sense of your data.',
    slugs: ['research-agents', 'web-scraping', 'rag-knowledge', 'document-processing', 'data-analysis', 'database-sql', 'finance-quant', 'sports-analytics'],
  },
  {
    id: 'create-publish', title: 'Create & publish',
    description: 'Move from an idea to a finished design, video, presentation, or campaign.',
    slugs: ['design-creative', 'video-creation', 'presentation-generation', 'content-automation', 'marketing-growth', 'multimodal-media'],
  },
  {
    id: 'business-everyday', title: 'Business & everyday work',
    description: 'Support customers, manage relationships, and keep daily work moving.',
    slugs: ['customer-support', 'sales-crm', 'email-calendar', 'legal-compliance'],
  },
  {
    id: 'learn-explore', title: 'Learn & explore',
    description: 'Find tools for learning, cultural exploration, and personal reflection.',
    slugs: ['education-tutoring', 'mysticism'],
  },
]

export function groupUseCases(useCases: UseCaseDefinition[]) {
  const bySlug = new Map(useCases.map(useCase => [useCase.slug, useCase]))
  const groups = USE_CASE_GROUPS.map(group => ({
    ...group,
    useCases: group.slugs.flatMap(slug => bySlug.has(slug) ? [bySlug.get(slug)!] : []),
  })).filter(group => group.useCases.length > 0)

  // New guides remain discoverable even before an editorial group is assigned.
  const assigned = new Set(groups.flatMap(group => group.slugs))
  const remaining = useCases.filter(useCase => !assigned.has(useCase.slug))
  if (remaining.length) {
    groups.push({
      id: 'more-use-cases', title: 'More use cases',
      description: 'Explore more ways to put agent skills to work.',
      slugs: remaining.map(useCase => useCase.slug), useCases: remaining,
    })
  }
  return groups
}
