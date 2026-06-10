export const locales = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  de: 'German',
  fr: 'French',
}

export const localeNativeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
}

export const localeShortLabels: Record<Locale, string> = {
  en: 'EN',
  zh: 'ZH',
  ja: 'JA',
  ko: 'KO',
  es: 'ES',
  de: 'DE',
  fr: 'FR',
}

export const localePaths: Record<Locale, string> = {
  en: '/',
  zh: '/zh',
  ja: '/ja',
  ko: '/ko',
  es: '/es',
  de: '/de',
  fr: '/fr',
}

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale)
}
