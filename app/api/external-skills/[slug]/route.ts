import { externalSkillDiscoveryRecord, getExternalSkill } from '@/lib/skills/external-catalog'

// Public discovery only. No POST handler, privileged client or install action.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const entry = getExternalSkill((await params).slug)
  if (!entry) return Response.json({ error: 'External skill not found' }, { status: 404, headers: { 'X-Robots-Tag': 'noindex' } })
  return Response.json(externalSkillDiscoveryRecord(entry), { headers: {
    'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex',
  } })
}
