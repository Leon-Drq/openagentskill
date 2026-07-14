import type { Metadata } from 'next'
import { AnalyticsPreferenceControls } from '@/components/analytics-preference-controls'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How OpenAgentSkill handles product analytics and user data.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-4xl px-6 py-14 sm:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-secondary">Privacy</p>
            <h1 className="mt-5 font-display text-4xl font-normal leading-none sm:text-6xl">
              Useful measurement, narrow data collection.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
              OpenAgentSkill uses product analytics to understand which pages, skills, and agent workflows are useful. We deliberately keep sensitive task content out of Google Analytics.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-4xl gap-10 px-6 py-12 sm:py-16">
          <section>
            <h2 className="font-display text-3xl font-normal">What we measure</h2>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-secondary">
              <li>Page views and referring channels.</li>
              <li>Skill views, install-command copies, comparisons, saves, and outbound documentation clicks.</li>
              <li>Normalized resolve outcomes such as agent type, skill category, selected skill, policy result, and whether a recommendation succeeded.</li>
              <li>Submission outcomes such as approved or rejected status and aggregate review score.</li>
            </ul>
          </section>

          <section className="border-y border-border py-10">
            <h2 className="font-display text-3xl font-normal">What we do not send to Google</h2>
            <ul className="mt-5 grid gap-3 text-sm leading-6 text-secondary">
              <li>The task text typed into Agent Resolve.</li>
              <li>Private repository URLs, tokens, credentials, environment variables, or source code.</li>
              <li>Install commands or free-form submission content.</li>
              <li>Advertising identifiers or personalized advertising signals.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-3xl font-normal">Analytics consent</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-secondary">
              Analytics storage is denied by default. Google Consent Mode may send consent status and limited cookieless measurements while analytics storage is denied. Choosing Allow analytics permits Google Analytics to store analytics cookies for fuller usage reporting. Advertising storage and personalization remain denied in both modes.
            </p>
            <div className="mt-6">
              <AnalyticsPreferenceControls />
            </div>
          </section>

          <section className="border-t border-border pt-10 text-sm leading-6 text-secondary">
            <h2 className="font-display text-3xl font-normal text-foreground">Other product data</h2>
            <p className="mt-4">
              OpenAgentSkill also records first-party product events needed to operate the registry, improve recommendations, detect abuse, and measure anonymous agent outcomes. Server-side Agent API activity remains separate from Google Analytics.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
