'use client'

import { useI18n } from '@/lib/i18n/context'
import { skillDocumentCopy, type DocumentCopyKey } from '@/lib/i18n/skill-document-copy'

export function SkillDocumentText({ id }: { id: DocumentCopyKey }) {
  const { locale } = useI18n()
  return <>{skillDocumentCopy(locale, id)}</>
}
