import families from './families.json'
import type catalog from './catalog.json'
import type { Locale } from '@/lib/i18n/config'

export type MotionEntry = (typeof catalog.entries)[number]
export type MotionFamily = keyof typeof families
export type MotionLocale = 'en' | 'zh'
export const MOTION_CATEGORY = 'motion-design'
export const MOTION_PLANNED_PRICE_CENTS = 499
export const MOTION_FAMILIES = families
export const motionCategoryLabel = (locale: Locale) => ({
  en: 'Motion design', zh: '动效设计', ja: 'モーションデザイン', ko: '모션 디자인',
  es: 'Diseño de movimiento', de: 'Motion Design', fr: 'Design animé', id: 'Desain gerak',
})[locale]
export function motionTagLabel(tag: string, locale: MotionLocale) {
  const labels: Record<string, string> = { 'Product UI': '产品界面', Phone: '手机', Charts: '图表', Diagrams: '图解', 'Kinetic type': '动态文字', Shapes: '形状', Particles: '粒子', Characters: '角色', Photos: '照片', Music: '音乐', Code: '代码' }
  return locale === 'zh' ? labels[tag] || tag : tag
}
export function motionFamily(id: string, locale: MotionLocale) {
  const family = families[id as MotionFamily]
  return { name: locale === 'zh' ? family.zhName : family.name,
    description: locale === 'zh' ? family.zhDescription : family.description }
}
