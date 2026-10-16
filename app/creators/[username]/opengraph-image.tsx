import { creatorOgImage } from '@/lib/og/renderers'

export const runtime = 'nodejs'
export const alt = 'OpenAgentSkill creator profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  return creatorOgImage((await params).username)
}
