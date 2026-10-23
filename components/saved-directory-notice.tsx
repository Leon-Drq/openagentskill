import type { Locale } from '@/lib/i18n/config'

export type SavedDirectoryNoticeData = { savedFrom: string; savedThrough: string }
const copy: Record<Locale, string> = {
  en: 'Read-only saved selection · cache saved {from}–{through}. Partial coverage, not the live registry; new entries and metrics may be missing. Check the source before use.',
  zh: '只读备份精选 · 缓存保存于 {from} 至 {through}。这不是实时完整目录，可能缺少新收录及最新指标；使用前请核对来源。',
  ja: '保存済み一覧（読み取り専用）· 保存期間 {from}～{through}。全件の最新データではなく、新着や指標が欠ける場合があります。使用前に出典を確認してください。',
  ko: '읽기 전용 저장 목록 · 저장 기간 {from}–{through}. 전체 실시간 목록이 아니며 새 항목과 최신 지표가 누락될 수 있습니다. 사용 전 출처를 확인하세요.',
  es: 'Selección guardada de solo lectura · caché del {from} al {through}. Cobertura parcial, no el registro en vivo; pueden faltar novedades y métricas. Comprueba la fuente antes de usar.',
  de: 'Gespeicherte Auswahl (nur lesbar) · Cache vom {from} bis {through}. Kein vollständiges Live-Verzeichnis; neue Einträge und Kennzahlen können fehlen. Quelle vor Nutzung prüfen.',
  fr: 'Sélection sauvegardée en lecture seule · cache du {from} au {through}. Couverture partielle, pas le registre en direct ; nouveautés et mesures peuvent manquer. Vérifiez la source avant utilisation.',
  id: 'Pilihan tersimpan hanya-baca · cache disimpan {from}–{through}. Cakupan sebagian, bukan registri langsung; entri dan metrik terbaru mungkin belum tersedia. Periksa sumber sebelum digunakan.',
}

export function SavedDirectoryNotice({ locale, saved }: { locale: Locale; saved: SavedDirectoryNoticeData }) {
  const date = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const text = copy[locale].replace('{from}', date.format(new Date(saved.savedFrom))).replace('{through}', date.format(new Date(saved.savedThrough)))
  return <p role="status" data-saved-directory data-saved-through={saved.savedThrough} className="my-5 max-w-4xl border-l-2 border-[#006b4f]/40 pl-4 text-sm leading-6 text-secondary">{text} (UTC)</p>
}
