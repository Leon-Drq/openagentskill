'use client'

import { useId } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { productMetadataCopy } from '@/lib/i18n/product-metadata-copy'
import { PRODUCT_FIELDS, type SkillProductMetadata } from '@/lib/skills/product-metadata'

export function SkillProductFields({ name, path, value, onChange, errors, disabled, inputClass }: {
  name: string; path: string; value: SkillProductMetadata; onChange: (value: SkillProductMetadata) => void
  errors: Record<string, string>; disabled: boolean; inputClass: string
}) {
  const { locale } = useI18n()
  const id = useId()
  const c = (key: Parameters<typeof productMetadataCopy>[1]) => productMetadataCopy(locale, key)
  return <fieldset disabled={disabled} className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
    <legend className="max-w-full px-2 text-sm font-semibold break-words">{name} · {c('optional')}</legend>
    <p className="mb-4 text-xs leading-5 text-secondary">{c('hint')}</p>
    <div className="grid min-w-0 gap-5 sm:grid-cols-2">{PRODUCT_FIELDS.map(key => {
      const error = errors[`${path}:${key}`]
      const isText = !key.endsWith('Url')
      const hint = key === 'logoUrl' ? c('logoHint') : key === 'prerequisites' ? c('prerequisitesHint') : undefined
      const props = { id: `${id}-${key}`, value: value[key] || '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [key]: e.target.value }), maxLength: isText ? 2000 : 1000, className: inputClass, 'aria-invalid': Boolean(error), 'aria-describedby': `${hint ? `${id}-${key}-hint ` : ''}${error ? `${id}-${key}-error` : ''}`.trim() || undefined }
      return <div key={key} className={isText || key === 'logoUrl' ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
        <label htmlFor={props.id} className="mb-2 block text-sm font-medium">{c(key)}</label>
        {isText ? <textarea {...props} rows={3} /> : <input {...props} type="url" placeholder="https://…" />}
        {hint && <p id={`${id}-${key}-hint`} className="mt-2 text-xs leading-5 text-secondary">{hint}</p>}
        {error && <p id={`${id}-${key}-error`} role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    })}</div>
  </fieldset>
}
