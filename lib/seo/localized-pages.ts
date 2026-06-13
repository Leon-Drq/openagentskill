export const LOCALIZED_LANDING_PAGES = {
  zh: {
    lang: 'zh-CN',
    label: '中文',
    title: 'OpenAgentSkill — AI Agent 的 Skill Layer',
    description:
      'OpenAgentSkill 是 AI Agent Skills 的 npm，帮助 AI Agent 自动发现、比较并安装正确的可复用 Skill。',
    eyebrow: 'AI Agent Skill Layer',
    heading: 'AI Agent 的 Skill Layer',
    intro:
      '让你的 AI Agent 自动发现、比较并安装正确的可复用 Skill，并在执行前查看质量、Stars、维护状态和信任信号。',
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
    title: 'OpenAgentSkill — AI Agents の Skill Layer',
    description:
      'OpenAgentSkill は AI Agent Skills の npm です。AI agent が適切な再利用可能 Skill を自動で発見、比較、インストールできます。',
    eyebrow: 'AI Agent Skill Layer',
    heading: 'AI agents の Skill layer',
    intro:
      '品質、Stars、更新状況、利用シグナルを確認しながら、Agent が実行前に信頼できる Skill を選べるようにします。',
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
    title: 'OpenAgentSkill — AI Agents를 위한 Skill Layer',
    description:
      'OpenAgentSkill은 AI Agent Skills의 npm입니다. AI agent가 올바른 재사용 가능 Skill을 자동으로 찾고, 비교하고, 설치하게 합니다.',
    eyebrow: 'AI Agent Skill Layer',
    heading: 'AI agents를 위한 Skill layer',
    intro:
      '품질, Stars, 유지보수 상태, 사용 신호를 함께 보여줘 Agent가 실행 전에 신뢰할 수 있는 Skill을 고를 수 있게 합니다.',
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
    title: 'OpenAgentSkill — La capa de skills para AI agents',
    description:
      'OpenAgentSkill es npm para AI Agent Skills: ayuda a tu AI agent a encontrar, comparar e instalar automaticamente el skill reutilizable correcto.',
    eyebrow: 'AI Agent Skill Layer',
    heading: 'La capa de skills para AI agents',
    intro:
      'Convierte repos y skills de GitHub en una capa de descubrimiento con calidad, stars, mantenimiento y senales de confianza antes de instalar.',
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
    title: 'OpenAgentSkill — Die Skill-Schicht fur AI agents',
    description:
      'OpenAgentSkill ist npm fur AI Agent Skills: Lass deinen AI agent automatisch den richtigen wiederverwendbaren Skill finden, vergleichen und installieren.',
    eyebrow: 'AI Agent Skill Layer',
    heading: 'Die Skill-Schicht fur AI agents',
    intro:
      'OpenAgentSkill macht GitHub-Skills zu einer Discovery-Schicht mit Qualitat, Stars, Wartung und Vertrauenssignalen vor der Installation.',
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
    title: 'OpenAgentSkill — La couche de skills pour AI agents',
    description:
      'OpenAgentSkill est npm pour AI Agent Skills : aidez votre AI agent a trouver, comparer et installer automatiquement le bon skill reutilisable.',
    eyebrow: 'AI Agent Skill Layer',
    heading: 'La couche de skills pour AI agents',
    intro:
      'OpenAgentSkill transforme les skills GitHub en couche de decouverte avec qualite, stars, maintenance et signaux de confiance avant installation.',
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
