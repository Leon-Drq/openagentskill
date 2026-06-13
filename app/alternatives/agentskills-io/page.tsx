import type { Metadata } from 'next'
import { SearchEntryPage } from '@/components/search-entry-page'
import { SEARCH_ENTRY_PAGES } from '@/lib/seo/search-entry-pages'

const page = SEARCH_ENTRY_PAGES['agentskills-io-alternative']

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.description,
  alternates: {
    canonical: `https://www.openagentskill.com${page.path}`,
  },
  openGraph: {
    title: page.metaTitle,
    description: page.openGraphDescription,
    url: `https://www.openagentskill.com${page.path}`,
    type: 'website',
  },
}

export default function AgentSkillsIoAlternativePage() {
  return <SearchEntryPage page={page} />
}
