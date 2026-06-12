'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import type { Locale } from './config'
import { defaultLocale, isLocale } from './config'
import en from './dictionaries/en'
import zh from './dictionaries/zh'
import ja from './dictionaries/ja'
import ko from './dictionaries/ko'
import es from './dictionaries/es'
import de from './dictionaries/de'
import fr from './dictionaries/fr'

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
}

function getLocaleFromPath(pathname: string): Locale | null {
  if (pathname === '/') return 'en'
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  return isLocale(firstSegment) ? firstSegment : null
}

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  // Keep locale synced with localized routes and browser preference.
  useEffect(() => {
    const pathLocale = getLocaleFromPath(pathname || window.location.pathname)
    if (pathLocale) {
      setLocaleState(pathLocale)
      localStorage.setItem('locale', pathLocale)
      document.documentElement.lang = pathLocale
      return
    }

    const savedLocale = localStorage.getItem('locale')
    if (isLocale(savedLocale)) {
      setLocaleState(savedLocale)
      document.documentElement.lang = savedLocale
    }
  }, [pathname])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
    // Update html lang attribute
    document.documentElement.lang = newLocale
  }

  const t = dictionaries[locale]

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
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
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] || ''))
}
