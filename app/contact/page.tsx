import type { Metadata } from 'next'
import Link from 'next/link'
import { Github, Mail, ShieldCheck } from 'lucide-react'
import {
  MarketingButtonLink,
  MarketingFeatureGrid,
  MarketingHero,
  MarketingPageShell,
} from '@/components/marketing-page'

const SITE_URL = 'https://www.openagentskill.com'
const CONTACT_EMAIL = 'qudongqi2023@gmail.com'

export const metadata: Metadata = {
  title: 'Contact OpenAgentSkill',
  description:
    'Contact OpenAgentSkill about the registry, skill submissions, privacy, security, partnerships, or technical issues.',
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    title: 'Contact OpenAgentSkill',
    description: 'Verified contact details and support channels for OpenAgentSkill.',
    url: `${SITE_URL}/contact`,
    type: 'website',
  },
}

const contactReasons = [
  {
    label: 'Product',
    title: 'Registry and partnership questions',
    copy: 'Ask about OpenAgentSkill, integrations, research, creator claims, submissions, or collaboration opportunities.',
  },
  {
    label: 'Support',
    title: 'Technical issues and corrections',
    copy: 'Report broken pages, incorrect skill data, API problems, or reproducible bugs. Public issues are preferred when no sensitive data is involved.',
  },
  {
    label: 'Trust',
    title: 'Privacy and security disclosures',
    copy: 'Use email for privacy requests, abuse reports, or security details that should not be posted publicly.',
  },
]

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${SITE_URL}/contact#contact`,
    url: `${SITE_URL}/contact`,
    name: 'Contact OpenAgentSkill',
    description: 'Official contact details and support channels for OpenAgentSkill.',
    mainEntity: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'OpenAgentSkill',
      email: CONTACT_EMAIL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: CONTACT_EMAIL,
        url: `${SITE_URL}/contact`,
        availableLanguage: ['English', 'Chinese'],
      },
    },
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'OpenAgentSkill',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Contact',
        item: `${SITE_URL}/contact`,
      },
    ],
  },
]

export default function ContactPage() {
  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Official contact"
        title="Contact OpenAgentSkill."
        description={
          <>
            Use the verified email below for product, privacy, security, partnership, or correction requests. For
            reproducible public bugs, GitHub Issues keeps the discussion transparent and searchable.
          </>
        }
        actions={
          <>
            <MarketingButtonLink href={`mailto:${CONTACT_EMAIL}`} variant="primary">
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              Email OpenAgentSkill
            </MarketingButtonLink>
            <MarketingButtonLink
              href="https://github.com/Leon-Drq/openagentskill/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="mr-2 h-4 w-4" aria-hidden="true" />
              GitHub Issues
            </MarketingButtonLink>
          </>
        }
        aside={
          <div className="overflow-hidden rounded-[8px] border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Verified public email</p>
            </div>
            <div className="p-5">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="break-all font-display text-2xl font-normal leading-snug underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                {CONTACT_EMAIL}
              </a>
              <p className="mt-4 text-sm leading-6 text-secondary">
                English and Chinese messages are welcome. Please do not email API keys, passwords, or private source code.
              </p>
            </div>
          </div>
        }
      />

      <section className="border-b border-border bg-card/35">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <MarketingFeatureGrid items={contactReasons} />
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div>
            <ShieldCheck className="h-5 w-5 text-[#006b4f]" aria-hidden="true" />
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Send useful context</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">Help us verify and act.</h2>
          </div>
          <div className="rounded-[8px] border border-border bg-card p-6 text-sm leading-7 text-secondary">
            <p>Include the affected URL or skill slug, what you expected, what happened, and minimal reproduction steps.</p>
            <p className="mt-4">
              Security or privacy details should be sent by email rather than posted publicly. General product bugs can
              be filed in the public repository.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 font-semibold text-foreground">
              <Link href="/about" className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                About OpenAgentSkill
              </Link>
              <Link href="/privacy" className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                Privacy
              </Link>
            </div>
          </div>
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
