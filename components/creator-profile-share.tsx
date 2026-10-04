'use client'
import { useState } from 'react'
import { studioCopy } from '@/lib/i18n/creator-studio-copy'
import type { Locale } from '@/lib/i18n/config'
import { accountXIntent } from '@/lib/account-workspace'
import { accountCopy } from '@/lib/i18n/account-copy'

export function CreatorProfileShare({ username, locale, shareOnX = false }: { username: string; locale: Locale; shareOnX?: boolean }) {
  const [status, setStatus] = useState<'share' | 'copied' | 'failed'>('share')
  const url = `https://www.openagentskill.com/creators/${encodeURIComponent(username)}`
  const intent = shareOnX ? accountXIntent(username, `OpenAgentSkill · @${username}`) : null
  return <div>
    {intent && <a href={intent} target="_blank" rel="noopener noreferrer" className="mr-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#006b4f] px-4 py-2 text-sm text-white">𝕏 {accountCopy(locale, 'shareX')}</a>}
    <button type="button" className="min-h-11 border border-border px-4 py-2 text-sm hover:border-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setStatus('copied') } catch { setStatus('failed') }
    }}>{studioCopy(locale, 'share')}</button>
    <span role="status" className="mt-2 block text-xs text-secondary">{status !== 'share' ? studioCopy(locale, status) : ''}</span>
    {status === 'failed' && <input readOnly value={url} aria-label={studioCopy(locale, 'profile')} className="w-full border border-border p-2 text-xs" onFocus={event => event.target.select()} />}
  </div>
}
