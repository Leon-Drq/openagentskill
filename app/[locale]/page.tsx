import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import {
  LOCALIZED_LANDING_PAGES,
  type LocalizedLandingPageCode,
  getLocalizedLanguageAlternates,
} from '@/lib/seo/localized-pages'

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(LOCALIZED_LANDING_PAGES).map((locale) => ({ locale }))
}

function getPage(locale: string) {
  if (locale in LOCALIZED_LANDING_PAGES) {
    return LOCALIZED_LANDING_PAGES[locale as LocalizedLandingPageCode]
  }
  return null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const page = getPage(locale)
  if (!page) return {}

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: `https://www.openagentskill.com/${locale}`,
      languages: getLocalizedLanguageAlternates(),
    },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `https://www.openagentskill.com/${locale}`,
      siteName: 'OpenAgentSkill',
      locale: page.lang,
      type: 'website',
      images: [
        {
          url: 'https://www.openagentskill.com/opengraph-image',
          width: 1200,
          height: 630,
          alt: page.title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: ['https://www.openagentskill.com/opengraph-image'],
    },
  }
}

export default async function LocalizedLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const page = getPage(locale)
  if (!page) notFound()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{page.eyebrow}</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
            {page.heading}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-secondary">
            {page.intro}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/skills"
              className="border border-foreground bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-80"
            >
              {page.primaryCta}
            </Link>
            <Link
              href="/api-docs"
              className="border border-border px-5 py-2.5 text-sm text-foreground transition-colors hover:border-foreground"
            >
              {page.secondaryCta}
            </Link>
          </div>
        </section>

        <section className="grid gap-px border-x border-b border-border bg-border md:grid-cols-3">
          {page.highlights.map((highlight) => (
            <div key={highlight} className="bg-background p-5">
              <p className="text-sm leading-relaxed text-secondary">{highlight}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 py-10 md:grid-cols-2">
          <Link href="/use-cases" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Use cases</p>
            <h2 className="font-display text-2xl font-semibold">Web scraping, coding agents, RAG</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Find skills by the work your agent needs to complete.
            </p>
          </Link>
          <Link href="/rankings" className="border border-border p-5 transition-colors hover:border-foreground">
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Rankings</p>
            <h2 className="font-display text-2xl font-semibold">Quality, stars, freshness</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Use ranked shortlists before adding a skill to an agent workflow.
            </p>
          </Link>
        </section>

        <section className="border-t border-border pt-8">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Languages</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="border border-border px-3 py-1.5 text-xs text-secondary hover:border-foreground hover:text-foreground">
              English
            </Link>
            {Object.entries(LOCALIZED_LANDING_PAGES).map(([code, item]) => (
              <Link
                key={code}
                href={`/${code}`}
                hrefLang={item.lang}
                className="border border-border px-3 py-1.5 text-xs text-secondary hover:border-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
