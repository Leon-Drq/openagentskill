'use client'

import NextLink, { useLinkStatus } from 'next/link'
import type { ComponentProps } from 'react'
import { crawlLinkRel } from '@/lib/seo/crawl-policy'
export type { LinkProps } from 'next/link'

/** A normal Next link; only crawl hints change for non-indexable utilities. */
function NavigationProgress() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <span className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 animate-pulse bg-[#006b4f]" role="progressbar" aria-label="Loading page"><span className="sr-only" role="status" aria-live="polite">Loading the next page</span></span>
}

export default function CrawlLink({ href, rel, children, ...props }: ComponentProps<typeof NextLink>) {
  const destination = typeof href === 'string' ? href : `${href.pathname || ''}${
    href.search || (href.query ? `?${typeof href.query === 'string' ? href.query : new URLSearchParams(
      Object.entries(href.query).flatMap(([key, value]) => value == null ? [] :
        (Array.isArray(value) ? value : [value]).map(item => [key, String(item)]))
    ).toString()}` : '')}`
  return <NextLink href={href} rel={crawlLinkRel(destination, rel)} {...props}>{children}<NavigationProgress /></NextLink>
}
