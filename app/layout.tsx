import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { StructuredData } from '@/components/structured-data'
import { I18nProvider } from '@/lib/i18n/context'
import { LOCALIZED_LANDING_PAGES } from '@/lib/seo/localized-pages'
import {
  HOME_SOCIAL_DESCRIPTION,
  HOME_SOCIAL_IMAGE_URL,
  HOME_SOCIAL_TITLE,
  SITE_URL,
} from '@/lib/seo/social'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.openagentskill.com'),
  title: {
    default: HOME_SOCIAL_TITLE,
    template: '%s | OpenAgentSkill',
  },
  description: 'The skill layer for AI agents. Let your AI agent find, compare, and install the right reusable skill automatically. OpenAgentSkill is npm for AI Agent Skills.',
  keywords: ['AI agent skills registry', 'AI agent skills directory', 'agent skill', 'agent skills', 'AgentSkill', 'agent tools', 'Claude Code skills', 'Codex skills', 'Cursor skills', 'agent recommendation API', 'openagentskill'],
  authors: [{ name: 'OpenAgentSkill' }],
  creator: 'OpenAgentSkill',
  publisher: 'OpenAgentSkill',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon-48x48.png',
        sizes: '48x48',
        type: 'image/png',
      },
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        url: '/favicon.ico',
        sizes: '16x16 32x32 48x48',
        type: 'image/x-icon',
      },
    ],
    shortcut: '/icon.svg',
    apple: [
      {
        url: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  openGraph: {
    title: HOME_SOCIAL_TITLE,
    description: HOME_SOCIAL_DESCRIPTION,
    url: SITE_URL,
    siteName: 'OpenAgentSkill',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: HOME_SOCIAL_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'OpenAgentSkill — The skill layer for AI agents',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_SOCIAL_TITLE,
    description: HOME_SOCIAL_DESCRIPTION,
    creator: '@openagentskill',
    site: '@openagentskill',
    images: [
      {
        url: HOME_SOCIAL_IMAGE_URL,
        alt: 'OpenAgentSkill — The skill layer for AI agents',
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params?: Promise<{ locale?: string }>
}>) {
  const resolvedParams = params ? await params : {}
  const locale = resolvedParams?.locale
  const lang =
    locale && locale in LOCALIZED_LANDING_PAGES
      ? LOCALIZED_LANDING_PAGES[locale as keyof typeof LOCALIZED_LANDING_PAGES].lang
      : 'en'

  return (
    <html lang={lang} className={`${inter.variable} ${geistMono.variable}`}>
      <head>
        <StructuredData />
      </head>
      <body className="font-sans antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  )
}
