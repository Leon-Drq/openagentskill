import { defaultLocale, type Locale } from '@/lib/i18n/config'

type ShellCopy = {
  agentMenuTitle: string
  agentMenuDescription: string
  mobileBrowse: string
  mobileLanguage: string
  openMenu: string
  closeMenu: string
  mobileNavigation: string
  footerDescription: string
  footerExplore: string
  footerTrust: string
  footerBuild: string
  footerPrivacy: string
  footerRegistry: string
  footerTagline: string
}

const shellCopy: Record<Locale, ShellCopy> = {
  en: {
    agentMenuTitle: 'Agent registry surfaces',
    agentMenuDescription: 'Resolve, install, and audit skills without opening the directory UI.',
    mobileBrowse: 'Browse',
    mobileLanguage: 'Language',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    mobileNavigation: 'Mobile navigation',
    footerDescription: 'The skill layer for AI agents: discover, compare, audit, and install reusable capabilities across Codex, Claude Code, Cursor, and agent runtimes.',
    footerExplore: 'Explore',
    footerTrust: 'Trust',
    footerBuild: 'Build',
    footerPrivacy: 'Privacy',
    footerRegistry: 'OpenAgentSkill Registry',
    footerTagline: 'Built for agent-native discovery',
  },
  zh: {
    agentMenuTitle: 'Agent 能力入口',
    agentMenuDescription: '无需浏览目录，即可让 Agent 解析、安装和审计技能。',
    mobileBrowse: '浏览',
    mobileLanguage: '语言',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    mobileNavigation: '移动端导航',
    footerDescription: 'AI Agent 的 Skill Layer：帮助 Agent 在 Codex、Claude Code、Cursor 和其他运行环境中发现、比较、审计并安装可复用能力。',
    footerExplore: '探索',
    footerTrust: '信任',
    footerBuild: '构建',
    footerPrivacy: '隐私',
    footerRegistry: 'OpenAgentSkill 技能注册表',
    footerTagline: '为 Agent 原生发现而构建',
  },
  ja: {
    agentMenuTitle: 'Agent レジストリの入口',
    agentMenuDescription: 'ディレクトリ UI を開かずに、Skill の解決、導入、監査を行えます。',
    mobileBrowse: '探す',
    mobileLanguage: '言語',
    openMenu: 'メニューを開く',
    closeMenu: 'メニューを閉じる',
    mobileNavigation: 'モバイルナビゲーション',
    footerDescription: 'AI Agent のための Skill Layer。Codex、Claude Code、Cursor などで再利用可能な能力を発見、比較、監査、導入できます。',
    footerExplore: '探索',
    footerTrust: '信頼',
    footerBuild: '構築',
    footerPrivacy: 'プライバシー',
    footerRegistry: 'OpenAgentSkill レジストリ',
    footerTagline: 'Agent ネイティブな発見のために構築',
  },
  ko: {
    agentMenuTitle: 'Agent 레지스트리 진입점',
    agentMenuDescription: '디렉터리 UI를 열지 않고도 Skill을 찾고, 설치하고, 감사할 수 있습니다.',
    mobileBrowse: '둘러보기',
    mobileLanguage: '언어',
    openMenu: '메뉴 열기',
    closeMenu: '메뉴 닫기',
    mobileNavigation: '모바일 탐색',
    footerDescription: 'AI Agent를 위한 Skill Layer입니다. Codex, Claude Code, Cursor 및 기타 런타임에서 재사용 가능한 기능을 발견, 비교, 감사, 설치하세요.',
    footerExplore: '탐색',
    footerTrust: '신뢰',
    footerBuild: '구축',
    footerPrivacy: '개인정보',
    footerRegistry: 'OpenAgentSkill 레지스트리',
    footerTagline: 'Agent 네이티브 발견을 위해 구축',
  },
  es: {
    agentMenuTitle: 'Superficies del registro de agents',
    agentMenuDescription: 'Resuelve, instala y audita skills sin abrir la interfaz del directorio.',
    mobileBrowse: 'Explorar',
    mobileLanguage: 'Idioma',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    mobileNavigation: 'Navegación móvil',
    footerDescription: 'La capa de skills para agents: descubre, compara, audita e instala capacidades reutilizables en Codex, Claude Code, Cursor y otros runtimes.',
    footerExplore: 'Explorar',
    footerTrust: 'Confianza',
    footerBuild: 'Crear',
    footerPrivacy: 'Privacidad',
    footerRegistry: 'Registro de OpenAgentSkill',
    footerTagline: 'Creado para descubrimiento nativo de agents',
  },
  de: {
    agentMenuTitle: 'Agent-Registry-Oberflächen',
    agentMenuDescription: 'Skills auflösen, installieren und prüfen, ohne die Verzeichnisoberfläche zu öffnen.',
    mobileBrowse: 'Entdecken',
    mobileLanguage: 'Sprache',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    mobileNavigation: 'Mobile Navigation',
    footerDescription: 'Die Skill-Schicht für AI Agents: Entdecke, vergleiche, prüfe und installiere wiederverwendbare Fähigkeiten für Codex, Claude Code, Cursor und weitere Laufzeiten.',
    footerExplore: 'Entdecken',
    footerTrust: 'Vertrauen',
    footerBuild: 'Entwickeln',
    footerPrivacy: 'Datenschutz',
    footerRegistry: 'OpenAgentSkill-Registry',
    footerTagline: 'Für Agent-native Discovery gebaut',
  },
  fr: {
    agentMenuTitle: 'Surfaces du registre d’agents',
    agentMenuDescription: 'Résolvez, installez et auditez des skills sans ouvrir l’interface de l’annuaire.',
    mobileBrowse: 'Explorer',
    mobileLanguage: 'Langue',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    mobileNavigation: 'Navigation mobile',
    footerDescription: 'La couche de skills pour les agents IA : découvrez, comparez, auditez et installez des capacités réutilisables dans Codex, Claude Code, Cursor et d’autres runtimes.',
    footerExplore: 'Explorer',
    footerTrust: 'Confiance',
    footerBuild: 'Construire',
    footerPrivacy: 'Confidentialité',
    footerRegistry: 'Registre OpenAgentSkill',
    footerTagline: 'Conçu pour la découverte native des agents',
  },
  id: {
    agentMenuTitle: 'Area registri agent',
    agentMenuDescription: 'Temukan, pasang, dan audit skill tanpa membuka antarmuka direktori.',
    mobileBrowse: 'Jelajahi',
    mobileLanguage: 'Bahasa',
    openMenu: 'Buka menu',
    closeMenu: 'Tutup menu',
    mobileNavigation: 'Navigasi seluler',
    footerDescription: 'Lapisan skill untuk AI agent: temukan, bandingkan, audit, dan pasang kemampuan yang dapat digunakan ulang di Codex, Claude Code, Cursor, dan runtime agent lainnya.',
    footerExplore: 'Jelajahi',
    footerTrust: 'Kepercayaan',
    footerBuild: 'Bangun',
    footerPrivacy: 'Privasi',
    footerRegistry: 'Registri OpenAgentSkill',
    footerTagline: 'Dibangun untuk penemuan native agent',
  },
}

export function getShellCopy(locale: Locale = defaultLocale) {
  return shellCopy[locale] || shellCopy[defaultLocale]
}
