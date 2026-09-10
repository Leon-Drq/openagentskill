import type { Metadata } from 'next'
import { MarketingPageShell } from '@/components/marketing-page'
import { ResolveResults } from '@/components/resolve-results'
import { isLocale } from '@/lib/i18n/config'
import { Suspense, type ComponentProps } from 'react'
import { resolveAgentSkill } from '@/lib/agent-resolve'
import { toResolveWebResponse } from '@/lib/resolve-web-response'

async function ResolvedSearch(props: ComponentProps<typeof ResolveResults>) {
  if (!props.task) return <ResolveResults {...props} />
  let result: ReturnType<typeof toResolveWebResponse> | null = null
  let unavailable = false
  try {
    result = toResolveWebResponse(await resolveAgentSkill({
      task: props.task, agent: props.agent || 'auto', limit: 5,
      constraints: { max_risk: props.risk === 'low' ? 'low' : 'medium', min_stars: props.minStars || 0, needs_install_command: true },
    }))
    unavailable = !result.selected && result.meta.registry_status === 'snapshot_only'
  } catch {
    unavailable = true
  }
  return <ResolveResults {...props} initialResult={result} initialError={unavailable} />
}

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
    <Suspense key={JSON.stringify([task, agent, risk, minStars, language])} fallback={<div role="status" aria-live="polite" className="mx-auto max-w-5xl px-6 py-14"><p>{language === 'zh' ? '正在查找匹配的技能…' : 'Searching for matching skills…'}</p><div aria-hidden="true" className="mt-8 h-64 rounded-xl border border-border bg-muted/30 motion-safe:animate-pulse" /></div>}>
      <ResolvedSearch task={task} agent={agent} risk={risk} minStars={minStars} initialLocale={isLocale(language) ? language : undefined} />
    </Suspense>
  </MarketingPageShell>
}
