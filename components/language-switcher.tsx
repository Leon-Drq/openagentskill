'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check, ChevronDown, Globe2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { getLanguageSwitchHref } from '@/lib/i18n/market-routing'
import {
  localeNames,
  localeNativeNames,
  localeShortLabels,
  locales,
  type Locale,
} from '@/lib/i18n/config'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  compact?: boolean
  className?: string
}

export function LanguageSwitcher({ compact = false, className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const activeLocale = locale

  const activeLabel = useMemo(() => localeShortLabels[activeLocale], [activeLocale])

  const switchLanguage = (nextLocale: Locale) => {
    setOpen(false)

    if (nextLocale === activeLocale) return

    const query = typeof window === 'undefined' ? '' : window.location.search
    const hash = typeof window === 'undefined' ? '' : window.location.hash
    const href = getLanguageSwitchHref(pathname, nextLocale, query, hash)

    setLocale(nextLocale)

    if (typeof window === 'undefined') return

    const target = new URL(href, window.location.origin)

    // Most deep pages currently keep their content route and store the locale
    // preference in ?lang=. Updating that preference locally keeps the header,
    // menu, and next navigation responsive without waiting for a second server
    // render of the exact same page.
    if (target.pathname === window.location.pathname) {
      window.history.replaceState(window.history.state, '', `${target.pathname}${target.search}${target.hash}`)
      return
    }

    if (href !== `${pathname}${query}${hash}`) {
      // Keep the picker responsive while a translated route is streamed.
      startTransition(() => router.replace(href, { scroll: false }))
    }
  }

  return (
    <div
      className={cn('relative', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center rounded-[8px] border border-border bg-card/80 text-xs font-semibold text-foreground transition-colors hover:border-foreground/40',
          compact ? 'h-9 gap-1.5 px-2' : 'h-8 gap-2 px-2.5'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current language: ${localeNativeNames[activeLocale]}`}
      >
        <Globe2 className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        <span className="font-mono">{activeLabel}</span>
        {!compact && <span className="hidden text-secondary sm:inline">{localeNativeNames[activeLocale]}</span>}
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-secondary transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-[8px] border border-border bg-background shadow-[0_18px_55px_rgba(29,27,24,0.12)]"
        >
          {locales.map((loc) => {
            const active = loc === activeLocale
            return (
              <button
                key={loc}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => switchLanguage(loc)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors',
                  active ? 'bg-muted text-foreground' : 'text-secondary hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="w-7 shrink-0 font-mono text-xs text-secondary">{localeShortLabels[loc]}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{localeNativeNames[loc]}</span>
                    <span className="block truncate text-xs text-secondary">{localeNames[loc]}</span>
                  </span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-[#006b4f]" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
