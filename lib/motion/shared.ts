import families from './families.json'
import type catalog from './catalog.json'
import type { Locale } from '@/lib/i18n/config'

export type MotionEntry = (typeof catalog.entries)[number]
export type MotionFamily = keyof typeof families
export type MotionLocale = 'en' | 'zh'
export const MOTION_CATEGORY = 'motion-design'
export const MOTION_FAMILIES = families
export const motionCategoryLabel = (locale: Locale) => ({
  en: 'Motion design', zh: '动效设计', ja: 'モーションデザイン', ko: '모션 디자인',
  es: 'Diseño de movimiento', de: 'Motion Design', fr: 'Design animé', id: 'Desain gerak',
})[locale]
export const motionAsset = (entry: MotionEntry, animated = false) =>
  `/studio/motion/v1/${entry.id}${animated ? '' : '.poster'}.svg`
export function motionFamily(id: string, locale: MotionLocale) {
  const family = families[id as MotionFamily]
  return { name: locale === 'zh' ? family.zhName : family.name,
    description: locale === 'zh' ? family.zhDescription : family.description }
}
