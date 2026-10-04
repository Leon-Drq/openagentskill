'use client'

import { useState } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { accountCopy } from '@/lib/i18n/account-copy'
import styles from './account-workspace.module.css'

export function AccountCopyLink({ url, locale }: { url: string; locale: Locale }) {
  const [state, setState] = useState<'copy' | 'copied' | 'copyError'>('copy')
  async function copy() { try { await navigator.clipboard.writeText(url); setState('copied') } catch { setState('copyError') } }
  return <><div className={styles.actions}><input className="min-w-0 flex-1 rounded-md border border-border bg-transparent px-3 text-xs" aria-label={url} value={url} readOnly onFocus={event => event.target.select()} /><button type="button" className={styles.secondary} onClick={copy}>{accountCopy(locale, state === 'copyError' ? 'copy' : state)}</button></div><p role="status" className="mt-2 text-xs text-secondary">{state === 'copyError' ? accountCopy(locale, state) : state === 'copied' ? accountCopy(locale, state) : ''}</p></>
}
