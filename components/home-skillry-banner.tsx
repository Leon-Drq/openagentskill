import { ArrowUpRight } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { externalSourceHref, externalSourceRel } from '@/lib/skills/external-outbound'
import { SkillryLogo } from './skillry-logo'
import { EditorialLink } from './editorial-link'

const COPY: Record<Locale, {
  label: string
  title: string
  description: string
  cta: string
  newTab: string
}> = {
  en: {
    label: 'Creative skills',
    title: 'Create more with your AI agent.',
    description: 'Explore skills for websites, slides, images, and video.',
    cta: 'Explore Skillry',
    newTab: 'Opens in a new tab',
  },
  zh: {
    label: '创作技能',
    title: '用 AI Agent，把创意变成作品。',
    description: '探索网页、演示文稿、图片与视频创作技能。',
    cta: '探索 Skillry',
    newTab: '在新标签页打开',
  },
  ja: {
    label: 'クリエイティブスキル',
    title: 'AI エージェントで、もっと創ろう。',
    description: 'Web サイト、スライド、画像、動画の制作スキルを探す。',
    cta: 'Skillry を見る',
    newTab: '新しいタブで開きます',
  },
  ko: {
    label: '창작 스킬',
    title: 'AI 에이전트와 더 많은 것을 만들어 보세요.',
    description: '웹사이트, 슬라이드, 이미지, 영상 제작 스킬을 살펴보세요.',
    cta: 'Skillry 둘러보기',
    newTab: '새 탭에서 열립니다',
  },
  es: {
    label: 'Skills creativos',
    title: 'Crea más con tu agente de IA.',
    description: 'Explora skills para sitios web, presentaciones, imágenes y vídeos.',
    cta: 'Explorar Skillry',
    newTab: 'Se abre en una pestaña nueva',
  },
  de: {
    label: 'Kreative Skills',
    title: 'Gestalte mehr mit deinem KI-Agenten.',
    description: 'Entdecke Skills für Websites, Präsentationen, Bilder und Videos.',
    cta: 'Skillry entdecken',
    newTab: 'Öffnet in einem neuen Tab',
  },
  fr: {
    label: 'Skills créatifs',
    title: 'Créez davantage avec votre agent IA.',
    description: 'Découvrez des skills pour sites web, présentations, images et vidéos.',
    cta: 'Explorer Skillry',
    newTab: 'Ouvre un nouvel onglet',
  },
  id: {
    label: 'Skill kreatif',
    title: 'Berkreasi lebih jauh dengan agen AI Anda.',
    description: 'Jelajahi skill untuk situs web, presentasi, gambar, dan video.',
    cta: 'Jelajahi Skillry',
    newTab: 'Terbuka di tab baru',
  },
}

const SOURCE_URL = 'https://skillry.dev'

export function HomeSkillryBanner({ locale }: { locale: Locale }) {
  const copy = COPY[locale]

  return (
    <aside aria-label={`Skillry · ${copy.label}`} className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-6">
      <EditorialLink eventName="partner_outbound" eventData={{ partner: 'skillry', placement: 'home_banner' }}
        href={externalSourceHref(SOURCE_URL)}
        target="_blank"
        rel={externalSourceRel(SOURCE_URL)}
        className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 rounded-[10px] border border-[#d5dfd5] bg-[#eef2eb] p-4 text-[#1d1b18] transition-colors hover:border-[#006b4f] hover:bg-[#e8eee5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#006b4f] md:grid-cols-[auto_1fr_auto] md:gap-x-6 md:px-6 md:py-5"
      >
        <div className="flex min-w-0 items-center gap-3 md:border-r md:border-[#cdd7cc] md:pr-6">
          <SkillryLogo size={36} />
          <div className="min-w-0">
            <span className="block text-base font-semibold tracking-tight">Skillry</span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.1em] text-[#4d6758] max-[360px]:tracking-normal">{copy.label}</span>
          </div>
        </div>
        <div className="order-3 col-span-2 min-w-0 md:order-2 md:col-span-1">
          <p className="text-xl leading-snug text-[#254b39]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#526052]">{copy.description}</p>
        </div>
        <span className="order-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border border-[#bdcebf] bg-[#fbfaf6] px-3 text-center text-xs font-semibold text-[#006b4f] transition-colors group-hover:border-[#006b4f] group-hover:bg-white max-[360px]:max-w-28 md:order-3 md:px-4 md:text-sm">
          {copy.cta}
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">{copy.newTab}</span>
        </span>
      </EditorialLink>
    </aside>
  )
}
