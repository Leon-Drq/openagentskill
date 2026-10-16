import { skillOgImage } from '@/lib/og/skill'

export const runtime = 'nodejs'
export const alt = 'OpenAgentSkill skill preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return skillOgImage((await params).slug)
}
