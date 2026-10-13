import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase/public'
import type { SkillRecord } from '@/lib/db/skills'
import { PUBLIC_SKILL_FILTER } from '@/lib/skills/publication'
import { buildSkillAudit } from '@/lib/audits'
import { getAgentSafetyProfile } from '@/lib/agent-safety'
import { downloadableDocument } from '@/lib/skills/download-policy'
import { downloadResponse } from '@/lib/skills/downloads'
import { buyer, paymentBody, paymentError, PaymentError, productDefinition } from '@/lib/payments/server'
import { getSkillCommerce } from '@/lib/skills/commerce'

export const runtime = 'nodejs'
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    if (!/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug) || !z.object({}).strict().safeParse(await paymentBody(request)).success) throw new PaymentError('invalid_body')
    const user = await buyer()
    // No source-site proxy and no paid-content bypass. Read the public registry
    // afresh so a withdrawn listing cannot be downloaded from a stale snapshot.
    if (productDefinition(slug) || ['paid', 'freemium'].includes(getSkillCommerce(slug).type)) throw new PaymentError('package_unavailable', 409)
    const { data, error } = await createPublicClient({ requestTimeoutMs: 8000 }).from('skills').select('*').eq('slug', slug).or(PUBLIC_SKILL_FILTER).maybeSingle()
    if (error) throw error
    if (!data) throw new PaymentError('skill_not_found', 404)
    const skill = data as SkillRecord
    const bytes = downloadableDocument(skill)
    if (!bytes || getAgentSafetyProfile(skill, buildSkillAudit(skill)).blocked) throw new PaymentError('package_unavailable', 409)
    return await downloadResponse({ userId: user.id, slug, bytes, size: bytes.length,
      sha256: skill.source_content_hash!, kind: 'skill-document', filename: `${slug}-SKILL.md` })
  } catch (error) { return paymentError(error) }
}
