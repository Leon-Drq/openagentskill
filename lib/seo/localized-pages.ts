export const LOCALIZED_LANDING_PAGES = {
  zh: {
    lang: 'zh-CN',
    label: '中文',
    title: 'OpenAgentSkill — AI Agent 技能市场',
    description:
      'OpenAgentSkill 帮助开发者发现、比较、安装 AI Agent Skills，覆盖网页抓取、代码智能体、RAG、浏览器自动化和工作流工具。',
    eyebrow: 'AI Agent 技能市场',
    heading: '发现、比较并安装 AI Agent Skills',
    intro:
      'OpenAgentSkill 收录 GitHub 上高质量的 AI Agent 技能，按质量、Stars、维护活跃度和真实站内行为信号排序。',
    highlights: [
      '按任务场景查找可安装技能',
      '比较质量、维护情况和采用信号',
      '通过 Agent API 自动发现技能',
    ],
    primaryCta: '浏览全部技能',
    secondaryCta: '查看 Agent API',
  },
  ja: {
    lang: 'ja',
    label: '日本語',
    title: 'OpenAgentSkill — AI Agent Skill マーケットプレイス',
    description:
      'OpenAgentSkill は、Web スクレイピング、コード生成、RAG、ブラウザ自動化などの AI Agent Skills を発見、比較、インストールするためのオープンなディレクトリです。',
    eyebrow: 'AI Agent Skill ディレクトリ',
    heading: 'AI Agent Skills を発見、比較、インストール',
    intro:
      'OpenAgentSkill は GitHub 上の高品質な Agent Skills を収集し、品質、Stars、更新状況、利用シグナルで評価します。',
    highlights: [
      'タスク別にインストール可能な Skill を探せます',
      '品質、メンテナンス、採用シグナルを比較できます',
      'Agent API からプログラムで Skill を発見できます',
    ],
    primaryCta: 'Skills を見る',
    secondaryCta: 'Agent API を見る',
  },
  ko: {
    lang: 'ko',
    label: '한국어',
    title: 'OpenAgentSkill — AI Agent Skill 마켓플레이스',
    description:
      'OpenAgentSkill은 웹 스크래핑, 코딩 에이전트, RAG, 브라우저 자동화 등 AI Agent Skills를 찾고 비교하고 설치할 수 있는 오픈 디렉터리입니다.',
    eyebrow: 'AI Agent Skill 디렉터리',
    heading: 'AI Agent Skills를 찾고 비교하고 설치하세요',
    intro:
      'OpenAgentSkill은 GitHub의 고품질 Agent Skills를 수집하고 품질, Stars, 유지보수 상태, 사용 신호로 정렬합니다.',
    highlights: [
      '작업 시나리오별로 설치 가능한 Skill 검색',
      '품질, 유지보수, 채택 신호 비교',
      'Agent API로 Skill을 자동 발견',
    ],
    primaryCta: 'Skills 보기',
    secondaryCta: 'Agent API 보기',
  },
  es: {
    lang: 'es',
    label: 'Español',
    title: 'OpenAgentSkill — Marketplace de AI Agent Skills',
    description:
      'OpenAgentSkill ayuda a descubrir, comparar e instalar AI Agent Skills para web scraping, agentes de código, RAG, automatización de navegador y flujos de trabajo.',
    eyebrow: 'Directorio de AI Agent Skills',
    heading: 'Descubre, compara e instala AI Agent Skills',
    intro:
      'OpenAgentSkill indexa skills de alta calidad en GitHub y las ordena por calidad, stars, mantenimiento y señales reales de uso.',
    highlights: [
      'Encuentra skills instalables por caso de uso',
      'Compara calidad, mantenimiento y adopción',
      'Descubre skills desde una API para agentes',
    ],
    primaryCta: 'Explorar skills',
    secondaryCta: 'Ver Agent API',
  },
  de: {
    lang: 'de',
    label: 'Deutsch',
    title: 'OpenAgentSkill — Marketplace für AI Agent Skills',
    description:
      'OpenAgentSkill hilft beim Finden, Vergleichen und Installieren von AI Agent Skills für Web Scraping, Coding Agents, RAG, Browser-Automatisierung und Workflows.',
    eyebrow: 'Verzeichnis für AI Agent Skills',
    heading: 'AI Agent Skills finden, vergleichen und installieren',
    intro:
      'OpenAgentSkill indexiert hochwertige Agent Skills von GitHub und bewertet sie nach Qualität, Stars, Wartung und realen Nutzungssignalen.',
    highlights: [
      'Installierbare Skills nach Aufgabe finden',
      'Qualität, Wartung und Adoption vergleichen',
      'Skills programmatisch über die Agent API entdecken',
    ],
    primaryCta: 'Skills durchsuchen',
    secondaryCta: 'Agent API ansehen',
  },
  fr: {
    lang: 'fr',
    label: 'Français',
    title: 'OpenAgentSkill — Marketplace d’AI Agent Skills',
    description:
      'OpenAgentSkill aide à découvrir, comparer et installer des AI Agent Skills pour le web scraping, les agents de code, le RAG, l’automatisation navigateur et les workflows.',
    eyebrow: 'Répertoire d’AI Agent Skills',
    heading: 'Découvrez, comparez et installez des AI Agent Skills',
    intro:
      'OpenAgentSkill indexe des Agent Skills de qualité depuis GitHub et les classe par qualité, stars, maintenance et signaux réels d’usage.',
    highlights: [
      'Trouver des skills installables par cas d’usage',
      'Comparer qualité, maintenance et adoption',
      'Découvrir des skills via une API pour agents',
    ],
    primaryCta: 'Explorer les skills',
    secondaryCta: 'Voir l’Agent API',
  },
} as const

export type LocalizedLandingPageCode = keyof typeof LOCALIZED_LANDING_PAGES

export function getLocalizedLanguageAlternates(baseUrl = 'https://www.openagentskill.com') {
  return {
    en: baseUrl,
    'x-default': baseUrl,
    ...Object.fromEntries(
      Object.entries(LOCALIZED_LANDING_PAGES).map(([, page]) => [page.lang, `${baseUrl}/${page.lang.split('-')[0]}`])
    ),
  }
}
