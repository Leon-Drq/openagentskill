import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { directoryCopy, directoryLabel } from '@/lib/i18n/directory-copy'
import { paginationItems } from '@/lib/skills/pagination'

export function DirectoryPagination({ page, totalPages, previous, next, locale, href, onNavigate }: {
  page: number
  totalPages: number | null
  previous: boolean
  next: boolean
  locale: Locale
  href: (page: number) => string
  onNavigate: (destination: string) => (event: { preventDefault: () => void }) => void
}) {
  const copy = directoryCopy(locale)
  const number = (value: number) => value.toLocaleString(locale)
  const summary = totalPages === null ? `${copy.page} ${number(page)}`
    : directoryLabel(locale, 'pageSummary').replace('{page}', number(page)).replace('{total}', number(totalPages))
  const linkClass = 'inline-flex h-11 min-w-11 items-center justify-center rounded-[6px] border border-border px-2 text-sm transition-colors hover:border-[#006b4f] hover:text-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f]'
  const pageLinks = (compact: boolean) => totalPages !== null && paginationItems(page, totalPages, compact).map(item =>
    typeof item !== 'number' ? <span key={item} aria-hidden="true" className="inline-flex w-3 items-center justify-center text-secondary sm:w-5">…</span>
      : item === page ? <span key={item} aria-current="page" aria-label={directoryLabel(locale, 'pageNumber').replace('{page}', number(item))} className="inline-flex h-11 min-w-11 items-center justify-center rounded-[6px] border border-[#006b4f] bg-[#006b4f] px-2 text-sm font-semibold text-white">{number(item)}</span>
      : <Link key={item} href={href(item)} prefetch={false} scroll={false} onNavigate={onNavigate(href(item))} aria-label={directoryLabel(locale, 'pageNumber').replace('{page}', number(item))} className={linkClass}>{number(item)}</Link>,
  )

  return (
    <nav aria-label={directoryLabel(locale, 'pagination')} className="mt-8 flex flex-col items-center gap-4 border-t border-border pt-6 lg:flex-row lg:justify-between" data-directory-pagination>
      <span className="font-mono text-xs text-secondary" data-page-summary>{summary}</span>
      <div className="flex items-center gap-1 sm:gap-2">
        {previous ? <Link rel="prev" href={href(page - 1)} prefetch={false} scroll={false} onNavigate={onNavigate(href(page - 1))} aria-label={copy.previous} className={linkClass}><ChevronLeft size={16} aria-hidden="true" /></Link>
          : <span aria-disabled="true" aria-label={copy.previous} className="inline-flex h-11 w-11 items-center justify-center rounded-[6px] border border-border text-secondary/40"><ChevronLeft size={16} aria-hidden="true" /></span>}
        <div className="flex items-center gap-1 sm:hidden" data-pagination-mobile>{pageLinks(true)}</div>
        <div className="hidden items-center gap-2 sm:flex" data-pagination-desktop>{pageLinks(false)}</div>
        {next ? <Link rel="next" href={href(page + 1)} prefetch={false} scroll={false} onNavigate={onNavigate(href(page + 1))} aria-label={copy.next} className={linkClass}><ChevronRight size={16} aria-hidden="true" /></Link>
          : <span aria-disabled="true" aria-label={copy.next} className="inline-flex h-11 w-11 items-center justify-center rounded-[6px] border border-border text-secondary/40"><ChevronRight size={16} aria-hidden="true" /></span>}
      </div>
    </nav>
  )
}
