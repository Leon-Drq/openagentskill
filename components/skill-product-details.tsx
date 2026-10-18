'use client'

import { useI18n } from '@/lib/i18n/context'
import { productMetadataCopy } from '@/lib/i18n/product-metadata-copy'
import { readProductMetadata, type SkillProductMetadata } from '@/lib/skills/product-metadata'
import { SkillActionLink } from '@/components/skill-action-link'

export function SkillProductDetails({ metadata, skillSlug }: { metadata: SkillProductMetadata; skillSlug?: string }) {
  const { locale } = useI18n()
  const product = readProductMetadata(metadata)
  if (!Object.keys(product).length) return null
  return <div className="my-6 rounded-xl border border-border bg-card p-5 sm:p-6" data-product-details>
    <h3 className="text-lg font-semibold">{productMetadataCopy(locale, 'title')}</h3>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">{(['websiteUrl', 'documentationUrl', 'exampleUrl'] as const).map(key => {
      const href = product[key]
      if (!href) return null
      const className = 'inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4'
      const label = <>{productMetadataCopy(locale, key)} ↗</>
      return skillSlug ? <SkillActionLink key={key} href={href} skillSlug={skillSlug} eventType="outbound_docs" external rel="noopener noreferrer ugc" className={className} metadata={{ source: 'product-details', field: key }}>{label}</SkillActionLink> : <a key={key} href={href} target="_blank" rel="noopener noreferrer ugc" className={className}>{label}</a>
    })}</div>
    <dl className="space-y-5">{(['prerequisites', 'runtimeNotes'] as const).map(key => product[key] && <div key={key}>
      <dt className="text-sm font-semibold">{productMetadataCopy(locale, key)}</dt><dd className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-secondary [overflow-wrap:anywhere]">{product[key]}</dd>
    </div>)}</dl>
    <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-secondary">{productMetadataCopy(locale, 'note')}</p>
  </div>
}
