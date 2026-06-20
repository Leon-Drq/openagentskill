import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import type { SearchEntryPageSpec } from '@/lib/seo/search-entry-pages'

const BASE_URL = 'https://www.openagentskill.com'

function isExternalHref(href: string) {
  return href.startsWith('https://') || href.endsWith('.json') || href.endsWith('.txt')
}

function SmartLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

export function SearchEntryPage({ page }: { page: SearchEntryPageSpec }) {
  const pageUrl = `${BASE_URL}${page.path}`
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': page.comparison ? 'CollectionPage' : 'WebPage',
      name: page.metaTitle,
      headline: page.title,
      description: page.description,
      url: pageUrl,
      publisher: {
        '@type': 'Organization',
        name: 'OpenAgentSkill',
        url: BASE_URL,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: page.eyebrow, item: pageUrl },
      ],
    },
  ]

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        actions={
          <>
            <SmartLink
              href={page.primaryCta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#006b4f] bg-[#006b4f] px-5 py-2 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {page.primaryCta.label}
            </SmartLink>
            <SmartLink
              href={page.secondaryCta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-border bg-background px-5 py-2 text-center text-sm font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              {page.secondaryCta.label}
            </SmartLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            items={page.proof.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
          />
        }
      />

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
            {page.sections.map((section) => (
              <article key={section.title} className="border border-border bg-card p-6 sm:p-7">
                <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">
                  {section.eyebrow}
                </p>
                <h2 className="font-display text-2xl font-normal leading-tight sm:text-3xl">
                  {section.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-secondary sm:text-base">{section.body}</p>
                {section.href && section.linkLabel ? (
                  <SmartLink
                    href={section.href}
                    className="mt-5 inline-flex text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-foreground"
                  >
                    {section.linkLabel}
                  </SmartLink>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Explore</p>
                <h2 className="font-display text-3xl font-normal leading-tight sm:text-4xl">
                  Practical paths into the registry.
                </h2>
              </div>
              <SmartLink href="/skills" className="text-sm text-secondary underline underline-offset-4 hover:text-foreground">
                View all skills
              </SmartLink>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {page.cards.map((card) => (
                <SmartLink
                  key={card.title}
                  href={card.href}
                  className="group border border-border bg-background p-5 transition-colors hover:border-foreground"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">{card.label}</p>
                  <h3 className="mt-4 font-display text-xl font-normal leading-tight">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{card.body}</p>
                  <span className="mt-5 inline-flex text-xs font-semibold text-emerald-800 group-hover:text-foreground">
                    Open
                  </span>
                </SmartLink>
              ))}
            </div>
          </div>
        </section>

        {page.comparison ? (
          <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-6xl">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Compare</p>
              <h2 className="mb-8 font-display text-3xl font-normal leading-tight sm:text-4xl">
                OpenAgentSkill vs {page.comparison.otherName}.
              </h2>
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-card">
                      <th className="w-44 p-4 font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">Feature</th>
                      <th className="p-4 font-display text-lg font-normal">OpenAgentSkill</th>
                      <th className="p-4 font-display text-lg font-normal">{page.comparison.otherName}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {page.comparison.rows.map((row) => (
                      <tr key={row.feature}>
                        <td className="p-4 align-top font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">
                          {row.feature}
                        </td>
                        <td className="p-4 align-top leading-relaxed">{row.openAgentSkill}</td>
                        <td className="p-4 align-top leading-relaxed text-secondary">{row.other}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Questions</p>
            <div className="grid gap-3 md:grid-cols-3">
              {page.faq.map((item) => (
                <article key={item.question} className="border border-border bg-card p-5">
                  <h2 className="font-display text-xl font-normal leading-tight">{item.question}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-2">
            {page.related.map((item) => (
              <SmartLink
                key={item.href}
                href={item.href}
                className="border border-border bg-card px-3 py-2 text-xs font-semibold text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                {item.label}
              </SmartLink>
            ))}
          </div>
        </section>
      {structuredData.map((item) => (
        <script
          key={item['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </MarketingPageShell>
  )
}
