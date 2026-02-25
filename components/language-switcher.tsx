'use client'

import { useI18n } from '@/lib/i18n/context'
import { locales, localeNames, type Locale } from '@/lib/i18n/config'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="flex items-center gap-1 border border-border">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc)}
          className={`px-3 py-1 text-sm font-mono transition-colors ${
            locale === loc
              ? 'bg-foreground text-background'
              : 'bg-background text-foreground hover:bg-muted'
          }`}
          aria-label={`Switch to ${localeNames[loc]}`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
