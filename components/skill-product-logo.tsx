'use client'

import { useState } from 'react'
import { readProductMetadata } from '@/lib/skills/product-metadata'

export function SkillProductLogo({ url, name, size = 'md' }: { url: string; name: string; size?: 'md' | 'lg' }) {
  const [failedUrl, setFailedUrl] = useState('')
  const safeUrl = readProductMetadata({ logoUrl: url }).logoUrl
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-card ${size === 'lg' ? 'size-12' : 'size-10'}`}>
    {safeUrl && failedUrl !== safeUrl ? (
      // Direct browser image avoids server-side URL fetching and image-transform charges.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={safeUrl} alt={`${name} logo`} width={48} height={48} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} className="h-full w-full object-contain p-1" />
    ) : <span aria-label={name} className="text-sm font-semibold text-secondary">{name.slice(0, 1)}</span>}
  </span>
}
