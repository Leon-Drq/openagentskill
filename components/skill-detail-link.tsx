'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

type SkillDetailLinkProps = ComponentProps<typeof NextLink>

function shouldLocalize(href: string) {
  return href.startsWith('/') &&
    !href.startsWith('/api/') &&
    !href.startsWith('/auth/') &&
    !href.startsWith('/openapi') &&
    !href.startsWith('/.well-known/') &&
    !href.endsWith('.json') &&
    !href.endsWith('.txt')
}

export function SkillDetailLink({ href, ...props }: SkillDetailLinkProps) {
  const { locale } = useI18n()
  const localizedHref =
    typeof href === 'string' && shouldLocalize(href)
      ? getLocalizedNavigationHref(href, locale)
      : href

  return <NextLink href={localizedHref} {...props} />
}
