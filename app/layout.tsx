import type { Metadata } from 'next'
import { Crimson_Text, EB_Garamond, IBM_Plex_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
  title: 'Open Agent Skill - The Open Marketplace for AI Agent Skills',
  description: 'Discover, share, and compose Agent Skills. An open ecosystem for building the future of autonomous AI agents.',
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
    title: 'Open Agent Skill',
    description: 'The Open Marketplace for AI Agent Skills',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${crimsonText.variable} ${ebGaramond.variable} ${ibmPlexMono.variable}`}>
      <body className="font-serif antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
