'use client'
import { useI18n } from '@/lib/i18n/context'
import { getReviewEvidence } from '@/lib/skills/review-evidence'

const LABELS = {
  en: ['Indexed', 'Install path available', 'Static Checked', 'AI Reviewed', 'Creator Verified'],
  zh: ['已收录', '有安装路径', '静态检查通过', '已进行 AI 审核', '创作者已认证'],
  ja: ['登録済み', 'インストール手順あり', '静的チェック済み', 'AI レビュー済み', '作成者確認済み'],
  ko: ['등록됨', '설치 경로 있음', '정적 검사 완료', 'AI 검토 완료', '제작자 인증됨'],
  es: ['Indexado', 'Instalación disponible', 'Revisión estática', 'Revisado por IA', 'Creador verificado'],
  fr: ['Répertorié', 'Installation disponible', 'Contrôle statique', 'Examiné par IA', 'Créateur vérifié'],
  de: ['Erfasst', 'Installationsweg vorhanden', 'Statisch geprüft', 'KI-geprüft', 'Ersteller verifiziert'],
  id: ['Terindeks', 'Jalur instalasi tersedia', 'Diperiksa statis', 'Ditinjau AI', 'Kreator terverifikasi'],
}
export function SkillReviewEvidence({ evidence, installable }: { evidence: ReturnType<typeof getReviewEvidence>; installable: boolean }) {
  const { locale } = useI18n()
  const labels = LABELS[locale as keyof typeof LABELS] || LABELS.en
  const flags = [true, installable, evidence.static_checked, evidence.ai_reviewed, evidence.creator_verified]
  return <div className="mt-5 flex flex-wrap gap-2" data-review-evidence={evidence.policy_version || 'legacy-unverified'}>
    {flags.map((flag, i) => flag ? <span key={i} className="rounded border border-border px-2.5 py-1 text-xs text-secondary">{labels[i]}</span> : null)}
  </div>
}
