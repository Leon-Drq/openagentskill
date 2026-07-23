import { notFound } from 'next/navigation'
import { I18nProvider } from '@/lib/i18n/context'
import { isLocale, type Locale } from '@/lib/i18n/config'

export default async function LocalizedLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  if (!isLocale(locale) || locale === 'en') notFound()

  // A route-scoped provider gives the first rendered navigation and shared UI
  // the same locale as the URL, instead of waiting for client search params.
  return <I18nProvider initialLocale={locale as Locale}>{children}</I18nProvider>
}
