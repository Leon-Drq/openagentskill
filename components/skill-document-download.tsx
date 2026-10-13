'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { downloadCopy } from '@/lib/i18n/download-copy'
import { downloadFile } from '@/lib/download-file'

export function SkillDocumentDownload({ slug }: { slug: string }) {
  const { locale } = useI18n(), router = useRouter()
  const [busy, setBusy] = useState(false), [error, setError] = useState(false)
  const c = downloadCopy(locale)
  return <div className="mt-4">
    <button type="button" disabled={busy} aria-busy={busy} className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-border px-4 text-sm text-[#006b4f] hover:bg-card disabled:opacity-50" onClick={async () => {
      setBusy(true); setError(false)
      try { await downloadFile(`/api/skills/${encodeURIComponent(slug)}/download`, {}) }
      catch (error) {
        if (error instanceof Error && error.message === 'sign_in_required') router.push(`/auth/login?lang=${locale}&next=${encodeURIComponent(window.location.pathname + window.location.search + '#install-options')}`)
        else setError(true)
      } finally { setBusy(false) }
    }}><Download size={16} aria-hidden="true" />{c.action}</button>
    <p className="mt-2 text-xs leading-6 text-secondary">{c.document}</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{c.failed}</p>}
  </div>
}
