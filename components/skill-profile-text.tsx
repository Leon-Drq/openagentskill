'use client'

import { useI18n } from '@/lib/i18n/context'
import { skillProfileCopy, type SkillProfileCopyKey } from '@/lib/i18n/skill-profile-copy'

export function SkillProfileText({ id }: { id: SkillProfileCopyKey }) {
  const { locale } = useI18n()
  return <>{skillProfileCopy(locale, id)}</>
}
