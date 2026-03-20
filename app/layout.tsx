import type { Metadata } from 'next'
import { Crimson_Text, EB_Garamond, IBM_Plex_Mono } from 'next/font/google'
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
  metadataBase: new URL('https://www.openagentskill.com'),
  title: {
    default: 'Open Agent Skill — The Open Marketplace for AI Agent Skills',
    template: '%s | Open Agent Skill',
  },
  description: 'Discover 35+ AI agent skills ranked by real agent usage. Browse skills for data processing, automation, finance, and more. Install any skill with npx skills add.',
  keywords: ['AI agents', 'agent skills', 'MCP server', 'agent tools', 'Claude skills', 'GPT plugins', 'LangChain tools', 'autonomous agents', 'agent marketplace', 'open source AI', 'openagentskill'],
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
    title: 'Open Agent Skill — The Open Marketplace for AI Agent Skills',
    description: 'Discover 35+ AI agent skills ranked by real agent usage. Browse skills for data processing, automation, finance, and more.',
    url: 'https://www.openagentskill.com',
    siteName: 'Open Agent Skill',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://www.openagentskill.com/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Open Agent Skill — The Open Marketplace for AI Agent Skills',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Agent Skill — The Open Marketplace for AI Agent Skills',
    description: 'Discover 35+ AI agent skills ranked by real agent usage. Browse skills for data processing, automation, finance, and more.',
    creator: '@openagentskill',
    site: '@openagentskill',
    images: ['https://www.openagentskill.com/opengraph-image'],
  },
  alternates: {
    canonical: 'https://www.openagentskill.com',
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
      </body>
    </html>
  )
}
