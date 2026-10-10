import type { Metadata } from 'next'
import { getLocalizedCoreLanguageAlternates } from '@/lib/seo/localized-pages'

export const RESOURCE_SITE = 'https://www.openagentskill.com'
export const RESOURCE_PAGES = {
  blog: { path: '/blog', label: 'Blog', title: 'AI Agent Skills Blog', description: 'Read practical AI agent workflows, Skill comparisons, and installation guides with source links and adoption checks.', collection: true },
  guides: { path: '/guides', label: 'Guides', title: 'AI Agent Skills Guides', description: 'Find, compare, and install AI agent skills for Claude Code, Codex, web scraping, RAG, and everyday agent workflows.', collection: true },
  weekly: { path: '/reports/weekly', label: 'Weekly report', title: 'Weekly AI Agent Skill Report', description: 'Explore newly indexed and recently maintained agent skills in a seven-day sample, with selection methods and cumulative engagement signals.', collection: true },
  monthly: { path: '/reports/monthly', label: 'Monthly report', title: 'Monthly Agent Skills Index', description: 'Explore a 30-day sample of newly indexed and maintained agent skills, with current trust signals, source links, and transparent selection methods.', collection: true },
  research: { path: '/reports/state-of-agent-skills-2026', label: 'State of Agent Skills 2026', title: 'State of Agent Skills 2026', description: 'A transparent research report on agent skill quality, maintenance, licensing, installation readiness, and outcome evidence, with downloadable data.', collection: false },
  docs: { path: '/docs', label: 'Docs', title: 'Documentation: Find, Install and Create Agent Skills', description: 'Learn how to discover, inspect, install, and create AI agent skills. Start with a dry run, read source and safety signals, and connect through the API.', collection: false },
  agent: { path: '/agent', label: 'Agent Entry', title: 'Agent Entry: Discover and Resolve AI Skills', description: 'Connect your AI agent to OpenAgentSkill using task discovery, resolve, install receipts, outcome feedback, OpenAPI, and plain-text endpoints.', collection: false },
  api: { path: '/api-docs', label: 'API', title: 'API Reference: Registry, Resolve and Install Receipts', description: 'Integrate AI skill discovery with the OpenAgentSkill API. Read endpoint parameters, JSON and text examples, resolve requests, receipts, and outcome contracts.', collection: false },
  cli: { path: '/cli', label: 'CLI', title: 'CLI: Resolve, Inspect and Install AI Agent Skills', description: 'Use the OpenAgentSkill CLI to resolve tasks, inspect receipts, preview installation with a dry run, and report outcomes for Codex and Claude Code.', collection: false },
} as const

export type ResourcePageKey = keyof typeof RESOURCE_PAGES

export function resourceMetadata({ title, description, path, article = false, publishedTime }: {
  title: string; description: string; path: string; article?: boolean; publishedTime?: string
}): Metadata {
  const url = `${RESOURCE_SITE}${path}`
  const socialTitle = `${title} | OpenAgentSkill`
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: {
      title: socialTitle, description, url, siteName: 'OpenAgentSkill',
      type: article ? 'article' : 'website', ...(publishedTime ? { publishedTime } : {}),
      images: [{ url: `${RESOURCE_SITE}/opengraph-image?v=3`, width: 1200, height: 630, alt: 'OpenAgentSkill — discover reusable AI agent skills' }],
    },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: [`${RESOURCE_SITE}/opengraph-image?v=3`] },
  }
}

export function getResourceMetadata(page: ResourcePageKey): Metadata {
  const definition = RESOURCE_PAGES[page]
  const metadata = resourceMetadata({ ...definition, article: page === 'research' })
  if (page === 'docs' || page === 'api') {
    metadata.alternates = {
      canonical: `${RESOURCE_SITE}${definition.path}`,
      languages: getLocalizedCoreLanguageAlternates(page === 'api' ? 'api-docs' : 'docs'),
    }
  }
  return metadata
}

export function breadcrumbData(items: readonly { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: `${RESOURCE_SITE}${item.path}`,
    })),
  }
}

export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c') }
