import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { StoreShell } from '@/components/storefront/shell'

export const metadata: Metadata = {
  title: 'Workflow store preview',
  description: 'Local interactive preview of the OpenAgentSkill workflow store.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_STOREFRONT_PREVIEW !== 'true') notFound()
  return <Suspense fallback={<main aria-busy="true" className="p-10">Loading preview…</main>}><StoreShell>{children}</StoreShell></Suspense>
}
