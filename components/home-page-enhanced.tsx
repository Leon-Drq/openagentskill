'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Github, Search } from 'lucide-react'
import type { Locale } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/context'
import { USE_CASES } from '@/lib/use-cases'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

interface HomePageEnhancedProps {
  initialLocale?: Locale
  stats: {
    totalSkills: number
    totalDownloads: number
    activePlatforms: number
    agentSubmissions: number
  }
  activities: Array<{
    id: string
    event_type: string
    actor_name: string
    actor_type: string
    description: string | null
    created_at: string
  }>
  featuredSkills: Array<{
    slug: string
    name: string
    description: string
    github_stars: number
    downloads: number
  }>
}

interface ResolveCandidate {
  rank: number
  match_score: number
  skill: {
    slug: string
    name: string
    description: string
    category: string
    repository?: string
    github_repo?: string
  }
  recommendation_reasons: string[]
  audit: {
    audit_score: number
    risk_label: string
    warnings: string[]
  }
  safety: {
    score: number
    label: string
    auto_install_allowed: boolean
    policy_warnings: string[]
  }
  decision?: {
    readiness_score: number
    readiness_label: string
    headline: string
    role: string
    best_for: string[]
    risks: string[]
    next_steps: string[]
  }
  install_plan: {
    target: string
    label: string
    value: string
    command: string
  }
  urls: {
    web: string
    install_api: string
    audit: string
    repository?: string
  }
}

interface ResolveResult {
  task: string
  selected: ResolveCandidate | null
  alternatives: ResolveCandidate[]
  policy_decision: {
    status: string
    summary: string
  }
  meta: {
    total_skills_searched: number
    total_candidates: number
  }
}

const HOME_USE_CASES = USE_CASES.slice(0, 4)
const DEMO_TASK = 'Scrape competitor pricing pages every week'
const DEMO_RECOMMENDATIONS = [
  {
    name: 'Crawl4AI',
    fit: 'Primary crawler',
    score: '96',
    install: 'npx skills add unclecode/crawl4ai',
  },
  {
    name: 'Firecrawl',
    fit: 'LLM-ready extraction',
    score: '92',
    install: 'npx skills add firecrawl/firecrawl',
  },
  {
    name: 'Browser automation pack',
    fit: 'Fallback for dynamic pages',
    score: '89',
    install: 'open pack',
  },
]
const REGISTRY_LAYERS = [
  {
    label: 'Intent capture',
    code: 'Task · Agent · Context',
    desc: 'A human or upstream agent describes the job in natural language.',
    contract: 'Intent',
  },
  {
    label: 'Recommendation engine',
    code: 'Fit · Quality · Freshness',
    desc: 'Skills are ranked by workflow fit, maintenance, stars, and audit signals.',
    contract: 'Rank',
    accent: true,
  },
  {
    label: 'Skill trust profile',
    code: 'Risk · Install · Evidence',
    desc: 'Each candidate gets readiness notes, install commands, and review prompts.',
    contract: 'Audit',
  },
  {
    label: 'Agent install path',
    code: 'Codex · Claude Code · Cursor',
    desc: 'The registry returns the next action an agent can safely execute.',
    contract: 'Install',
  },
]

const QUICKSTART_STEPS = [
  {
    title: 'Ask for a skill path',
    desc: 'Resolve the task into one selected skill, alternatives, safety score, and install plan.',
    code: 'POST /api/agent/resolve',
  },
  {
    title: 'Inspect the trust profile',
    desc: 'Review fit, repository health, risks, and install readiness.',
    code: 'GET /api/agent/skills/crawl4ai',
  },
  {
    title: 'Install in an agent workflow',
    desc: 'Copy the command or hand it to Codex, Claude Code, Cursor, or a custom agent.',
    code: 'GET /api/skills/crawl4ai/install?format=text',
  },
  {
    title: 'Automate discovery',
    desc: 'Use the API as the registry layer behind your own agent runtime.',
    code: 'curl "https://www.openagentskill.com/api/agent/resolve?task=review+pull+requests&agent=codex"',
  },
]

const SCENARIO_RECOMMENDATIONS = [
  {
    slug: 'web-scraping',
    title: 'Web scraping',
    task: 'Monitor pricing and extract tables',
    skills: ['Crawl4AI', 'Firecrawl', 'Browser automation'],
  },
  {
    slug: 'coding-agents',
    title: 'Coding agents',
    task: 'Inspect repos, patch bugs, verify changes',
    skills: ['GitHub', 'Playwright', 'Code review'],
  },
  {
    slug: 'rag-knowledge',
    title: 'RAG workflows',
    task: 'Turn documents into grounded answers',
    skills: ['MarkItDown', 'LlamaIndex', 'Vector search'],
  },
  {
    slug: 'workflow-automation',
    title: 'Workflow automation',
    task: 'Connect repeated ops across tools',
    skills: ['n8n', 'Zapier', 'Scheduled agents'],
  },
]

const COMPARISON_ROWS = [
  {
    feature: 'Primary job',
    openagentskill: 'Recommend, compare, and install skills from one registry',
    skillsSh: 'Browse and install reusable agent skills',
    agentSkills: 'Define the open skill format and learning path',
    nativeDocs: 'Explain skills inside each native agent platform',
  },
  {
    feature: 'Agent-facing API',
    openagentskill: 'Yes - task-to-skill recommendations for agents',
    skillsSh: 'Directory and install workflow',
    agentSkills: 'Spec and documentation first',
    nativeDocs: 'Platform-specific APIs and docs',
  },
  {
    feature: 'Cross-agent positioning',
    openagentskill: 'Codex, Claude Code, Cursor, MCP-compatible agents, and custom tools',
    skillsSh: 'Open agent skills ecosystem',
    agentSkills: 'Open format for extending agents',
    nativeDocs: 'Best for the vendor platform',
  },
  {
    feature: 'Trust and audit signals',
    openagentskill: 'Stars, quality score, readiness notes, install review',
    skillsSh: 'Directory metadata',
    agentSkills: 'Metadata guidance in SKILL.md',
    nativeDocs: 'Native platform controls',
  },
  {
    feature: 'Best for',
    openagentskill: 'Letting an agent find the right skill automatically',
    skillsSh: 'Finding installable skills quickly',
    agentSkills: 'Learning or authoring the standard',
    nativeDocs: 'Using skills in one product',
  },
]

const HOME_COPY: Record<Locale, {
  heroEyebrow: string
  heroLine1: string
  heroLine2Prefix: string
  heroAccent: string
  heroSubtitle: string
  heroProofLabel: string
  heroProof: string
  primaryCta: string
  githubCta: string
  registryApi: string
  stats: [string, string, string, string]
  taskEyebrow: string
  taskTitle: string
  taskIntro: string
  taskLabel: string
  taskPlaceholder: string
  demoTask: string
  selectedPlan: string
  reviewing: string
  startWith: string
  noReliableMatch: string
  searchedPrefix: string
  searchedSuffix: string
  selected: string
  fit: string
  safety: string
  audit: string
  target: string
  copied: string
  copyInstall: string
  installApi: string
  details: string
  trustSignals: [string, string, string][]
  whyEyebrow: string
  whyTitle: string
  whyIntro: string
  whyPoints: [string, string, string][]
  responseEyebrow: string
  responseTitle: string
  architectureEyebrow: string
  architectureTitle: string
  architectureIntro: string
  compareEyebrow: string
  compareTitle: string
  compareIntro: string
}> = {
  en: {
    heroEyebrow: 'SKILL LAYER · AGENT REGISTRY · AUTO INSTALLS',
    heroLine1: 'The skill layer',
    heroLine2Prefix: 'for ',
    heroAccent: 'AI agents.',
    heroSubtitle: 'Let your AI agent find, compare, and install the right reusable skill automatically.',
    heroProofLabel: 'Position',
    heroProof: 'OpenAgentSkill is npm for AI Agent Skills.',
    primaryCta: 'Find skills for my agent',
    githubCta: 'View on GitHub',
    registryApi: 'Registry API',
    stats: ['Indexed skills', 'Downloads', 'Agent surfaces', 'Recommendation layer'],
    taskEyebrow: 'Agent resolve',
    taskTitle: 'Describe the task. Get one safe skill plan.',
    taskIntro: 'The API returns a selected skill, alternatives, policy decision, audit notes, and install plan before an agent acts.',
    taskLabel: 'What should your agent do?',
    taskPlaceholder: 'Scrape websites and extract structured data...',
    demoTask: 'Try demo task',
    selectedPlan: 'Selected skill plan',
    reviewing: 'Reviewing trust signals...',
    startWith: 'Start with',
    noReliableMatch: 'No reliable match yet',
    searchedPrefix: 'Searched',
    searchedSuffix: 'skills',
    selected: 'Selected',
    fit: 'fit',
    safety: 'Safety',
    audit: 'Audit',
    target: 'Target',
    copied: 'Copied!',
    copyInstall: 'Copy install',
    installApi: 'Install API',
    details: 'Details',
    trustSignals: [
      ['Task fit', '96/100', 'Recommended for web extraction workflows'],
      ['Maintenance', 'Active', 'Stars, freshness, metadata, and repo health'],
      ['Install review', 'Ready', 'Agent-safe next steps before execution'],
    ],
    whyEyebrow: 'Why OpenAgentSkill',
    whyTitle: 'Stop sending agents into random directories.',
    whyIntro: 'A skill registry only becomes useful when an agent can trust it. OpenAgentSkill turns scattered GitHub projects into ranked, auditable, install-ready capabilities that can be called from Codex, Claude Code, Cursor, MCP-compatible agents, and custom runtimes.',
    whyPoints: [
      ['01', 'Task-to-skill resolution', 'Agents start with intent, not category pages. The registry maps a job to one selected skill, alternatives, and fit reasons.'],
      ['02', 'Safety before install', 'Stars, freshness, quality score, permission hints, risks, and readiness notes sit beside the command an agent will run.'],
      ['03', 'Human browse, agent API', 'People can browse the index; agents can call the same registry through resolve, recommendation, and skill endpoints.'],
    ],
    responseEyebrow: 'Registry response',
    responseTitle: 'One call, ranked install path.',
    architectureEyebrow: 'Architecture',
    architectureTitle: 'Four layers between intent and install.',
    architectureIntro: 'OpenAgentSkill is not another static list; it is a registry loop an agent can call before it writes files, opens browsers, or installs third-party code.',
    compareEyebrow: 'Compare',
    compareTitle: 'How OpenAgentSkill differs from other skill platforms.',
    compareIntro: 'The big bet is simple: ordinary directories are for people to browse. OpenAgentSkill is built so an AI agent can discover, compare, and install the right skill automatically.',
  },
  zh: {
    heroEyebrow: 'SKILL LAYER · AGENT 注册表 · 自动安装',
    heroLine1: 'AI Agent 的',
    heroLine2Prefix: '',
    heroAccent: '技能层。',
    heroSubtitle: '让你的 AI Agent 自动发现、比较并安装正确的可复用 Skill。',
    heroProofLabel: '定位',
    heroProof: 'OpenAgentSkill 是 AI Agent Skills 的 npm。',
    primaryCta: '为我的 Agent 找技能',
    githubCta: '查看 GitHub',
    registryApi: '注册表 API',
    stats: ['已收录技能', '下载量', 'Agent 平台', '推荐层'],
    taskEyebrow: 'Agent 解析',
    taskTitle: '描述任务，得到一个安全的 Skill 方案。',
    taskIntro: 'Agent 执行前，API 会返回首选 Skill、备选项、策略判断、审计说明和安装计划。',
    taskLabel: '你的 Agent 要做什么？',
    taskPlaceholder: '爬取网页并提取结构化数据...',
    demoTask: '试试示例任务',
    selectedPlan: '已选择的 Skill 方案',
    reviewing: '正在检查信任信号...',
    startWith: '先用',
    noReliableMatch: '暂时没有可靠匹配',
    searchedPrefix: '已搜索',
    searchedSuffix: '个技能',
    selected: '已选择',
    fit: '匹配',
    safety: '安全',
    audit: '审计',
    target: '目标',
    copied: '已复制',
    copyInstall: '复制安装命令',
    installApi: '安装 API',
    details: '详情',
    trustSignals: [
      ['任务匹配', '96/100', '推荐用于网页提取工作流'],
      ['维护状态', '活跃', 'Stars、更新、元数据和仓库健康度'],
      ['安装审查', '就绪', 'Agent 执行前的安全下一步'],
    ],
    whyEyebrow: '为什么是 OpenAgentSkill',
    whyTitle: '别再把 Agent 扔进随机目录里。',
    whyIntro: 'Skill 注册表只有在 Agent 可以信任它时才真正有用。OpenAgentSkill 把分散的 GitHub 项目变成可排序、可审计、可安装的能力，供 Codex、Claude Code、Cursor、MCP 兼容 Agent 和自定义运行时调用。',
    whyPoints: [
      ['01', '从任务解析到 Skill', 'Agent 从意图出发，而不是从分类页出发。注册表把任务映射成首选 Skill、备选项和匹配理由。'],
      ['02', '安装前先看安全', 'Stars、更新、质量分、权限提示、风险和就绪说明，会和 Agent 将执行的命令一起返回。'],
      ['03', '人类浏览，Agent 调用 API', '人可以浏览索引；Agent 可以通过解析、推荐和 Skill 端点调用同一套注册表。'],
    ],
    responseEyebrow: '注册表响应',
    responseTitle: '一次调用，得到排序后的安装路径。',
    architectureEyebrow: '架构',
    architectureTitle: '从意图到安装之间的四层。',
    architectureIntro: 'OpenAgentSkill 不是另一个静态列表，而是 Agent 在写文件、打开浏览器或安装第三方代码前可以调用的注册表循环。',
    compareEyebrow: '对比',
    compareTitle: 'OpenAgentSkill 与其他 Skill 平台的区别。',
    compareIntro: '核心判断很简单：普通目录是给人浏览的。OpenAgentSkill 是为了让 AI Agent 自动发现、比较并安装正确 Skill 而构建。',
  },
  ja: {
    heroEyebrow: 'SKILL LAYER · AGENT REGISTRY · AUTO INSTALLS',
    heroLine1: 'AI agents の',
    heroLine2Prefix: '',
    heroAccent: 'Skill layer.',
    heroSubtitle: 'AI agent が適切な再利用可能 Skill を自動で発見、比較、インストールできるようにします。',
    heroProofLabel: '位置づけ',
    heroProof: 'OpenAgentSkill は AI Agent Skills の npm です。',
    primaryCta: 'Agent に合う Skill を探す',
    githubCta: 'GitHub を見る',
    registryApi: 'Registry API',
    stats: ['登録済み Skill', 'ダウンロード', 'Agent サーフェス', '推薦レイヤー'],
    taskEyebrow: 'Agent resolve',
    taskTitle: 'タスクを説明し、安全な Skill プランを得る。',
    taskIntro: 'API は Agent が動く前に、選択 Skill、代替案、ポリシー判断、監査メモ、インストール手順を返します。',
    taskLabel: 'Agent に何をさせますか？',
    taskPlaceholder: 'Web サイトをクロールして構造化データを抽出...',
    demoTask: 'デモタスクを試す',
    selectedPlan: '選択された Skill プラン',
    reviewing: '信頼シグナルを確認中...',
    startWith: 'まず使う:',
    noReliableMatch: '信頼できる一致はまだありません',
    searchedPrefix: '検索済み',
    searchedSuffix: 'Skills',
    selected: '選択',
    fit: '一致',
    safety: '安全',
    audit: '監査',
    target: 'ターゲット',
    copied: 'コピー済み',
    copyInstall: 'インストールをコピー',
    installApi: 'Install API',
    details: '詳細',
    trustSignals: [
      ['タスク適合', '96/100', 'Web 抽出ワークフローに推奨'],
      ['メンテナンス', 'Active', 'Stars、更新、メタデータ、リポジトリ健全性'],
      ['インストール確認', 'Ready', 'Agent 実行前の安全な次ステップ'],
    ],
    whyEyebrow: 'Why OpenAgentSkill',
    whyTitle: 'Agent をランダムなディレクトリに送らない。',
    whyIntro: 'Skill レジストリは Agent が信頼できて初めて役に立ちます。OpenAgentSkill は散らばった GitHub プロジェクトを、ランキング、監査、インストール可能な能力に変換します。',
    whyPoints: [
      ['01', 'タスクから Skill へ', 'Agent はカテゴリではなく意図から始めます。レジストリはジョブを選択 Skill、代替案、適合理由へ変換します。'],
      ['02', 'インストール前の安全性', 'Stars、鮮度、品質スコア、リスク、準備状況を実行コマンドと並べて確認できます。'],
      ['03', '人は閲覧、Agent は API', '人は索引を閲覧し、Agent は resolve、recommend、skill endpoints から同じ登録表を呼び出せます。'],
    ],
    responseEyebrow: 'Registry response',
    responseTitle: '一度の呼び出しで、順位付きのインストール経路。',
    architectureEyebrow: 'Architecture',
    architectureTitle: '意図からインストールまでの 4 層。',
    architectureIntro: 'OpenAgentSkill は静的リストではなく、Agent がファイル作成、ブラウザ操作、外部コード導入の前に呼べるレジストリループです。',
    compareEyebrow: 'Compare',
    compareTitle: 'OpenAgentSkill と他の Skill プラットフォームの違い。',
    compareIntro: '普通のディレクトリは人が閲覧するものです。OpenAgentSkill は AI Agent が正しい Skill を自動で発見、比較、インストールするために作られています。',
  },
  ko: {
    heroEyebrow: 'SKILL LAYER · AGENT REGISTRY · AUTO INSTALLS',
    heroLine1: 'AI agents를 위한',
    heroLine2Prefix: '',
    heroAccent: 'Skill layer.',
    heroSubtitle: 'AI agent가 올바른 재사용 가능 Skill을 자동으로 찾고, 비교하고, 설치하게 합니다.',
    heroProofLabel: '포지션',
    heroProof: 'OpenAgentSkill은 AI Agent Skills의 npm입니다.',
    primaryCta: 'Agent에 맞는 Skill 찾기',
    githubCta: 'GitHub 보기',
    registryApi: 'Registry API',
    stats: ['등록된 Skill', '다운로드', 'Agent 표면', '추천 레이어'],
    taskEyebrow: 'Agent resolve',
    taskTitle: '작업을 설명하면 안전한 Skill 계획을 받습니다.',
    taskIntro: 'API는 Agent가 실행하기 전에 선택 Skill, 대안, 정책 판단, 감사 메모, 설치 계획을 반환합니다.',
    taskLabel: 'Agent가 무엇을 해야 하나요?',
    taskPlaceholder: '웹사이트를 크롤링하고 구조화 데이터를 추출...',
    demoTask: '데모 작업 실행',
    selectedPlan: '선택된 Skill 계획',
    reviewing: '신뢰 신호 확인 중...',
    startWith: '먼저 사용:',
    noReliableMatch: '아직 신뢰할 만한 매칭이 없습니다',
    searchedPrefix: '검색한',
    searchedSuffix: '개 Skill',
    selected: '선택됨',
    fit: '적합도',
    safety: '안전',
    audit: '감사',
    target: '대상',
    copied: '복사됨',
    copyInstall: '설치 명령 복사',
    installApi: 'Install API',
    details: '상세',
    trustSignals: [
      ['작업 적합도', '96/100', '웹 추출 워크플로에 추천'],
      ['유지보수', 'Active', 'Stars, 최신성, 메타데이터, 저장소 상태'],
      ['설치 검토', 'Ready', 'Agent 실행 전 안전한 다음 단계'],
    ],
    whyEyebrow: 'Why OpenAgentSkill',
    whyTitle: 'Agent를 임의의 디렉터리로 보내지 마세요.',
    whyIntro: 'Skill 레지스트리는 Agent가 신뢰할 수 있을 때 유용합니다. OpenAgentSkill은 흩어진 GitHub 프로젝트를 정렬 가능하고 감사 가능하며 설치 가능한 능력으로 바꿉니다.',
    whyPoints: [
      ['01', '작업에서 Skill로', 'Agent는 카테고리 페이지가 아니라 의도에서 시작합니다. 레지스트리는 작업을 선택 Skill, 대안, 적합 이유로 매핑합니다.'],
      ['02', '설치 전 안전성', 'Stars, 최신성, 품질 점수, 위험, 준비 상태가 Agent가 실행할 명령과 함께 제공됩니다.'],
      ['03', '사람은 탐색, Agent는 API', '사람은 인덱스를 탐색하고 Agent는 resolve, recommendation, skill endpoint로 같은 레지스트리를 호출합니다.'],
    ],
    responseEyebrow: 'Registry response',
    responseTitle: '한 번의 호출로 정렬된 설치 경로.',
    architectureEyebrow: 'Architecture',
    architectureTitle: '의도와 설치 사이의 네 계층.',
    architectureIntro: 'OpenAgentSkill은 정적 목록이 아니라 Agent가 파일 작성, 브라우저 실행, 외부 코드 설치 전에 호출할 수 있는 레지스트리 루프입니다.',
    compareEyebrow: 'Compare',
    compareTitle: 'OpenAgentSkill이 다른 Skill 플랫폼과 다른 점.',
    compareIntro: '일반 디렉터리는 사람이 탐색하기 위한 것입니다. OpenAgentSkill은 AI Agent가 올바른 Skill을 자동으로 발견, 비교, 설치하도록 설계되었습니다.',
  },
  es: {
    heroEyebrow: 'SKILL LAYER · AGENT REGISTRY · AUTO INSTALLS',
    heroLine1: 'La capa de skills',
    heroLine2Prefix: 'para ',
    heroAccent: 'AI agents.',
    heroSubtitle: 'Permite que tu AI agent encuentre, compare e instale automaticamente el skill reutilizable correcto.',
    heroProofLabel: 'Posicion',
    heroProof: 'OpenAgentSkill es npm para AI Agent Skills.',
    primaryCta: 'Buscar skills para mi agent',
    githubCta: 'Ver en GitHub',
    registryApi: 'Registry API',
    stats: ['Skills indexados', 'Descargas', 'Superficies agent', 'Capa de recomendacion'],
    taskEyebrow: 'Agent resolve',
    taskTitle: 'Describe la tarea. Recibe un plan de skill seguro.',
    taskIntro: 'La API devuelve un skill elegido, alternativas, decision de politica, notas de auditoria y plan de instalacion antes de que actue el agent.',
    taskLabel: 'Que debe hacer tu agent?',
    taskPlaceholder: 'Extraer sitios web y datos estructurados...',
    demoTask: 'Probar tarea demo',
    selectedPlan: 'Plan de skill seleccionado',
    reviewing: 'Revisando senales de confianza...',
    startWith: 'Empieza con',
    noReliableMatch: 'Aun no hay una coincidencia fiable',
    searchedPrefix: 'Buscados',
    searchedSuffix: 'skills',
    selected: 'Seleccionado',
    fit: 'ajuste',
    safety: 'Seguridad',
    audit: 'Auditoria',
    target: 'Destino',
    copied: 'Copiado',
    copyInstall: 'Copiar instalacion',
    installApi: 'Install API',
    details: 'Detalles',
    trustSignals: [
      ['Ajuste de tarea', '96/100', 'Recomendado para flujos de extraccion web'],
      ['Mantenimiento', 'Active', 'Stars, frescura, metadatos y salud del repo'],
      ['Revision de instalacion', 'Ready', 'Siguientes pasos seguros antes de ejecutar'],
    ],
    whyEyebrow: 'Why OpenAgentSkill',
    whyTitle: 'No envies agentes a directorios aleatorios.',
    whyIntro: 'Una registry de skills solo sirve si un agent puede confiar en ella. OpenAgentSkill convierte proyectos dispersos de GitHub en capacidades ordenadas, auditables y listas para instalar.',
    whyPoints: [
      ['01', 'De tarea a skill', 'Los agents empiezan con intencion, no con paginas de categorias. La registry mapea el trabajo a un skill elegido, alternativas y razones de ajuste.'],
      ['02', 'Seguridad antes de instalar', 'Stars, frescura, quality score, riesgos y readiness aparecen junto al comando que ejecutara el agent.'],
      ['03', 'UI para humanos, API para agents', 'Las personas exploran el indice; los agents llaman la misma registry via resolve, recommendation y skill endpoints.'],
    ],
    responseEyebrow: 'Registry response',
    responseTitle: 'Una llamada, ruta de instalacion ordenada.',
    architectureEyebrow: 'Architecture',
    architectureTitle: 'Cuatro capas entre intencion e instalacion.',
    architectureIntro: 'OpenAgentSkill no es otra lista estatica; es un loop de registry que un agent puede llamar antes de escribir archivos, abrir navegadores o instalar codigo externo.',
    compareEyebrow: 'Compare',
    compareTitle: 'Como OpenAgentSkill se diferencia de otras plataformas.',
    compareIntro: 'La apuesta es simple: los directorios normales son para humanos. OpenAgentSkill esta construido para que un AI agent descubra, compare e instale el skill correcto automaticamente.',
  },
  de: {
    heroEyebrow: 'SKILL LAYER · AGENT REGISTRY · AUTO INSTALLS',
    heroLine1: 'Die Skill-Schicht',
    heroLine2Prefix: 'fur ',
    heroAccent: 'AI agents.',
    heroSubtitle: 'Lass deinen AI agent automatisch den richtigen wiederverwendbaren Skill finden, vergleichen und installieren.',
    heroProofLabel: 'Position',
    heroProof: 'OpenAgentSkill ist npm fur AI Agent Skills.',
    primaryCta: 'Skills fur meinen Agent finden',
    githubCta: 'Auf GitHub ansehen',
    registryApi: 'Registry API',
    stats: ['Indexierte Skills', 'Downloads', 'Agent-Oberflachen', 'Empfehlungsschicht'],
    taskEyebrow: 'Agent resolve',
    taskTitle: 'Beschreibe die Aufgabe. Erhalte einen sicheren Skill-Plan.',
    taskIntro: 'Die API liefert ausgewahlten Skill, Alternativen, Policy-Entscheidung, Audit-Notizen und Installationsplan, bevor der Agent handelt.',
    taskLabel: 'Was soll dein Agent tun?',
    taskPlaceholder: 'Websites crawlen und strukturierte Daten extrahieren...',
    demoTask: 'Demo-Aufgabe testen',
    selectedPlan: 'Ausgewahlter Skill-Plan',
    reviewing: 'Vertrauenssignale werden gepruft...',
    startWith: 'Starte mit',
    noReliableMatch: 'Noch kein verlasslicher Treffer',
    searchedPrefix: 'Durchsucht',
    searchedSuffix: 'Skills',
    selected: 'Ausgewahlt',
    fit: 'Passung',
    safety: 'Sicherheit',
    audit: 'Audit',
    target: 'Ziel',
    copied: 'Kopiert',
    copyInstall: 'Install-Befehl kopieren',
    installApi: 'Install API',
    details: 'Details',
    trustSignals: [
      ['Task-Fit', '96/100', 'Empfohlen fur Web-Extraktions-Workflows'],
      ['Wartung', 'Active', 'Stars, Aktualitat, Metadaten und Repo-Gesundheit'],
      ['Install Review', 'Ready', 'Agent-sichere nachste Schritte vor Ausfuhrung'],
    ],
    whyEyebrow: 'Why OpenAgentSkill',
    whyTitle: 'Schicke Agents nicht in zufallige Verzeichnisse.',
    whyIntro: 'Eine Skill Registry ist nur nutzlich, wenn ein Agent ihr vertrauen kann. OpenAgentSkill macht verstreute GitHub-Projekte zu sortierten, auditierbaren und installierbaren Fahigkeiten.',
    whyPoints: [
      ['01', 'Von Aufgabe zu Skill', 'Agents starten mit Intention, nicht mit Kategorien. Die Registry mappt Jobs auf einen Skill, Alternativen und Fit-Grunde.'],
      ['02', 'Sicherheit vor Installation', 'Stars, Aktualitat, Qualitat, Risiken und Readiness stehen neben dem Befehl, den der Agent ausfuhrt.'],
      ['03', 'Menschen browsen, Agents nutzen API', 'Menschen durchsuchen den Index; Agents rufen dieselbe Registry uber Resolve-, Recommendation- und Skill-Endpunkte auf.'],
    ],
    responseEyebrow: 'Registry response',
    responseTitle: 'Ein Call, sortierter Installationspfad.',
    architectureEyebrow: 'Architecture',
    architectureTitle: 'Vier Schichten zwischen Intention und Installation.',
    architectureIntro: 'OpenAgentSkill ist keine weitere statische Liste, sondern ein Registry-Loop, den ein Agent vor Dateianderungen, Browseraktionen oder Drittcode-Installationen aufrufen kann.',
    compareEyebrow: 'Compare',
    compareTitle: 'Wie sich OpenAgentSkill von anderen Skill-Plattformen unterscheidet.',
    compareIntro: 'Der Kern: Normale Verzeichnisse sind fur Menschen. OpenAgentSkill ist gebaut, damit ein AI Agent den richtigen Skill automatisch entdeckt, vergleicht und installiert.',
  },
  fr: {
    heroEyebrow: 'SKILL LAYER · AGENT REGISTRY · AUTO INSTALLS',
    heroLine1: 'La couche de skills',
    heroLine2Prefix: 'pour ',
    heroAccent: 'AI agents.',
    heroSubtitle: 'Permettez a votre AI agent de trouver, comparer et installer automatiquement le bon skill reutilisable.',
    heroProofLabel: 'Position',
    heroProof: 'OpenAgentSkill est npm pour AI Agent Skills.',
    primaryCta: 'Trouver des skills pour mon agent',
    githubCta: 'Voir sur GitHub',
    registryApi: 'Registry API',
    stats: ['Skills indexes', 'Telechargements', 'Surfaces agent', 'Couche de recommandation'],
    taskEyebrow: 'Agent resolve',
    taskTitle: 'Decrivez la tache. Obtenez un plan de skill sur.',
    taskIntro: 'L API renvoie un skill choisi, des alternatives, une decision de politique, des notes d audit et un plan d installation avant que l agent agisse.',
    taskLabel: 'Que doit faire votre agent ?',
    taskPlaceholder: 'Explorer des sites web et extraire des donnees structurees...',
    demoTask: 'Essayer la demo',
    selectedPlan: 'Plan de skill selectionne',
    reviewing: 'Verification des signaux de confiance...',
    startWith: 'Commencer avec',
    noReliableMatch: 'Aucune correspondance fiable pour le moment',
    searchedPrefix: 'Recherche dans',
    searchedSuffix: 'skills',
    selected: 'Selectionne',
    fit: 'fit',
    safety: 'Securite',
    audit: 'Audit',
    target: 'Cible',
    copied: 'Copie',
    copyInstall: 'Copier installation',
    installApi: 'Install API',
    details: 'Details',
    trustSignals: [
      ['Ajustement tache', '96/100', 'Recommande pour les workflows d extraction web'],
      ['Maintenance', 'Active', 'Stars, fraicheur, metadonnees et sante du repo'],
      ['Revue installation', 'Ready', 'Etapes sures avant execution par l agent'],
    ],
    whyEyebrow: 'Why OpenAgentSkill',
    whyTitle: 'N envoyez plus les agents dans des repertoires aleatoires.',
    whyIntro: 'Un registre de skills devient utile seulement si un agent peut lui faire confiance. OpenAgentSkill transforme des projets GitHub disperses en capacites classees, auditables et installables.',
    whyPoints: [
      ['01', 'De la tache au skill', 'Les agents commencent par l intention, pas par les categories. Le registre mappe un job vers un skill choisi, des alternatives et des raisons de fit.'],
      ['02', 'Securite avant installation', 'Stars, fraicheur, score qualite, risques et readiness accompagnent la commande que l agent executera.'],
      ['03', 'Humains en UI, agents en API', 'Les humains parcourent l index; les agents appellent le meme registre via resolve, recommendation et skill endpoints.'],
    ],
    responseEyebrow: 'Registry response',
    responseTitle: 'Un appel, un chemin d installation classe.',
    architectureEyebrow: 'Architecture',
    architectureTitle: 'Quatre couches entre intention et installation.',
    architectureIntro: 'OpenAgentSkill n est pas une autre liste statique; c est une boucle de registre qu un agent peut appeler avant d ecrire des fichiers, ouvrir un navigateur ou installer du code tiers.',
    compareEyebrow: 'Compare',
    compareTitle: 'Comment OpenAgentSkill differe des autres plateformes.',
    compareIntro: 'Le pari est simple : les repertoires ordinaires sont faits pour les humains. OpenAgentSkill permet a un AI agent de decouvrir, comparer et installer automatiquement le bon skill.',
  },
}

const COMPARISON_LINKS = [
  { label: 'OpenAgentSkill', href: '/' },
  { label: 'skills.sh', href: 'https://www.skills.sh/' },
  { label: 'agentskills.io', href: 'https://agentskills.io/home' },
  { label: 'Native docs', href: 'https://developers.openai.com/codex/skills' },
]

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}K`
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`
  return value.toLocaleString()
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="min-w-0 max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6d675e]">{eyebrow}</p>
      <h2
        className="mt-4 text-balance text-3xl font-normal leading-tight tracking-normal md:text-5xl"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {title}
      </h2>
    </div>
  )
}

export function HomePageEnhanced({ initialLocale, stats }: HomePageEnhancedProps) {
  const { t, locale } = useI18n()
  const activeLocale = initialLocale || locale
  const [taskQuery, setTaskQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null)
  const [searchedCount, setSearchedCount] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const resolvedCandidates = resolveResult
    ? [resolveResult.selected, ...resolveResult.alternatives].filter((item): item is ResolveCandidate => Boolean(item))
    : []
  const copy = HOME_COPY[activeLocale] || HOME_COPY.en
  const statItems = [
    [stats.totalSkills.toLocaleString(), copy.stats[0]],
    [`${Math.round(stats.totalDownloads / 1000)}K+`, copy.stats[1]],
    [stats.activePlatforms.toLocaleString(), copy.stats[2]],
    ['API', copy.stats[3]],
  ]

  const runRecommendation = async (query: string) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery || isSearching) return
    setTaskQuery(normalizedQuery)
    setIsSearching(true)
    setShowResults(true)
    setResolveResult(null)
    try {
      const res = await fetch('/api/agent/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: normalizedQuery,
          agent: 'codex',
          limit: 3,
          constraints: {
            max_risk: 'medium',
            needs_install_command: true,
          },
        }),
      })
      if (!res.ok) throw new Error('Resolve request failed')
      const data = (await res.json()) as ResolveResult
      setResolveResult(data)
      setSearchedCount(data.meta?.total_skills_searched || 0)
    } catch {
      setResolveResult(null)
      setSearchedCount(0)
    } finally {
      setIsSearching(false)
    }
  }

  const handleFindSkills = async () => {
    await runRecommendation(taskQuery)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFindSkills()
  }

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#1d1b18]">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-[#e4e0d8]">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-75"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,27,24,0.12) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-20 md:pb-24 md:pt-28">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7a642]" aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#6d675e]">{copy.heroEyebrow}</span>
          </div>

          <h1
            className="max-w-5xl text-balance text-5xl font-normal leading-[1.02] tracking-normal md:text-7xl lg:text-[5.6rem]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {copy.heroLine1}
            <br className="hidden md:block" />
            {' '}
            {copy.heroLine2Prefix}
            <span className="italic text-[#006b4f]">{copy.heroAccent}</span>
          </h1>

          <p className="mt-8 max-w-3xl text-pretty text-lg leading-relaxed text-[#5f5a52] md:text-xl">
            {copy.heroSubtitle}
          </p>

          <div className="mt-5 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-[#d8d2c6] bg-[#fffdf8]/80 px-3 py-2 text-sm text-[#5f5a52] shadow-[0_8px_24px_rgba(29,27,24,0.04)]">
            <span className="rounded-full bg-[#e8f1ed] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#006b4f]">
              {copy.heroProofLabel}
            </span>
            <span className="min-w-0 text-pretty font-semibold text-[#1d1b18]">{copy.heroProof}</span>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-3">
            <a
              href="#task-search"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              {copy.primaryCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="https://github.com/Leon-Drq/openagentskill"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-[#d8d2c6] bg-[#fffdf8]/85 px-5 text-sm font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f] sm:w-auto"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              {copy.githubCta}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <Link
              href="/api-docs"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-transparent px-2 font-mono text-xs text-[#6d675e] transition-colors hover:text-[#1d1b18] sm:w-auto"
            >
              {copy.registryApi}
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-20 grid grid-cols-2 gap-y-6 border-t border-[#d8d2c6] pt-8 md:grid-cols-4">
            {statItems.map(([value, label]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#6d675e]">{label}</span>
                <span
                  className="text-2xl tracking-normal"
                  style={{ fontFamily: value === 'API' ? 'var(--font-mono)' : 'Georgia, "Times New Roman", serif' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={searchRef}
        id="task-search"
        className="relative overflow-hidden border-b border-[#e4e0d8] px-6 py-20 md:py-24"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(29,27,24,0.10) 1px, transparent 0)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow={copy.taskEyebrow}
              title={copy.taskTitle}
            />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#5f5a52] sm:text-base">
              {copy.taskIntro}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {HOME_USE_CASES.slice(0, 4).map((useCase) => (
                <button
                  key={useCase.slug}
                  type="button"
                  onClick={() => runRecommendation(useCase.heroPrompt)}
                  className="rounded-full border border-[#d8d2c6] bg-[#fffdf8]/80 px-3 py-1.5 text-xs font-medium text-[#5f5a52] transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
                >
                  {useCase.shortTitle}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8]/92 shadow-[0_18px_55px_rgba(29,27,24,0.05)]">
            <div className="border-b border-[#e4e0d8] p-4 sm:p-5">
              <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">
                {copy.taskLabel}
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={copy.taskPlaceholder}
                  className="min-w-0 flex-1 rounded-[8px] border border-[#d8d2c6] bg-[#fbfaf6] px-4 py-3 text-sm outline-none placeholder:text-[#6d675e]/50 focus:border-[#006b4f]"
                />
                <button
                  onClick={handleFindSkills}
                  disabled={isSearching || !taskQuery.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  {isSearching ? copy.reviewing : t.hero.findSkills}
                </button>
              </div>
              <button
                type="button"
                onClick={() => runRecommendation(DEMO_TASK)}
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#006b4f] transition-opacity hover:opacity-75"
              >
                {copy.demoTask}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {showResults ? (
              <div>
                <div className="flex flex-col gap-2 border-b border-[#e4e0d8] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">{copy.selectedPlan}</p>
                    <h3 className="mt-1 text-xl font-semibold">
                      {isSearching
                        ? copy.reviewing
                        : resolvedCandidates[0]
                          ? `${copy.startWith} ${resolvedCandidates[0].skill.name}`
                          : copy.noReliableMatch}
                    </h3>
                    {!isSearching && resolveResult?.policy_decision.summary && (
                      <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#6d675e]">
                        {resolveResult.policy_decision.summary}
                      </p>
                    )}
                  </div>
                  {!isSearching && searchedCount > 0 && (
                    <div className="rounded-full border border-[#d8d2c6] px-3 py-1.5 font-mono text-xs text-[#6d675e]">
                      {copy.searchedPrefix} {formatCompact(searchedCount)} {copy.searchedSuffix}
                    </div>
                  )}
                </div>

                {isSearching ? (
                  <div className="px-5 py-10 text-center text-sm text-[#5f5a52]">
                    <span className="inline-block animate-pulse">{'>'} {t.hero.searching}</span>
                  </div>
                ) : resolvedCandidates.length > 0 ? (
                  <div className="grid gap-px bg-[#e4e0d8] md:grid-cols-3">
                    {resolvedCandidates.slice(0, 3).map((rec, i) => (
                      <div key={rec.skill.slug} className="min-w-0 bg-[#fffdf8] p-4 sm:p-5">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#e8f1ed] px-2 py-1 font-mono text-[11px] font-semibold text-[#006b4f]">
                            {i === 0 ? copy.selected : `#${rec.rank}`}
                          </span>
                          <span className="rounded-full border border-[#d8d2c6] px-2 py-1 font-mono text-[11px] text-[#6d675e]">
                            {Math.min(99, Math.max(1, Math.round(Number(rec.match_score || 0))))}% {copy.fit}
                          </span>
                          <span className="rounded-full border border-[#d8d2c6] px-2 py-1 font-mono text-[11px] text-[#6d675e]">
                            {copy.safety} {rec.safety.score}
                          </span>
                        </div>
                        <Link href={`/skills/${rec.skill.slug}`} className="text-lg font-semibold hover:text-[#006b4f]">
                          {rec.skill.name}
                        </Link>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#5f5a52]">
                          {rec.decision?.headline || rec.recommendation_reasons[0] || rec.skill.description}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-[#e0dbd2] bg-[#e0dbd2] text-center">
                          <div className="bg-[#fbfaf6] p-2">
                            <p className="font-mono text-[11px] text-[#6d675e]">{copy.audit}</p>
                            <p className="mt-1 font-mono text-sm font-semibold text-[#1d1b18]">{rec.audit.audit_score}/100</p>
                          </div>
                          <div className="bg-[#fbfaf6] p-2">
                            <p className="font-mono text-[11px] text-[#6d675e]">{copy.target}</p>
                            <p className="mt-1 truncate font-mono text-sm font-semibold text-[#1d1b18]">{rec.install_plan.label}</p>
                          </div>
                        </div>
                        <div className="mt-4 break-all rounded-[8px] border border-[#e0dbd2] bg-[#fbfaf6] p-2 font-mono text-[11px] text-[#6d675e]">
                          {rec.install_plan.value}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <button
                            onClick={() => copyToClipboard(rec.install_plan.value)}
                            className="rounded-[8px] bg-[#1d1b18] px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-85"
                          >
                            {copiedCmd === rec.install_plan.value ? copy.copied : copy.copyInstall}
                          </button>
                          <Link
                            href={rec.urls.install_api || `/api/skills/${rec.skill.slug}/install`}
                            className="rounded-[8px] border border-[#d8d2c6] px-3 py-2 text-center text-xs font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
                          >
                            {copy.installApi}
                          </Link>
                          <Link
                            href={`/skills/${rec.skill.slug}`}
                            className="rounded-[8px] border border-[#d8d2c6] px-3 py-2 text-center text-xs font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
                          >
                            {copy.details}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-[#5f5a52]">
                    {t.hero.noResults}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-px bg-[#e4e0d8] sm:grid-cols-3">
                {copy.trustSignals.map(([label, value, signalCopy]) => (
                  <div key={label} className="bg-[#fffdf8] p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">{label}</p>
                    <p className="mt-2 font-mono text-sm font-semibold text-[#006b4f]">{value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#5f5a52]">{signalCopy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto grid min-w-0 max-w-6xl gap-10 md:grid-cols-12">
          <div className="min-w-0 md:col-span-7">
            <SectionHeading
              eyebrow={copy.whyEyebrow}
              title={copy.whyTitle}
            />
            <p className="mt-6 text-lg leading-relaxed text-[#5f5a52] md:text-xl">
              {copy.whyIntro}
            </p>

            <ul className="mt-8 space-y-5">
              {copy.whyPoints.map(([tag, title, body]) => (
                <li key={title} className="grid grid-cols-[auto_1fr] gap-5 border-t border-[#d8d2c6] pt-5">
                  <span className="font-mono text-xs text-[#6d675e]">{tag}</span>
                  <div>
                    <h3
                      className="text-xl tracking-normal"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-[#5f5a52]">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 md:col-span-5">
            <div className="sticky top-24 overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8] shadow-[0_18px_55px_rgba(29,27,24,0.05)]">
              <div className="border-b border-[#e4e0d8] p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#6d675e]">{copy.responseEyebrow}</p>
                <h3
                  className="mt-2 text-2xl leading-tight"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {copy.responseTitle}
                </h3>
              </div>
              <pre className="overflow-x-auto bg-[#f2f0e9]/70 p-5 font-mono text-[12px] leading-relaxed text-[#3f3b35]">
                <code>{`{
  "task": "scrape pricing pages",
  "selected": {
    "skill": "Crawl4AI",
    "safety": "80/100",
    "policy": "human_review_required",
    "install_plan": "npx skills add unclecode/crawl4ai"
  },
  "alternatives": ["Firecrawl", "AnyCrawl"]
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] bg-[#f3f1ea]/55 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid min-w-0 gap-8 md:grid-cols-12 md:items-end">
            <div className="min-w-0 md:col-span-7">
              <SectionHeading
                eyebrow={copy.architectureEyebrow}
                title={copy.architectureTitle}
              />
              <p className="mt-6 max-w-2xl leading-relaxed text-[#5f5a52]">
                {copy.architectureIntro}
              </p>
            </div>

            <div className="min-w-0 md:col-span-5">
              <div className="grid overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8] sm:grid-cols-3">
                {[
                  ['Indexed', stats.totalSkills.toLocaleString()],
                  ['Signals', 'Fit · Risk'],
                  ['Surface', 'API · UI'],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-[#e4e0d8] px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6d675e]">{label}</p>
                    <p className="mt-1 whitespace-nowrap font-mono text-sm text-[#1d1b18]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 grid min-w-0 gap-8 lg:grid-cols-12">
            <ol className="space-y-3 lg:col-span-7">
              {REGISTRY_LAYERS.map((layer, index) => (
                <li
                  key={layer.label}
                  className={`grid min-w-0 grid-cols-[3rem_1fr] gap-4 rounded-[10px] border p-4 md:grid-cols-[3.5rem_1fr_auto] md:items-center md:p-5 ${
                    layer.accent
                      ? 'border-[#006b4f]/45 bg-[#e8f1ed] shadow-[0_0_0_1px_rgba(0,107,79,0.10)]'
                      : 'border-[#d8d2c6] bg-[#fffdf8]'
                  }`}
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-[8px] border font-mono text-sm ${
                      layer.accent
                        ? 'border-[#006b4f]/40 bg-[#006b4f] text-white'
                        : 'border-[#d8d2c6] bg-[#f2f0e9] text-[#6d675e]'
                    }`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3
                        className="text-xl leading-tight"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        {layer.label}
                      </h3>
                      {layer.accent && (
                        <span className="rounded-full border border-[#006b4f]/25 bg-[#fbfaf6] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#006b4f]">
                          ranker
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#5f5a52]">{layer.desc}</p>
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
                    <span className="rounded-full border border-[#d8d2c6] bg-[#fbfaf6] px-3 py-1 font-mono text-[11px] text-[#6d675e]">
                      {layer.code}
                    </span>
                    <span className="rounded-full border border-[#d8d2c6] bg-[#f2f0e9] px-3 py-1 font-mono text-[11px] text-[#1d1b18]">
                      {layer.contract}
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            <aside className="lg:col-span-5">
              <div className="sticky top-24 overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8] shadow-[0_18px_55px_rgba(29,27,24,0.05)]">
                <div className="border-b border-[#d8d2c6] bg-[#f2f0e9]/70 px-5 py-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6d675e]">Execution loop</p>
                  <h3
                    className="mt-1 text-2xl leading-none"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    Discover → Inspect → Install
                  </h3>
                </div>
                <div className="divide-y divide-[#e4e0d8]">
                  {DEMO_RECOMMENDATIONS.map((item, index) => (
                    <div key={item.name} className="grid grid-cols-[2.25rem_1fr] gap-4 p-5">
                      <span className="grid h-9 w-9 place-items-center rounded-[8px] border border-[#d8d2c6] bg-[#fbfaf6] font-mono text-[11px] text-[#006b4f]">
                        0{index + 1}
                      </span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6d675e]">{item.score}/100 fit</p>
                        <h4 className="mt-1 font-medium">{item.name}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-[#5f5a52]">{item.fit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Quickstart"
            title="From task description to install command."
          />

          <ol className="mt-12 grid gap-6 md:grid-cols-2">
            {QUICKSTART_STEPS.map((step, index) => (
              <li key={step.title} className="overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#fffdf8]">
                <div className="flex items-start gap-4 px-6 pt-6">
                  <span className="font-mono text-xs tabular-nums text-[#6d675e]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3
                      className="text-xl tracking-normal"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#5f5a52]">{step.desc}</p>
                  </div>
                </div>
                <pre className="mt-5 overflow-x-auto border-t border-[#e4e0d8] bg-[#f2f0e9]/70 p-5 font-mono text-[12.5px] leading-relaxed text-[#3f3b35]">
                  <code>{step.code}</code>
                </pre>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-[10px] border border-dashed border-[#d8d2c6] bg-[#fffdf8] p-5 text-sm text-[#5f5a52]">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#1d1b18]">Agent surfaces</span>
            <span>Codex, Claude Code, Cursor, MCP-compatible agents, and custom internal runners.</span>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={copy.compareEyebrow}
            title={copy.compareTitle}
          />
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5f5a52]">
            {copy.compareIntro}
          </p>

          <div className="mt-8 overflow-hidden rounded-[12px] border border-[#d8d2c6] bg-[#fffdf8]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8d2c6]">
                    <th className="w-[23%] px-4 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#6d675e]">
                      Feature
                    </th>
                    {COMPARISON_LINKS.map((item, index) => (
                      <th
                        key={item.label}
                        className={`px-4 py-4 font-mono text-[11px] uppercase tracking-[0.18em] ${
                          index === 0 ? 'bg-[#e8f1ed] text-[#123b2f]' : 'text-[#6d675e]'
                        }`}
                      >
                        {item.href === '/' ? (
                          item.label
                        ) : (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors hover:text-[#006b4f]"
                          >
                            {item.label}
                          </a>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="border-b border-[#e4e0d8] last:border-b-0">
                      <td className="px-4 py-4 text-base font-medium text-[#1d1b18]">{row.feature}</td>
                      <td className="bg-[#edf5f1] px-4 py-4 font-medium text-[#123b2f]">{row.openagentskill}</td>
                      <td className="px-4 py-4 text-[#5f5a52]">{row.skillsSh}</td>
                      <td className="px-4 py-4 text-[#5f5a52]">{row.agentSkills}</td>
                      <td className="px-4 py-4 text-[#5f5a52]">{row.nativeDocs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-[#6d675e]">
            Comparison is based on each project&apos;s public positioning and documentation. The point is not that one project replaces another; OpenAgentSkill focuses on the registry and recommendation layer agents can call.
          </p>
        </div>
      </section>

      <section className="border-b border-[#e4e0d8] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionHeading
                eyebrow="Workflow starts"
                title="Start from the job your agent needs to do."
              />
            </div>
            <Link href="/use-cases" className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f5a52] transition-colors hover:text-[#006b4f]">
              View all use cases
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-px overflow-hidden rounded-[10px] border border-[#d8d2c6] bg-[#d8d2c6] md:grid-cols-2 lg:grid-cols-4">
            {SCENARIO_RECOMMENDATIONS.map(({ slug, title, task, skills }, index) => (
              <Link
                key={slug}
                href={`/use-cases/${slug}`}
                className="group flex min-h-64 flex-col bg-[#fffdf8] p-5 transition-colors hover:bg-[#f7f4ec]"
              >
                <span className="font-mono text-xs text-[#6d675e]">{String(index + 1).padStart(2, '0')}</span>
                <h3
                  className="mt-4 text-xl leading-tight"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5f5a52]">{task}</p>
                <div className="mt-5 space-y-2">
                  {skills.map((skill) => (
                    <div key={skill} className="rounded-full border border-[#e0dbd2] bg-[#fbfaf6] px-3 py-2 font-mono text-[11px] text-[#5f5a52]">
                      {skill}
                    </div>
                  ))}
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-[#006b4f]">
                  Get recommendations
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-6xl border-t border-[#d8d2c6] pt-12">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6d675e]">Skill layer</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2
                className="max-w-4xl text-4xl font-normal leading-tight tracking-normal md:text-6xl"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Registry for humans. Skill layer for agents.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#5f5a52] md:text-lg">
                Browse when you are exploring. Call the recommendation API when your
                agent needs to pick, compare, and install a skill automatically.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/skills"
                className="inline-flex h-11 items-center justify-center rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Browse skills
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex h-11 items-center justify-center rounded-[8px] border border-[#d8d2c6] bg-[#fffdf8] px-5 text-sm font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
              >
                Read API docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

    </div>
  )
}
