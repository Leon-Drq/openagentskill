'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { CREATOR_AREAS } from '@/lib/creator-directory'
import type { Locale } from '@/lib/i18n/config'
import { creatorCopy, type CreatorMessage } from '@/lib/i18n/creator-copy'

export function CreatorDirectoryFilters({
  locale,
  query,
  area,
  sort,
}: {
  locale: Locale
  query: string
  area: string
  sort: string
}) {
  const router = useRouter(),
    [pending, startTransition] = useTransition()
  const t = (k: CreatorMessage) => creatorCopy(locale, k)
  return (
    <form
      key={`${query}:${area}:${sort}`}
      action="/creators"
      method="get"
      aria-busy={pending}
      className="grid gap-4 border-y border-border py-5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget),
          params = new URLSearchParams()
        for (const [key, value] of data)
          if (String(value).trim()) params.set(key, String(value).trim())
        startTransition(() =>
          router.push(`/creators${params.size ? '?' + params : ''}`, {
            scroll: false,
          }),
        )
      }}
    >
      {locale !== 'en' && <input type="hidden" name="lang" value={locale} />}
      <label className="grid min-w-0 gap-2 text-xs text-secondary">
        {t('Search creators or projects')}
        <input
          type="search"
          name="q"
          defaultValue={query}
          maxLength={100}
          className="h-11 w-full border border-border bg-background px-3 text-sm text-foreground"
        />
      </label>
      <label className="grid gap-2 text-xs text-secondary">
        {t('Field')}
        <select
          name="area"
          defaultValue={area}
          className="h-11 max-w-full border border-border bg-background px-3 text-sm text-foreground"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="">{t('All fields')}</option>
          {CREATOR_AREAS.map((a) => (
            <option key={a} value={a}>
              {t(a)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-xs text-secondary">
        {t('Sort by')}
        <select
          name="sort"
          defaultValue={sort}
          className="h-11 max-w-full border border-border bg-background px-3 text-sm text-foreground"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="stars">{t('Repository stars')}</option>
          <option value="recent">{t('Recently updated')}</option>
          <option value="editorial">{t('Editor selected')}</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-[#006b4f] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {t('Search')}
      </button>
    </form>
  )
}
