'use client'

import { useState } from 'react'
import { Check, Clipboard } from 'lucide-react'
import { copyText } from '@/lib/copy-text'
import { useI18n } from '@/lib/i18n/context'
import { handoffCopy } from '@/lib/i18n/handoff-copy'
import { formatSkillDetailCopy } from '@/lib/i18n/skill-detail-copy'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import type { SkillInstallTarget } from '@/lib/install-targets'

export function SkillAgentCopy({ skillSlug, target, className }: { skillSlug: string; target?: SkillInstallTarget; className?: string }) {
  const { locale } = useI18n()
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  if (!target) return null
  const copyTarget = target
  async function copy() {
    try {
      if (!await copyText(copyTarget.value)) throw new Error('Clipboard unavailable')
      setStatus('copied')
      if (copyTarget.title !== 'Source review prompt') trackSkillEvent(skillSlug, 'install_copy', { target: copyTarget.id, kind: copyTarget.kind })
    } catch { setStatus('failed') }
  }
  return <div className="min-w-0 max-w-full">
    <button type="button" onClick={copy} className={className}>
      {status === 'copied' ? <Check size={16} aria-hidden="true" /> : <Clipboard size={16} aria-hidden="true" />}
      {status === 'copied' ? formatSkillDetailCopy(locale, 'copied') : handoffCopy(locale, 'copyAgent')}
    </button>
    <p role="status" aria-live="polite" className="mt-1 max-w-sm text-xs leading-5 text-secondary">
      {status === 'failed' ? handoffCopy(locale, 'failed') : status === 'copied' ? handoffCopy(locale, 'next') : null}
    </p>
    {status === 'failed' && <textarea readOnly value={target.value} aria-label={handoffCopy(locale, 'copyAgent')} className="mt-2 w-full rounded border border-border p-2 text-xs" onFocus={event => event.currentTarget.select()} />}
  </div>
}
