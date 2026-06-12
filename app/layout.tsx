import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { StructuredData } from '@/components/structured-data'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocalizedLanguageAlternates } from '@/lib/seo/localized-pages'
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
    default: 'AI Agent Skills Registry & Recommendation API | OpenAgentSkill',
    template: '%s | Open Agent Skill',
  },
  description: 'Let your AI agent find and install the right skill automatically. OpenAgentSkill is an AI agent skills registry, audit layer, and recommendation API for Codex, Claude Code, Cursor, and other agent workflows.',
  keywords: ['AI agent skills registry', 'AI agent skills directory', 'agent skill', 'agent skills', 'AgentSkill', 'agent tools', 'Claude Code skills', 'Codex skills', 'Cursor skills', 'agent recommendation API', 'openagentskill'],
  authors: [{ name: 'Open Agent Skill Team' }],
  creator: 'Open Agent Skill',
  publisher: 'Open Agent Skill',
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
    title: 'AI Agent Skills Registry & Recommendation API | OpenAgentSkill',
    description: 'Let your AI agent find and install the right skill automatically. Discover, compare, audit, and install reusable AI agent skills.',
    url: 'https://www.openagentskill.com',
    siteName: 'Open Agent Skill',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://www.openagentskill.com/opengraph-image?v=2',
        width: 1200,
        height: 630,
        alt: 'OpenAgentSkill — The Open Marketplace for AI Agent Skills',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Skills Registry & Recommendation API | OpenAgentSkill',
    description: 'Let your AI agent find and install the right skill automatically. Discover, compare, audit, and install reusable AI agent skills.',
    creator: '@openagentskill',
    site: '@openagentskill',
    images: ['https://www.openagentskill.com/opengraph-image?v=2'],
  },
  alternates: {
    canonical: 'https://www.openagentskill.com',
    languages: getLocalizedLanguageAlternates(),
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
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
