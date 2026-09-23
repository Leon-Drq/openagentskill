'use client'
import { useState } from 'react'
import { studioCopy } from '@/lib/i18n/creator-studio-copy'
import type { Locale } from '@/lib/i18n/config'

export function CreatorProfileShare({ username, locale }: { username: string; locale: Locale }) {
  const [status, setStatus] = useState<'share' | 'copied' | 'failed'>('share')
  const url = `https://www.openagentskill.com/creators/${encodeURIComponent(username)}`
  return <div>
    <button type="button" className="min-h-11 border border-border px-4 py-2 text-sm hover:border-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setStatus('copied') } catch { setStatus('failed') }
    }}>{studioCopy(locale, 'share')}</button>
    <span role="status" className="mt-2 block text-xs text-secondary">{status !== 'share' ? studioCopy(locale, status) : ''}</span>
    {status === 'failed' && <input readOnly value={url} aria-label={studioCopy(locale, 'profile')} className="w-full border border-border p-2 text-xs" onFocus={event => event.target.select()} />}
  </div>
}
