import type { SkillRecord } from '@/lib/db/skills'
import type { Locale } from '@/lib/i18n/config'

type SearchMetadataCopy = {
  directoryTitle: string
  directoryDescription: string
  directoryKeywords: string[]
  directoryCollectionName: string
  directoryBreadcrumbName: string
  skillSuffix: string
  skillDescription: string
  skillKeywords: string[]
  htmlLanguage: string
  openGraphLocale: string
}

type SkillSearchFocus =
  | 'webData'
  | 'finance'
  | 'presentation'
  | 'design'
  | 'coding'
  | 'research'
  | 'marketing'
  | 'data'
  | 'security'
  | 'video'
  | 'automation'
  | 'legal'
  | 'education'
  | 'football'
  | 'general'

const SEARCH_METADATA_COPY: Record<Locale, SearchMetadataCopy> = {
  en: {
    directoryTitle: 'AI Agent Skills Directory - Audited Skills for Codex, Claude Code & Cursor',
    directoryDescription:
      'Find reusable AI agent skills for Codex, Claude Code, Cursor, research, finance, web scraping, and more. Compare trust, risk, maintenance, and install guidance first.',
    directoryKeywords: [
      'AI agent skills directory',
      'AI agent skill repository',
      'Codex skills',
      'Claude Code skills',
      'Cursor skills',
      'audited agent skills',
    ],
    directoryCollectionName: 'OpenAgentSkill AI Agent Skills Directory',
    directoryBreadcrumbName: 'AI Agent Skills Directory',
    skillSuffix: 'AI Agent Skill',
    skillDescription: 'Review task fit, compatible agents, trust, risk, and install guidance before use.',
    skillKeywords: ['AI agent skill', 'agent tool', 'skill audit', 'install guidance'],
    htmlLanguage: 'en',
    openGraphLocale: 'en_US',
  },
  zh: {
    directoryTitle: 'AI Agent Skills 目录 - 适用于 Codex、Claude Code 和 Cursor',
    directoryDescription:
      '发现可复用的 AI Agent Skills，覆盖 Codex、Claude Code、Cursor、研究、金融、网页抓取等任务。安装前比较信任、风险、维护状态和安装建议。',
    directoryKeywords: [
      'AI Agent Skills',
      'AI Agent 技能目录',
      'Codex 技能',
      'Claude Code 技能',
      'Cursor 技能',
      'Skill 审计',
    ],
    directoryCollectionName: 'OpenAgentSkill AI Agent Skills 目录',
    directoryBreadcrumbName: 'AI Agent Skills 目录',
    skillSuffix: 'AI Agent 技能',
    skillDescription: '使用前查看任务匹配、适用 Agent、信任、风险和安装建议。',
    skillKeywords: ['AI Agent 技能', 'Agent 工具', 'Skill 审计', '安装建议'],
    htmlLanguage: 'zh-CN',
    openGraphLocale: 'zh_CN',
  },
  ja: {
    directoryTitle: 'AI Agent Skills ディレクトリ - Codex、Claude Code、Cursor 向け監査済み Skills',
    directoryDescription:
      'Codex、Claude Code、Cursor、リサーチ、金融、Web スクレイピング向けの再利用可能な AI Agent Skills を探せます。導入前に信頼性、リスク、保守状況、導入手順を比較できます。',
    directoryKeywords: [
      'AI Agent Skills',
      'AI Agent スキル ディレクトリ',
      'Codex Skills',
      'Claude Code Skills',
      'Cursor Skills',
      'スキル監査',
    ],
    directoryCollectionName: 'OpenAgentSkill AI Agent Skills ディレクトリ',
    directoryBreadcrumbName: 'AI Agent Skills ディレクトリ',
    skillSuffix: 'AI Agent Skill',
    skillDescription: '利用前にタスク適合性、対応 Agent、信頼性、リスク、導入ガイダンスを確認できます。',
    skillKeywords: ['AI Agent Skill', 'Agent tool', 'Skill audit', '導入ガイダンス'],
    htmlLanguage: 'ja',
    openGraphLocale: 'ja_JP',
  },
  ko: {
    directoryTitle: 'AI Agent Skills 디렉터리 - Codex, Claude Code, Cursor를 위한 검토된 Skills',
    directoryDescription:
      'Codex, Claude Code, Cursor, 리서치, 금융, 웹 스크래핑을 위한 재사용 가능한 AI Agent Skills를 찾아보세요. 설치 전에 신뢰도, 위험, 유지보수, 설치 안내를 비교할 수 있습니다.',
    directoryKeywords: [
      'AI Agent Skills',
      'AI Agent 스킬 디렉터리',
      'Codex Skills',
      'Claude Code Skills',
      'Cursor Skills',
      '스킬 감사',
    ],
    directoryCollectionName: 'OpenAgentSkill AI Agent Skills 디렉터리',
    directoryBreadcrumbName: 'AI Agent Skills 디렉터리',
    skillSuffix: 'AI Agent Skill',
    skillDescription: '사용 전에 작업 적합성, 호환 Agent, 신뢰도, 위험, 설치 안내를 검토하세요.',
    skillKeywords: ['AI Agent Skill', 'Agent 도구', 'Skill 감사', '설치 안내'],
    htmlLanguage: 'ko',
    openGraphLocale: 'ko_KR',
  },
  es: {
    directoryTitle: 'Directorio de AI Agent Skills - Skills auditados para Codex, Claude Code y Cursor',
    directoryDescription:
      'Encuentra AI Agent Skills reutilizables para Codex, Claude Code, Cursor, investigacion, finanzas, web scraping y mas. Compara confianza, riesgo, mantenimiento e instalacion antes de usar.',
    directoryKeywords: [
      'directorio de AI Agent Skills',
      'skills para Codex',
      'skills para Claude Code',
      'skills para Cursor',
      'auditoria de skills',
    ],
    directoryCollectionName: 'Directorio de AI Agent Skills de OpenAgentSkill',
    directoryBreadcrumbName: 'Directorio de AI Agent Skills',
    skillSuffix: 'AI Agent Skill',
    skillDescription: 'Revisa ajuste de tarea, agentes compatibles, confianza, riesgo y guia de instalacion antes de usarlo.',
    skillKeywords: ['AI Agent Skill', 'herramienta para agentes', 'auditoria de skills', 'guia de instalacion'],
    htmlLanguage: 'es',
    openGraphLocale: 'es_ES',
  },
  de: {
    directoryTitle: 'AI Agent Skills Verzeichnis - Geprufte Skills fur Codex, Claude Code und Cursor',
    directoryDescription:
      'Finde wiederverwendbare AI Agent Skills fur Codex, Claude Code, Cursor, Recherche, Finanzen, Web Scraping und mehr. Vergleiche Vertrauen, Risiko, Wartung und Installationshinweise vor dem Einsatz.',
    directoryKeywords: [
      'AI Agent Skills Verzeichnis',
      'Codex Skills',
      'Claude Code Skills',
      'Cursor Skills',
      'Skill Audit',
    ],
    directoryCollectionName: 'OpenAgentSkill AI Agent Skills Verzeichnis',
    directoryBreadcrumbName: 'AI Agent Skills Verzeichnis',
    skillSuffix: 'AI Agent Skill',
    skillDescription: 'Prufe Aufgabenpassung, kompatible Agents, Vertrauen, Risiko und Installationshinweise vor der Nutzung.',
    skillKeywords: ['AI Agent Skill', 'Agent Tool', 'Skill Audit', 'Installationshinweise'],
    htmlLanguage: 'de',
    openGraphLocale: 'de_DE',
  },
  fr: {
    directoryTitle: 'Repertoire de AI Agent Skills - Skills verifies pour Codex, Claude Code et Cursor',
    directoryDescription:
      'Trouvez des AI Agent Skills reutilisables pour Codex, Claude Code, Cursor, la recherche, la finance, le web scraping et plus. Comparez confiance, risque, maintenance et conseils d installation avant utilisation.',
    directoryKeywords: [
      'repertoire de AI Agent Skills',
      'skills Codex',
      'skills Claude Code',
      'skills Cursor',
      'audit de skill',
    ],
    directoryCollectionName: 'Repertoire de AI Agent Skills OpenAgentSkill',
    directoryBreadcrumbName: 'Repertoire de AI Agent Skills',
    skillSuffix: 'AI Agent Skill',
    skillDescription: 'Verifiez l adequation a la tache, les agents compatibles, la confiance, le risque et le guide d installation avant usage.',
    skillKeywords: ['AI Agent Skill', 'outil pour agents', 'audit de skill', 'guide d installation'],
    htmlLanguage: 'fr',
    openGraphLocale: 'fr_FR',
  },
  id: {
    directoryTitle: 'Direktori AI Agent Skills - Skill terverifikasi untuk Codex, Claude Code, dan Cursor',
    directoryDescription:
      'Temukan AI Agent Skills yang dapat digunakan kembali untuk Codex, Claude Code, Cursor, riset, keuangan, web scraping, dan lainnya. Bandingkan kepercayaan, risiko, pemeliharaan, dan panduan pemasangan sebelum digunakan.',
    directoryKeywords: [
      'direktori AI Agent Skills',
      'skill Codex',
      'skill Claude Code',
      'skill Cursor',
      'audit skill',
    ],
    directoryCollectionName: 'Direktori AI Agent Skills OpenAgentSkill',
    directoryBreadcrumbName: 'Direktori AI Agent Skills',
    skillSuffix: 'AI Agent Skill',
    skillDescription: 'Tinjau kesesuaian tugas, agent yang kompatibel, kepercayaan, risiko, dan panduan pemasangan sebelum digunakan.',
    skillKeywords: ['AI Agent Skill', 'alat agent', 'audit skill', 'panduan pemasangan'],
    htmlLanguage: 'id',
    openGraphLocale: 'id_ID',
  },
}

const SEARCH_FOCUS_LABELS: Record<Locale, Record<SkillSearchFocus, string>> = {
  en: {
    webData: 'Web Scraping & Data Extraction',
    finance: 'Finance & Market Analysis',
    presentation: 'Presentation & Slide Generation',
    design: 'Design & UI',
    coding: 'Coding Workflows',
    research: 'Research & Knowledge',
    marketing: 'Marketing & Growth',
    data: 'Data & Analytics',
    security: 'Security & Code Review',
    video: 'Video & Creative Production',
    automation: 'Workflow Automation',
    legal: 'Legal & Compliance',
    education: 'Education & Teaching',
    football: 'Football & Sports Analytics',
    general: 'Reusable',
  },
  zh: {
    webData: '网页抓取与数据提取',
    finance: '金融与市场分析',
    presentation: '演示文稿与幻灯片生成',
    design: '设计与 UI',
    coding: '编程工作流',
    research: '研究与知识处理',
    marketing: '营销与增长',
    data: '数据与分析',
    security: '安全与代码审查',
    video: '视频与创意制作',
    automation: '工作流自动化',
    legal: '法律与合规',
    education: '教育与教学',
    football: '足球与体育分析',
    general: '可复用',
  },
  ja: {
    webData: 'Web スクレイピングとデータ抽出',
    finance: '金融・市場分析',
    presentation: 'プレゼンテーション・スライド生成',
    design: 'デザイン・UI',
    coding: 'コーディングワークフロー',
    research: 'リサーチ・ナレッジ',
    marketing: 'マーケティング・グロース',
    data: 'データ・分析',
    security: 'セキュリティ・コードレビュー',
    video: '動画・クリエイティブ制作',
    automation: 'ワークフロー自動化',
    legal: '法務・コンプライアンス',
    education: '教育・ティーチング',
    football: 'サッカー・スポーツ分析',
    general: '再利用可能な',
  },
  ko: {
    webData: '웹 스크래핑 및 데이터 추출',
    finance: '금융 및 시장 분석',
    presentation: '프레젠테이션 및 슬라이드 생성',
    design: '디자인 및 UI',
    coding: '코딩 워크플로',
    research: '리서치 및 지식',
    marketing: '마케팅 및 성장',
    data: '데이터 및 분석',
    security: '보안 및 코드 검토',
    video: '영상 및 크리에이티브 제작',
    automation: '워크플로 자동화',
    legal: '법률 및 컴플라이언스',
    education: '교육 및 티칭',
    football: '축구 및 스포츠 분석',
    general: '재사용 가능한',
  },
  es: {
    webData: 'web scraping y extraccion de datos',
    finance: 'finanzas y analisis de mercados',
    presentation: 'presentaciones y generacion de diapositivas',
    design: 'diseno e interfaz',
    coding: 'agentes de programacion',
    research: 'investigacion y conocimiento',
    marketing: 'marketing y crecimiento',
    data: 'datos y analitica',
    security: 'seguridad y revision de codigo',
    video: 'video y produccion creativa',
    automation: 'automatizacion de flujos',
    legal: 'legal y cumplimiento',
    education: 'educacion y ensenanza',
    football: 'futbol y analitica deportiva',
    general: 'reutilizable',
  },
  de: {
    webData: 'Web Scraping und Datenextraktion',
    finance: 'Finanz- und Marktanalyse',
    presentation: 'Prasentationen und Folienerstellung',
    design: 'Design und UI',
    coding: 'Coding-Agent',
    research: 'Recherche und Wissen',
    marketing: 'Marketing und Wachstum',
    data: 'Daten und Analytik',
    security: 'Sicherheit und Code-Review',
    video: 'Video und kreative Produktion',
    automation: 'Workflow-Automatisierung',
    legal: 'Recht und Compliance',
    education: 'Bildung und Lehre',
    football: 'Fussball und Sportanalyse',
    general: 'wiederverwendbare',
  },
  fr: {
    webData: 'web scraping et extraction de donnees',
    finance: 'finance et analyse de marche',
    presentation: 'presentations et generation de diapositives',
    design: 'design et interface',
    coding: 'agents de programmation',
    research: 'recherche et connaissances',
    marketing: 'marketing et croissance',
    data: 'donnees et analytique',
    security: 'securite et revue de code',
    video: 'video et production creative',
    automation: 'automatisation de flux',
    legal: 'juridique et conformite',
    education: 'education et enseignement',
    football: 'football et analytique sportive',
    general: 'reutilisable',
  },
  id: {
    webData: 'web scraping dan ekstraksi data',
    finance: 'keuangan dan analisis pasar',
    presentation: 'presentasi dan pembuatan slide',
    design: 'desain dan UI',
    coding: 'agent coding',
    research: 'riset dan pengetahuan',
    marketing: 'pemasaran dan pertumbuhan',
    data: 'data dan analitik',
    security: 'keamanan dan tinjauan kode',
    video: 'video dan produksi kreatif',
    automation: 'otomatisasi alur kerja',
    legal: 'hukum dan kepatuhan',
    education: 'pendidikan dan pengajaran',
    football: 'sepak bola dan analitik olahraga',
    general: 'dapat digunakan kembali',
  },
}

const SEARCH_SKILL_LEAD_TEMPLATES: Record<Locale, string> = {
  en: '{name} is a {focus} skill for AI agents.',
  zh: '{name} 是一项面向 AI Agent 的{focus}技能。',
  ja: '{name} は AI Agent 向けの{focus}スキルです。',
  ko: '{name}은(는) AI Agent를 위한 {focus} 스킬입니다.',
  es: '{name} es una skill de {focus} para agentes de IA.',
  de: '{name} ist ein {focus} Skill fur KI-Agenten.',
  fr: '{name} est une skill de {focus} pour les agents IA.',
  id: '{name} adalah skill {focus} untuk agent AI.',
}

const SEARCH_SKILL_TITLE_TEMPLATES: Record<Locale, string> = {
  en: '{name}: {focus} for AI Agents',
  zh: '{name}：面向 AI Agent 的{focus}技能',
  ja: '{name}：AI Agent 向け{focus}スキル',
  ko: '{name}: AI Agent용 {focus} 스킬',
  es: '{name}: {focus} para agentes de IA',
  de: '{name}: {focus} fur KI-Agenten',
  fr: '{name} : {focus} pour les agents IA',
  id: '{name}: {focus} untuk agent AI',
}

function cleanText(value: string | null | undefined) {
  return (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactText(value: string, limit: number) {
  const normalized = cleanText(value)
  if (normalized.length <= limit) return normalized

  const clipped = normalized.slice(0, Math.max(1, limit - 1))
  const breakAt = Math.max(clipped.lastIndexOf(' '), clipped.lastIndexOf('，'), clipped.lastIndexOf(','))
  return `${breakAt > Math.floor(limit * 0.58) ? clipped.slice(0, breakAt) : clipped}...`
}

function firstSentence(value: string) {
  const normalized = cleanText(value)
  const match = normalized.match(/^(.+?[.!?。！？])(?:\s|$)/)
  return match?.[1] || normalized
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))]
}

function getSkillSearchFocus(skill: Pick<SkillRecord, 'category' | 'tags' | 'frameworks'>): SkillSearchFocus {
  const source = [skill.category, ...(skill.tags || []), ...(skill.frameworks || [])]
    .join(' ')
    .toLowerCase()

  if (/football|soccer|world cup|sports analytics|match analysis|scouting/.test(source)) return 'football'
  if (/pptx?|powerpoint|presentation|slides?|deck|speaker note/.test(source)) return 'presentation'
  if (/video|filmmaking|seedance|b-roll|broll|caption|camera movement/.test(source)) return 'video'
  if (/finance|financial|quant|trading|trade|market|stock|investment|portfolio|crypto|defi/.test(source)) return 'finance'
  if (/web scraping|scraping|scraper|crawler|crawl|data extraction|extract(ion)?|browser automation/.test(source)) return 'webData'
  if (/figma|design|ui|ux|frontend|front-end|accessibility|visual|image generation/.test(source)) return 'design'
  if (/security|secure|vulnerability|penetration|code audit/.test(source)) return 'security'
  if (/coding|code review|code generation|software engineering|github|repository|pull request|pr review|testing/.test(source)) return 'coding'
  if (/research|rag|knowledge|retrieval|pdf|document|search sources|briefing/.test(source)) return 'research'
  if (/marketing|seo|geo|growth|campaign|social media|content strategy/.test(source)) return 'marketing'
  if (/legal|contract|compliance|policy|law/.test(source)) return 'legal'
  if (/education|teach|teaching|tutor|course|lesson|learning/.test(source)) return 'education'
  if (/data|analytics|analysis|etl|database|sql|notebook|reporting/.test(source)) return 'data'
  if (/automation|workflow|integration|agent orchestration|ops/.test(source)) return 'automation'
  return 'general'
}

function buildLocalizedSkillLead(name: string, focus: string, locale: Locale) {
  return SEARCH_SKILL_LEAD_TEMPLATES[locale]
    .replace('{name}', name)
    .replace('{focus}', focus)
}

function buildLocalizedSkillTitle(name: string, focus: string, locale: Locale) {
  return SEARCH_SKILL_TITLE_TEMPLATES[locale]
    .replace('{name}', name)
    .replace('{focus}', focus)
}

function looksLikeEnglishText(value: string) {
  return /[a-z]/i.test(value) && !/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(value)
}

export function getSearchMetadataCopy(locale: Locale) {
  return SEARCH_METADATA_COPY[locale]
}

export function buildSkillSearchMetadata(skill: Pick<SkillRecord, 'name' | 'description' | 'tagline' | 'category' | 'tags' | 'frameworks'>, locale: Locale) {
  const copy = getSearchMetadataCopy(locale)
  const focusKey = getSkillSearchFocus(skill)
  const focus = SEARCH_FOCUS_LABELS[locale][focusKey]
  const sourceSummary = firstSentence(skill.tagline || skill.description)
  const lead =
    locale === 'en' && looksLikeEnglishText(sourceSummary)
      ? compactText(sourceSummary, 96)
      : buildLocalizedSkillLead(skill.name, focus, locale)
  const description = compactText(`${lead} ${copy.skillDescription}`, 160)
  const title = compactText(buildLocalizedSkillTitle(skill.name, focus, locale), 72)

  return {
    title,
    openGraphTitle: title,
    description,
    imageAlt: `${skill.name} - ${copy.skillSuffix}`,
    keywords: unique([
      skill.name,
      skill.category,
      ...(skill.tags || []).slice(0, 6),
      ...(skill.frameworks || []).slice(0, 4),
      focus,
      ...copy.skillKeywords,
    ]),
    htmlLanguage: copy.htmlLanguage,
    openGraphLocale: copy.openGraphLocale,
  }
}
