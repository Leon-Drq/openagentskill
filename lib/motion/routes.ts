import type { Locale } from '@/lib/i18n/config'

// Motion editorial content currently has English and Chinese editions.
export function isLocalizedMotionPath(path: string, locale: string) {
  return locale === 'zh' && /^\/?skills\/motion-[a-z0-9-]+$/.test(path)
}

export function motionSkillHref(id: string, locale: Locale = 'en') {
  const path = `/skills/${id}`
  return locale === 'zh' ? `/zh${path}` : locale === 'en' ? path : `${path}?lang=${locale}`
}
