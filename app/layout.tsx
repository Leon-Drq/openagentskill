import type { Metadata } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import { StructuredData } from '@/components/structured-data'
import { I18nProvider } from '@/lib/i18n/context'
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
    default: 'Open Agent Skill — The Open Marketplace for AI Agent Skills',
    template: '%s | Open Agent Skill',
  },
  description: 'Discover AI agent skills ranked by real agent usage. Browse skills for data processing, automation, finance, coding, and more. Install any skill with npx skills add.',
  keywords: ['AI agents', 'agent skills', 'agent tools', 'Claude skills', 'GPT plugins', 'LangChain tools', 'autonomous agents', 'agent marketplace', 'open source AI', 'openagentskill'],
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
    description: 'Discover AI agent skills ranked by real agent usage. Browse skills for data processing, automation, finance, coding, and more.',
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
    description: 'Discover AI agent skills ranked by real agent usage. Browse skills for data processing, automation, finance, coding, and more.',
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
