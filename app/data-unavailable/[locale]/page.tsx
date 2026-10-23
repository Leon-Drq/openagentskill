import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketingPageShell, MarketingHero, MarketingButtonLink } from '@/components/marketing-page'
import { I18nProvider } from '@/lib/i18n/context'
import { isLocale, locales, type Locale } from '@/lib/i18n/config'

export const dynamic = 'force-static'
export const dynamicParams = false
export function generateStaticParams() { return locales.map(locale => ({ locale })) }
export const metadata: Metadata = { title: 'Temporarily unavailable', robots: { index: false, follow: true } }

const copy: Record<Locale, [string, string, string]> = {
  en: ['Live registry temporarily unavailable', 'Search, skill details and current review evidence are temporarily unavailable. You can browse a saved public selection with its original dates and limited coverage. Please try this page again later.', 'Browse saved skills'],
  zh: ['实时目录暂时不可用', '搜索、Skill 详情和最新审核记录暂时无法提供。你仍可浏览标注保存时间的部分公开目录。请稍后重试当前页面。', '浏览已保存的 Skill'],
  ja: ['最新のレジストリは一時的に利用できません', '検索、スキル詳細、最新の審査記録は一時的に利用できません。保存日時を表示した公開一覧の一部は閲覧できます。後でもう一度お試しください。', '保存済みスキルを見る'],
  ko: ['실시간 목록을 일시적으로 사용할 수 없습니다', '검색, 스킬 상세 정보 및 최신 심사 기록을 일시적으로 제공할 수 없습니다. 저장 날짜가 표시된 일부 공개 목록은 볼 수 있습니다. 나중에 다시 시도해 주세요.', '저장된 스킬 보기'],
  es: ['Registro en vivo temporalmente no disponible', 'La búsqueda, los detalles y las revisiones actuales no están disponibles. Puedes consultar una selección pública guardada, con sus fechas y cobertura limitada. Inténtalo de nuevo más tarde.', 'Ver skills guardadas'],
  de: ['Live-Verzeichnis vorübergehend nicht verfügbar', 'Suche, Skill-Details und aktuelle Prüfberichte sind vorübergehend nicht verfügbar. Eine gespeicherte öffentliche Auswahl mit Datum und begrenztem Umfang bleibt zugänglich. Bitte später erneut versuchen.', 'Gespeicherte Skills ansehen'],
  fr: ['Registre en direct temporairement indisponible', 'La recherche, les détails et les évaluations actuelles sont indisponibles. Une sélection publique sauvegardée reste accessible, avec ses dates et sa couverture limitée. Réessayez plus tard.', 'Voir les skills sauvegardées'],
  id: ['Registri langsung sementara tidak tersedia', 'Pencarian, detail skill, dan tinjauan terkini sementara tidak tersedia. Pilihan publik tersimpan tetap dapat dilihat, dengan tanggal dan cakupan terbatas. Silakan coba lagi nanti.', 'Lihat skill tersimpan'],
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const [title, description, action] = copy[locale]
  return <I18nProvider initialLocale={locale}><MarketingPageShell language={locale === 'zh' ? 'zh-CN' : locale}>
    <div data-maintenance-page><MarketingHero eyebrow="OpenAgentSkill" title={title} description={description}
      actions={<MarketingButtonLink href={locale === 'en' ? '/skills' : `/${locale}/skills`} variant="primary">{action}</MarketingButtonLink>} /></div>
  </MarketingPageShell></I18nProvider>
}
