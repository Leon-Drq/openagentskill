import { ImageResponse } from 'next/og'
import { HomeSocialCard } from '@/components/og/home'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export function GET() {
  return new ImageResponse(<HomeSocialCard />, {
    width: 1200, height: 630,
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=7200, stale-while-revalidate=86400' },
  })
}
