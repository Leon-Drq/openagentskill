'use client'

import { useI18n } from '@/lib/i18n/context'
import {
  formatSkillDetailCopy,
  translateSkillDetailValue,
  type SkillDetailCopyKey,
} from '@/lib/i18n/skill-detail-copy'

export function SkillDetailText({
  id,
  values,
}: {
  id: SkillDetailCopyKey
  values?: Record<string, string | number>
}) {
  const { locale } = useI18n()
  return <>{formatSkillDetailCopy(locale, id, values)}</>
}

export function SkillDetailValue({ value }: { value: string }) {
  const { locale } = useI18n()
  return <>{translateSkillDetailValue(locale, value)}</>
}

const dateLocales = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
  de: 'de-DE',
  fr: 'fr-FR',
  id: 'id-ID',
} as const

export function SkillDetailDate({ value }: { value: string | null | undefined }) {
  const { locale } = useI18n()

  if (!value) return <SkillDetailValue value="Unknown" />

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return <SkillDetailValue value="Unknown" />

  return <>{date.toLocaleDateString(dateLocales[locale], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })}</>
}
