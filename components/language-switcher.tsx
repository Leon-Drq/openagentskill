'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Globe2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import {
  isLocale,
  localeNames,
  localeNativeNames,
  localePaths,
  localeShortLabels,
  locales,
  type Locale,
} from '@/lib/i18n/config'
import { cn } from '@/lib/utils'

function getPathLocale(pathname: string): Locale | null {
  if (pathname === '/') return 'en'
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  return isLocale(firstSegment) ? firstSegment : null
}

function isLocalizedLandingPath(pathname: string) {
  return pathname === '/' || locales.some((loc) => pathname === localePaths[loc])
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const pathLocale = getPathLocale(pathname)
  const activeLocale = pathLocale || locale

  const activeLabel = useMemo(() => localeShortLabels[activeLocale], [activeLocale])

  const switchLanguage = (nextLocale: Locale) => {
    setLocale(nextLocale)
    setOpen(false)

    if (isLocalizedLandingPath(pathname)) {
      router.push(localePaths[nextLocale])
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 items-center gap-2 rounded-[8px] border border-border bg-card/80 px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-foreground/40"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current language: ${localeNativeNames[activeLocale]}`}
      >
        <Globe2 className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        <span className="font-mono">{activeLabel}</span>
        <span className="hidden text-secondary sm:inline">{localeNativeNames[activeLocale]}</span>
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
