import Image from 'next/image'
import type { Locale } from '@/lib/i18n/config'

const labels: Record<Locale, string> = {
  en: 'Find us on',
  zh: '收录平台',
  ja: '掲載プラットフォーム',
  ko: '소개된 플랫폼',
  es: 'Encuéntranos en',
  de: 'Hier findest du uns',
  fr: 'Retrouvez-nous sur',
  id: 'Temukan kami di',
}

// Keep official badge URLs in the server HTML so directory verification can
// discover them. Listings are not endorsements or commercial partnerships.
const listings = [
  {
    name: 'LaunchBuff',
    href: 'https://launchbuff.com/products/open-agent-skill-0rqpbb',
    badge: 'https://launchbuff.com/badge-featured-dark.svg',
  },
]

export function HomeDirectoryBadges({ locale }: { locale: Locale }) {
  return (
    <section id="home-directories" aria-labelledby="home-directories-heading" className="scroll-mt-20 border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="home-directories-heading" className="text-sm font-medium text-secondary">
          {labels[locale]}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {listings.map(({ name, href, badge }) => (
            <a key={name} href={href} target="_blank" rel="noopener noreferrer" title={`Featured on ${name}`}
              className="inline-flex max-w-full rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#006b4f]">
              <Image src={badge} alt={`Featured on ${name}`} width={256} height={80} unoptimized loading="lazy" className="h-auto w-48 max-w-full" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
