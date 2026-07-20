'use client'

import { createContext, ReactNode, Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { Locale } from './config'
import { defaultLocale, isLocale } from './config'
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

function getLocaleFromPath(pathname: string): Locale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  return isLocale(firstSegment) ? firstSegment : null
}

function getLocaleFromSearch(value: string | null): Locale | null {
  return isLocale(value) ? value : null
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
  routeKey,
}: {
  children: ReactNode
  initialLocale?: Locale
  routeKey: string
}) {
  const [override, setOverride] = useState<{ locale: Locale; routeKey: string } | null>(null)
  const locale = override?.routeKey === routeKey ? override.locale : initialLocale

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
      {children}
    </I18nContext.Provider>
  )
}

function I18nProviderWithSearch({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // The route is authoritative when it specifies a locale. The provider syncs
  // this value in place so route changes preserve the already-rendered page
  // tree instead of tearing it down and mounting it again.
  const routeLocale =
    getLocaleFromPath(pathname || '') ||
    getLocaleFromSearch(searchParams.get('lang')) ||
    initialLocale ||
    defaultLocale
  const routeKey = `${pathname || '/'}?${searchParams.toString()}`

  return (
    <I18nStateProvider initialLocale={routeLocale} routeKey={routeKey}>
      {children}
    </I18nStateProvider>
  )
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  return (
    <Suspense fallback={<I18nStateProvider initialLocale={initialLocale} routeKey="initial">{children}</I18nStateProvider>}>
      <I18nProviderWithSearch initialLocale={initialLocale}>{children}</I18nProviderWithSearch>
    </Suspense>
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
