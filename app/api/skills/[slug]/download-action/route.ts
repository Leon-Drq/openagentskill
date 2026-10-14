import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { PUBLIC_SKILL_FILTER } from '@/lib/skills/publication'
import { getExternalSkill } from '@/lib/skills/external-catalog'
import { getCanonicalSkillSlug, SKILL_SLUG_ALIASES } from '@/lib/skill-slug-aliases'
import { getSkillSourceEvidence } from '@/lib/skills/source-evidence'
import { paymentBody, paymentError, PaymentError, paymentJson } from '@/lib/payments/server'

export const runtime = 'nodejs'
const Body = z.object({ action: z.enum(['command-copy', 'external-open']), sessionId: z.string().uuid() }).strict()

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const parsed = Body.safeParse(await paymentBody(request))
    let slug = getCanonicalSkillSlug((await params).slug)
    if (!parsed.success || !/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)) throw new PaymentError('invalid_body')
    const external = getExternalSkill(slug)
    if (external) {
      if ((external.provider === 'skillry' && !external.active) || parsed.data.action !== 'external-open') throw new PaymentError('action_unavailable', 409)
    } else {
      const db = createPublicClient({ requestTimeoutMs: 3000 })
      const columns = 'slug,source_path,source_commit_sha,source_content_hash,source_sync_status,ai_review_score,install_command,github_repo,repository'
      const aliases = Object.keys(SKILL_SLUG_ALIASES).filter(alias => SKILL_SLUG_ALIASES[alias] === slug)
      let { data, error } = await db.from('skills').select(columns).eq('slug', slug).or(PUBLIC_SKILL_FILTER).maybeSingle()
      if (!error && !data && aliases.length) {
        const fallback = await db.from('skills').select(columns).in('slug', aliases).or(PUBLIC_SKILL_FILTER).limit(1).maybeSingle()
        data = fallback.data; error = fallback.error
      }
      if (error) throw error
      if (!data) throw new PaymentError('skill_unavailable', 404)
      slug = data.slug
      if (parsed.data.action === 'command-copy' && !getSkillSourceEvidence(data).canOfferInstall) throw new PaymentError('action_unavailable', 409)
      if (parsed.data.action === 'external-open' && !data.github_repo && !data.repository) throw new PaymentError('action_unavailable', 409)
    }
    const { data: { user }, error: authError } = await (await createClient()).auth.getUser()
    // Guests already have a browser identifier for Skill events. Hash it before
    // writing the private ledger; do not store URLs, commands or IP addresses.
    if (authError && authError.name !== 'AuthSessionMissingError') throw authError
    const userId = user && !user.is_anonymous ? user.id : null
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
    if (!secret) throw new Error('download_metrics_unavailable')
    const visitorKey = userId ? null : createHmac('sha256', secret).update(`skill-download:${parsed.data.sessionId}`).digest('hex')
    const { error } = await createAdminClient({ requestTimeoutMs: 3000, circuitScope: 'telemetry' }).rpc('record_skill_download_action', {
      p_user_id: userId, p_visitor_key: visitorKey, p_slug: slug, p_kind: parsed.data.action,
    })
    if (error) throw error
    return paymentJson({ ok: true })
  } catch (error) { return paymentError(error) }
}
