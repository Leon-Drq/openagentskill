import type { Metadata } from 'next'
import { Crimson_Text, EB_Garamond, IBM_Plex_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { StructuredData } from '@/components/structured-data'
import { I18nProvider } from '@/lib/i18n/context'
import './globals.css'

const crimsonText = Crimson_Text({ 
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const ebGaramond = EB_Garamond({ 
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({ 
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://openagentskill.com'),
  title: {
    default: 'Open Agent Skill — The Open Infrastructure for Agent Intelligence',
    template: '%s | Open Agent Skill',
  },
  description: 'The open infrastructure for agent intelligence. Humans and agents discover, publish, compose, and share skills together. Install any skill with npx skills add <owner/repo>.',
  keywords: ['AI agents', 'agent skills', 'agent infrastructure', 'skill protocol', 'MCP', 'autonomous agents', 'LangChain', 'Claude', 'GPT-4', 'Cursor', 'agent interoperability', 'openagentskill'],
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
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: '32x32',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Open Agent Skill — The Open Infrastructure for Agent Intelligence',
    description: 'Humans and agents discover, publish, compose, and share skills together. The open infrastructure for agent intelligence.',
    url: 'https://openagentskill.com',
    siteName: 'Open Agent Skill',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Open Agent Skill — The Open Infrastructure for Agent Intelligence',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Agent Skill — The Open Infrastructure for Agent Intelligence',
    description: 'Humans and agents discover, publish, compose, and share skills together. The open infrastructure for agent intelligence.',
    creator: '@openagentskill',
    site: '@openagentskill',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://openagentskill.com',
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${crimsonText.variable} ${ebGaramond.variable} ${ibmPlexMono.variable}`}>
      <head>
        <StructuredData />
      </head>
      <body className="font-serif antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
