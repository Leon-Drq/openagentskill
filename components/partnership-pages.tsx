import Link from 'next/link'
import { ArrowUpRight, ArrowRight, Github, Mail } from 'lucide-react'
import { MarketingHero, MarketingPageShell, MarketingButtonLink } from '@/components/marketing-page'
import { I18nProvider } from '@/lib/i18n/context'
import type { Locale } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getPartnershipCopy } from '@/lib/i18n/partnership-copy'
import { CONTACT_EMAIL, COMMUNITY_X_URL, PUBLIC_ISSUES_URL, SPONSOR_EMAIL_URL } from '@/lib/partnerships'

type Props = { locale: Locale; schema: unknown }
const textLink = 'inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4'

function Schema({ value }: { value: unknown }) {
  return <script id="partnership-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />
}

export function ContactContent({ locale, schema }: Props) {
  const c = getPartnershipCopy(locale)
  const href = (path: string) => getLocalizedNavigationHref(path, locale)
  return <I18nProvider initialLocale={locale}><MarketingPageShell>
    <Schema value={schema} />
    <MarketingHero eyebrow="OpenAgentSkill" title={c.contactTitle} description={c.contactIntro} />
    <section className="mx-auto max-w-6xl px-6 py-10 sm:py-16" aria-label={c.contactTitle}>
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="min-w-0 border-t-2 border-[#006b4f] pt-6">
          <Mail className="h-5 w-5 text-[#006b4f]" aria-hidden="true" />
          <h2 className="mt-5 font-display text-3xl">{c.emailLabel}</h2>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-5 inline-block max-w-full break-all font-display text-2xl text-[#006b4f] underline decoration-border underline-offset-8 hover:decoration-current sm:text-3xl focus-visible:outline-2 focus-visible:outline-offset-4">{CONTACT_EMAIL}</a>
          <p className="mt-6 max-w-lg text-sm leading-7 text-secondary">{c.emailHint}</p>
          <p className="mt-8 max-w-lg border-l-2 border-border pl-4 text-sm leading-7 text-secondary">{c.privacyHint}</p>
        </div>
        <div className="divide-y divide-border border-y border-border">
          <div className="py-6">
            <h2><a href={COMMUNITY_X_URL} target="_blank" rel="noopener noreferrer" className={textLink}>{c.xLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></h2>
            <p className="mt-2 text-sm leading-7 text-secondary">{c.xHint}</p>
            <p className="mt-3 font-mono text-xs text-secondary">@openagentskill</p>
          </div>
          <div className="py-6">
            <h2><a href={PUBLIC_ISSUES_URL} target="_blank" rel="noopener noreferrer" className={textLink}><Github className="h-4 w-4" aria-hidden="true" />{c.issuesLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></h2>
            <p className="mt-2 text-sm leading-7 text-secondary">{c.issuesHint}</p>
          </div>
        </div>
      </div>
      <div className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-7">
        <Link href={href('/sponsor')} className={`${textLink} text-[#006b4f]`}>{c.sponsorLabel}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        <div className="flex flex-wrap gap-6"><Link href={href('/about')} className={textLink}>{c.about}</Link><Link href={href('/privacy')} className={textLink}>{c.privacy}</Link></div>
      </div>
    </section>
  </MarketingPageShell></I18nProvider>
}

export function SponsorContent({ locale, schema }: Props) {
  const c = getPartnershipCopy(locale)
  const options = [[c.brandTitle, c.brandCopy], [c.topicTitle, c.topicCopy], [c.eventTitle, c.eventCopy]]
  return <I18nProvider initialLocale={locale}><MarketingPageShell>
    <Schema value={schema} />
    <MarketingHero eyebrow="OpenAgentSkill" title={c.sponsorTitle} description={c.sponsorIntro}
      actions={<MarketingButtonLink href={SPONSOR_EMAIL_URL} variant="primary">{c.sponsorCta}<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></MarketingButtonLink>} />
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16" aria-labelledby="sponsor-formats">
      <h2 id="sponsor-formats" className="font-display text-3xl sm:text-4xl">{c.offerTitle}</h2>
      <div className="mt-8 grid border-y border-border md:grid-cols-3">
        {options.map(([title, description]) => <article key={title} className="py-7 not-last:border-b not-last:border-border md:px-7 md:first:pl-0 md:last:pr-0 md:not-last:border-r md:not-last:border-b-0">
          <h3 className="font-display text-2xl">{title}</h3><p className="mt-4 text-sm leading-7 text-secondary">{description}</p>
        </article>)}
      </div>
      <aside className="mt-10 border-l-2 border-[#006b4f] pl-6">
        <h2 className="font-display text-2xl">{c.independenceTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">{c.independenceCopy}</p>
      </aside>
    </section>
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <h2 className="font-display text-3xl sm:text-4xl">{c.supportersTitle}</h2>
        <div className="space-y-4 text-sm leading-7 text-secondary"><p>{c.supportersCopy}</p><p>{c.relationshipCopy}</p></div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <h2 className="font-display text-3xl">{c.briefTitle}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary">{c.briefCopy}</p>
      <a href={SPONSOR_EMAIL_URL} className={`${textLink} mt-5 max-w-full break-all text-[#006b4f]`}>{CONTACT_EMAIL}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a>
      <div className="mt-7"><Link href={getLocalizedNavigationHref('/contact', locale)} className={textLink}>{c.contactCta}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
    </section>
  </MarketingPageShell></I18nProvider>
}
