'use client'

import { useState } from 'react'
import { copyText } from '@/lib/copy-text'
import { trackAnalyticsEvent } from '@/lib/analytics'

export function TaskBriefCopy({ text, topic }: { text: string; topic: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  async function copy() {
    try {
      if (!await copyText(text)) { setState('failed'); return }
      setState('copied')
      trackAnalyticsEvent('task_brief_copy', { topic_slug: topic })
    } catch { setState('failed') }
  }
  return <div className="mt-4">
    <button type="button" onClick={copy} className="inline-flex min-h-11 min-w-44 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4">{state === 'copied' ? 'Copied' : 'Copy task brief'}</button>
    <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm text-secondary">{state === 'failed' ? 'Copy unavailable. Select and copy the brief above.' : state === 'copied' ? 'Paste it into your agent and supply the listed inputs.' : 'Review the brief and add your own inputs before running it.'}</p>
  </div>
}
