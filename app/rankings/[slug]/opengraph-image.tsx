import { rankingOgImage } from '@/lib/og/renderers'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return rankingOgImage((await params).slug)
}
