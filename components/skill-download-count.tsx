import { Download } from 'lucide-react'
import { downloadCopy } from '@/lib/i18n/download-copy'
import type { Locale } from '@/lib/i18n/config'

export function SkillDownloadCount({ count, locale }: { count?: number | null; locale: Locale }) {
  const c = downloadCopy(locale)
  const known = typeof count === 'number' && Number.isFinite(count) && count >= 0
  const value = known ? new Intl.NumberFormat(locale).format(count) : '—'
  return <span data-site-downloads={known ? count : 'unknown'} title={known ? c.note : c.unknown}
    aria-label={`${c.label}: ${value}. ${known ? c.note : c.unknown}`}
    className="inline-flex shrink-0 items-center gap-1 text-xs text-secondary">
    <Download size={14} aria-hidden="true" /><span className="tabular-nums">{value}</span>
  </span>
}
