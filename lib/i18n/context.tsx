'use client'

import { createContext, ReactNode, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Locale } from './config'
import { defaultLocale, getLocaleFromRoute } from './config'
import en from './dictionaries/en'
import zh from './dictionaries/zh'
import ja from './dictionaries/ja'
import ko from './dictionaries/ko'
import es from './dictionaries/es'
import de from './dictionaries/de'
import fr from './dictionaries/fr'
import id from './dictionaries/id'

type DeepWiden<T> =
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends readonly (infer U)[] ? readonly DeepWiden<U>[] :
  T extends object ? { [K in keyof T]: DeepWiden<T[K]> } :
  T

type Dictionary = DeepWiden<typeof en>

const dictionaries: Record<Locale, Dictionary> = {
  en,
  zh,
  ja,
  ko,
  es,
  de,
  fr,
  id,
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

function I18nStateProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  const [route, setRoute] = useState({ locale: initialLocale, key: 'initial' })
  const routeKey = route.key
  const [override, setOverride] = useState<{ locale: Locale; routeKey: string } | null>(null)
  const locale = override?.routeKey === routeKey ? override.locale : route.locale

  const onRoute = useCallback((nextLocale: Locale, key: string) => {
    setRoute(current => current.key === key && current.locale === nextLocale
      ? current
      : { locale: nextLocale, key })
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    // Keep the picker immediate while the matching route is streamed. Once
    // the URL changes, the route-derived locale becomes authoritative again.
    setOverride({ locale: newLocale, routeKey })
    try {
      localStorage.setItem('locale', newLocale)
    } catch {
      // Private browsing can disable storage. The active session still works.
    }
    document.documentElement.lang = newLocale
  }, [routeKey])

  const value = useMemo(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale, setLocale]
  )

  return (
    <I18nContext.Provider value={value}>
      {/* Only route observation may suspend. Keep the streamed page tree single
          and mounted; repeating children in a fallback races with hydration. */}
      <Suspense fallback={null}>
        <LocaleRouteObserver initialLocale={initialLocale} onRoute={onRoute} />
      </Suspense>
      {children}
    </I18nContext.Provider>
  )
}

function LocaleRouteObserver({
  initialLocale,
  onRoute,
}: {
  initialLocale?: Locale
  onRoute: (locale: Locale, key: string) => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // The route is authoritative when it specifies a locale. The provider syncs
  // this value in place so route changes preserve the already-rendered page
  // tree instead of tearing it down and mounting it again.
  const routeLocale = getLocaleFromRoute(pathname, searchParams.get('lang'), initialLocale)
  const routeKey = `${pathname || '/'}?${searchParams.toString()}`

  useEffect(() => onRoute(routeLocale, routeKey), [onRoute, routeLocale, routeKey])
  return null
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  return (
    <I18nStateProvider initialLocale={initialLocale}>{children}</I18nStateProvider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

// Helper function to replace placeholders in strings
export function interpolate(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''))
}
