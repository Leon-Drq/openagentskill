import { shortlistOgImage } from '@/lib/og/renderers'

export const runtime = 'nodejs'
export const alt = 'OpenAgentSkill task shortlist'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ lane: string }> }) {
  return shortlistOgImage((await params).lane)
}
