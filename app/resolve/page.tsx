import type { Metadata } from 'next'
import { MarketingPageShell } from '@/components/marketing-page'
import { ResolveResults } from '@/components/resolve-results'
import { isLocale } from '@/lib/i18n/config'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || ''

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const hasQuery = Boolean(one(params.task).trim())
  return {
    title: 'Resolve AI Agent Tasks into Skills',
    description: 'Describe a task and let OpenAgentSkill recommend the right reusable AI agent skill with install command, Trust Score, audit notes, safety gate, and alternatives.',
    alternates: { canonical: 'https://www.openagentskill.com/resolve' },
    robots: { index: !hasQuery, follow: true },
    openGraph: {
      title: 'Resolve AI Agent Tasks into Skills - OpenAgentSkill',
      description: 'Find reusable skills for your task. Review source evidence, compare alternatives, and bring a skill to your AI.',
      url: 'https://www.openagentskill.com/resolve',
      type: 'website',
    },
  }
}

export default async function ResolvePage({ searchParams }: Props) {
  const params = await searchParams
  const task = one(params.task).trim().slice(0, 2000)
  const requestedAgent = one(params.agent)
  const agent = ['codex', 'claude-code', 'cursor'].includes(requestedAgent) ? requestedAgent : 'auto'
  const risk = one(params.max_risk) === 'low' ? 'low' : 'medium'
  const minStars = Math.max(0, Math.min(1000000, Number(one(params.min_stars)) || 0))
  const language = one(params.lang)
  return <MarketingPageShell>
    {!task && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'WebApplication', name: 'OpenAgentSkill Resolve',
      applicationCategory: 'DeveloperApplication', operatingSystem: 'Web',
      url: 'https://www.openagentskill.com/resolve',
      description: 'Resolve AI agent tasks into reusable skills with source evidence, audit notes, alternatives, and install guidance.',
    }) }} />}
    <ResolveResults key={JSON.stringify([task, agent, risk, minStars, language])} task={task} agent={agent} risk={risk} minStars={minStars} initialLocale={isLocale(language) ? language : undefined} />
  </MarketingPageShell>
}
