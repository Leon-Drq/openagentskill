import type { Locale } from './i18n/config'
import type en from './i18n/dictionaries/en'

type NavKey = keyof typeof en.nav
export type NavigationLink = { href: string; label: NavKey | 'gallery' | 'resources' | 'developers' | 'creatorShort' | 'reports' }
export type NavigationSection = NavigationLink & { id: string; items?: readonly NavigationLink[]; activePaths?: readonly string[] }

// One hierarchy for desktop and mobile. Existing public URLs are deliberately retained.
export const SITE_NAVIGATION: readonly NavigationSection[] = [
  { id: 'skills', href: '/skills', label: 'skills', activePaths: ['/tasks', '/collections', '/best'], items: [
    { href: '/skills', label: 'browseSkills' }, { href: '/resolve', label: 'aiSkillFinder' },
    { href: '/use-cases', label: 'useCases' }, { href: '/skill-packs', label: 'packs' }, { href: '/compare', label: 'compare' },
  ] },
  { id: 'gallery', href: '/showcase', label: 'gallery' },
  { id: 'rankings', href: '/rankings', label: 'rankings', activePaths: ['/trending'] },
  { id: 'creators', href: '/creators', label: 'creatorShort', activePaths: ['/creator', '/creator-kit'] },
  { id: 'resources', href: '/guides', label: 'resources', activePaths: ['/reports'], items: [
    { href: '/blog', label: 'blog' }, { href: '/guides', label: 'guides' }, { href: '/reports/weekly', label: 'reports' },
  ] },
  { id: 'developers', href: '/docs', label: 'developers', activePaths: ['/safety', '/outcomes'], items: [
    { href: '/docs', label: 'docs' }, { href: '/agent', label: 'agentEntry' },
    { href: '/api-docs', label: 'apiDocs' }, { href: '/cli', label: 'cli' },
  ] },
]

const copy: Record<Locale, { resources: string; developers: string; creatorShort: string; reports: string; more: string; navigation: string; toggle: string }> = {
  en: { resources: 'Resources', developers: 'Developers', creatorShort: 'Creators', reports: 'Reports', more: 'More links', navigation: 'Primary navigation', toggle: 'Toggle submenu' },
  zh: { resources: '资源', developers: '开发者', creatorShort: '创作者', reports: '报告', more: '更多入口', navigation: '主导航', toggle: '展开或收起子菜单' },
  ja: { resources: 'リソース', developers: '開発者', creatorShort: 'クリエイター', reports: 'レポート', more: 'その他のリンク', navigation: 'メインナビゲーション', toggle: 'サブメニューの開閉' },
  ko: { resources: '자료', developers: '개발자', creatorShort: '크리에이터', reports: '보고서', more: '더 많은 링크', navigation: '주 탐색', toggle: '하위 메뉴 열기/닫기' },
  es: { resources: 'Recursos', developers: 'Desarrolladores', creatorShort: 'Creadores', reports: 'Informes', more: 'Más enlaces', navigation: 'Navegación principal', toggle: 'Abrir o cerrar submenú' },
  de: { resources: 'Ressourcen', developers: 'Entwickler', creatorShort: 'Kreative', reports: 'Berichte', more: 'Weitere Links', navigation: 'Hauptnavigation', toggle: 'Untermenü umschalten' },
  fr: { resources: 'Ressources', developers: 'Développeurs', creatorShort: 'Créateurs', reports: 'Rapports', more: 'Autres liens', navigation: 'Navigation principale', toggle: 'Ouvrir ou fermer le sous-menu' },
  id: { resources: 'Sumber daya', developers: 'Pengembang', creatorShort: 'Kreator', reports: 'Laporan', more: 'Tautan lainnya', navigation: 'Navigasi utama', toggle: 'Buka atau tutup submenu' },
}
export const getNavigationCopy = (locale: Locale) => copy[locale]
export function navigationLabel(link: NavigationLink, locale: Locale, nav: Record<NavKey, string>, gallery: string) {
  if (link.label === 'gallery') return gallery
  if (link.label === 'resources' || link.label === 'developers' || link.label === 'creatorShort' || link.label === 'reports') return copy[locale][link.label]
  return nav[link.label]
}
export function isNavigationPath(pathname: string, href: string) {
  const path = pathname.split(/[?#]/)[0].replace(/^\/(en|zh|ja|ko|es|de|fr|id)(?=\/|$)/, '') || '/'
  const target = href.split(/[?#]/)[0]
  return path === target || path.startsWith(`${target}/`)
}
export function isNavigationSectionActive(pathname: string, section: NavigationSection) {
  return [section.href, ...(section.items?.map(item => item.href) || []), ...(section.activePaths || [])].some(href => isNavigationPath(pathname, href))
}
