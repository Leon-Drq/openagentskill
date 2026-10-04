'use client'

import { useFormStatus } from 'react-dom'
import type { Locale } from '@/lib/i18n/config'
import { accountCopy } from '@/lib/i18n/account-copy'
import styles from './account-workspace.module.css'

function Submit({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus()
  return <button className={styles.primary} type="submit" disabled={pending}>{accountCopy(locale, pending ? 'saving' : 'save')}</button>
}
export function AccountSettingsForm({ locale, email, initial, action }: {
  locale: Locale; email: string; initial: { display_name: string; bio: string; website: string }; action: (form: FormData) => Promise<void>
}) {
  const c = (key: Parameters<typeof accountCopy>[1]) => accountCopy(locale, key)
  return <form className={styles.form} action={action}>
    <input type="hidden" name="lang" value={locale} />
    <label>{c('email')}<input value={email} readOnly type="email" autoComplete="email" /></label>
    <label>{c('name')}<input name="display_name" defaultValue={initial.display_name} maxLength={80} autoComplete="nickname" /></label>
    <label>{c('bio')}<textarea name="bio" defaultValue={initial.bio} maxLength={500} rows={4} /></label>
    <label>{c('website')}<input name="website" defaultValue={initial.website} maxLength={300} type="url" autoComplete="url" /></label>
    <p className="text-xs leading-6 text-secondary">{c('privacy')}</p>
    <div><Submit locale={locale} /></div>
  </form>
}
