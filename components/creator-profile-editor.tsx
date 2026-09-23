'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { studioCopy } from '@/lib/i18n/creator-studio-copy'
import { publicWebsite } from '@/lib/creator-profile'
import type { Locale } from '@/lib/i18n/config'

export type EditableCreator = {
  username: string; display_name: string; bio: string; website: string
  github_username: string; x_username: string
}
function Save({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus()
  return <button disabled={pending} className="min-h-11 bg-[#006b4f] px-6 py-3 font-semibold text-white disabled:opacity-50">{studioCopy(locale, pending ? 'saving' : 'save')}</button>
}
export function CreatorProfileEditor({ initial, handleLocked, githubVerified, xVerified, locale, action }: {
  initial: EditableCreator; handleLocked: boolean; githubVerified: boolean; xVerified: boolean; locale: Locale
  action: (data: FormData) => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const t = (key: Parameters<typeof studioCopy>[1]) => studioCopy(locale, key)
  const fields: { name: keyof EditableCreator; label: string; max: number; locked?: boolean; pattern?: string }[] = [
    { name: 'username', label: t('handle'), max: 40, locked: handleLocked, pattern: '[a-z0-9][a-z0-9-]{2,39}' },
    { name: 'display_name', label: t('name'), max: 80 },
    { name: 'website', label: t('website'), max: 300 },
    { name: 'github_username', label: 'GitHub', max: 39, locked: githubVerified },
    { name: 'x_username', label: 'X', max: 15, locked: xVerified, pattern: '[a-zA-Z0-9_]{0,15}' },
  ]
  return <div className="grid gap-8 lg:grid-cols-2">
    <form action={action} className="min-w-0 space-y-5">
      <input type="hidden" name="lang" value={locale} />
      <p className="text-sm leading-6 text-secondary">{t('privacy')}</p>
      {fields.map(field => <label key={field.name} className="block text-sm">
        <span className="mb-2 block">{field.label}</span>
        <input name={field.name} value={draft[field.name]} required={field.name === 'username'} type={field.name === 'website' ? 'url' : 'text'}
          maxLength={field.max} pattern={field.pattern} readOnly={field.locked}
          onChange={event => setDraft({ ...draft, [field.name]: event.target.value })}
          className="min-h-11 w-full border border-border bg-background px-3 py-2 outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#006b4f] read-only:bg-muted" />
        {field.name === 'username' && <span className="mt-2 block text-xs text-secondary">{t('stable')}</span>}
      </label>)}
      <label className="block text-sm"><span className="mb-2 block">{t('bio')}</span>
        <textarea name="bio" rows={4} maxLength={500} value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} className="w-full border border-border bg-background p-3 outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#006b4f]" />
        <span className="mt-1 block text-xs text-secondary">{draft.bio.length}/500</span>
      </label>
      <Save locale={locale} />
    </form>
    <aside className="min-w-0 self-start border-t-2 border-[#006b4f] bg-white/60 p-6 sm:p-8 lg:sticky lg:top-24" aria-label={t('preview')}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">{t('preview')}</p>
      <div className="my-8 grid size-16 place-items-center rounded-full bg-[#006b4f]/10 font-display text-3xl text-[#006b4f]">{(draft.display_name || draft.username || '?').slice(0, 1).toUpperCase()}</div>
      <h3 className="break-words font-display text-4xl">{draft.display_name || draft.username || t('name')}</h3>
      <p className="mt-5 whitespace-pre-wrap break-words text-base leading-7 text-secondary">{draft.bio || t('bio')}</p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#006b4f]">
        {draft.github_username && <span>GitHub</span>}{draft.x_username && <span>X</span>}{publicWebsite(draft.website) && <span>{t('website')}</span>}
      </div>
      <p className="mt-10 break-all border-t border-border pt-4 font-mono text-[11px] text-secondary">openagentskill.com/creators/{draft.username}</p>
    </aside>
  </div>
}
