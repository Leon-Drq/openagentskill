'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { previewCopy } from '@/lib/skill-preview-shared'

/** Keep the reserved frame and its accessible description when a source fails. */
export function SkillPreviewImage({ locale, ...props }: ImageProps & { locale: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const source = typeof props.src === 'string' ? props.src : null
  if (source && failed === source) return <span role="img" aria-label={props.alt} data-media-unavailable
    className={`${props.fill ? 'absolute inset-0' : 'w-full'} flex min-h-32 flex-col items-center justify-center gap-2 bg-[#eeece5] p-4 text-center text-xs text-[#6d675e]`}
    style={!props.fill && props.width && props.height ? { aspectRatio: `${props.width} / ${props.height}` } : undefined}>
    <ImageOff size={20} aria-hidden="true" />{previewCopy('unavailable', locale)}
  </span>
  return <Image {...props} alt={props.alt} onError={event => { setFailed(source); props.onError?.(event) }} />
}
