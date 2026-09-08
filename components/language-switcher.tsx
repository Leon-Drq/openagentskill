'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Check, ChevronDown, Globe2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { siteCopy } from '@/lib/i18n/site-copy'
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
  showName?: boolean
  className?: string
}

export function LanguageSwitcher({ compact = false, showName = !compact, className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState({ above: false, height: 480 })
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  const activeLocale = locale

  const activeLabel = useMemo(() => localeShortLabels[activeLocale], [activeLocale])

  const switchLanguage = (nextLocale: Locale) => {
    setOpen(false)

    if (nextLocale === activeLocale) return

    const query = typeof window === 'undefined' ? '' : window.location.search
    const hash = typeof window === 'undefined' ? '' : window.location.hash
    const href = getLanguageSwitchHref(pathname, nextLocale, query, hash)

    setLocale(nextLocale)

    if (href !== `${pathname}${query}${hash}`) {
      // Route through Next even when only the query string changes. Using the
      // History API here leaves useSearchParams stale, so page-level language
      // state and the visible URL can disagree.
      startTransition(() => router.replace(href, { scroll: false }))
    }
  }

  return (
    <div
      ref={root}
      className={cn('relative', className)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          setOpen(false)
          root.current?.querySelector('button')?.focus()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const below = window.innerHeight - rect.bottom - 16
          const above = rect.top - 16
          const openAbove = below < 360 && above > below
          setPanel({ above: openAbove, height: Math.max(80, Math.min(480, openAbove ? above : below)) })
          setOpen((value) => !value)
        }}
        className={cn(
          'flex min-w-max items-center whitespace-nowrap rounded-[8px] border border-border bg-card/80 text-xs font-semibold leading-none text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f]',
          compact ? 'h-10 gap-1.5 px-3' : 'h-9 gap-2 px-3'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={siteCopy(locale, 'Current language: {language}', { language: localeNativeNames[activeLocale] })}
      >
        <Globe2 className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        <span className="font-mono">{activeLabel}</span>
        {showName && <span className="hidden text-secondary sm:inline">{localeNativeNames[activeLocale]}</span>}
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-secondary transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={siteCopy(locale, 'Select language')}
          style={{ maxHeight: panel.height }}
          className={cn('absolute right-0 z-50 w-52 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-[8px] border border-border bg-background shadow-[0_18px_55px_rgba(29,27,24,0.12)]', panel.above ? 'bottom-full mb-2' : 'top-full mt-2')}
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
                  'flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#006b4f]',
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
