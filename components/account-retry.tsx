'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Locale } from '@/lib/i18n/config'
import { accountCopy } from '@/lib/i18n/account-copy'
import styles from './account-workspace.module.css'

export function AccountRetry({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return <button type="button" className={styles.textLink} disabled={pending} onClick={() => startTransition(() => router.refresh())}>{accountCopy(locale, 'retry')}</button>
}
