import type { MarketLocale } from '@/lib/i18n/market-routing'

type PageMeta = {
  eyebrow: string
  title: string
  description: string
}

type PackCopy = {
  title: string
  description: string
}

export type LocalizedNavigationContent = {
  tasks: PageMeta & {
    agentEntry: string
    textApi: string
    taskMetric: string
    indexedSkillsMetric: string
    installHandoffMetric: string
    taskCardDescription: string
    openTask: string
  }
  packs: PageMeta & {
    packsMetric: string
    skillsMetric: string
    stepsMetric: string
    picks: string
    topScore: string
    topStars: string
    workflow: string
    openPack: string
    cards: Record<string, PackCopy>
  }
  compare: PageMeta & {
    platformComparison: string
    agentskillsDescription: string
    skillsShDescription: string
    popularSkills: string
    popularSkillsDescription: string
    compareSkill: string
    quality: string
    trust: string
    stars: string
  }
  apiDocs: PageMeta & {
    baseUrls: string
    responseFormats: string
    endpointOverview: string
    agentResolve: string
    agentResolveDescription: string
    registry: string
    registryDescription: string
    outcomes: string
    outcomesDescription: string
    jsonDescription: string
    textDescription: string
  }
}

const taskTitles: Record<MarketLocale, Record<string, string>> = {
  zh: {
    'scrape-pricing-pages': '抓取定价页面',
    'crawl-documentation-site': '抓取文档站',
    'review-pull-requests': '审查 PR',
    'fix-ci-failures': '修复 CI',
    'convert-pdf-to-markdown': 'PDF 转 Markdown',
    'build-rag-knowledge-base': '构建 RAG 知识库',
    'analyze-csv-data': '分析 CSV 数据',
    'automate-browser-workflow': '自动化浏览器流程',
    'generate-seo-content': '生成 SEO 内容草稿',
    'triage-github-issues': '分诊 GitHub Issues',
    'scan-security-risks': '扫描安全风险',
    'summarize-research-sources': '总结研究来源',
    'create-presentation-deck': '制作演示文稿',
  },
  ja: {
    'scrape-pricing-pages': '料金ページを抽出',
    'crawl-documentation-site': 'ドキュメントをクロール',
    'review-pull-requests': 'PR をレビュー',
    'fix-ci-failures': 'CI を修正',
    'convert-pdf-to-markdown': 'PDF を Markdown に変換',
    'build-rag-knowledge-base': 'RAG ナレッジベースを構築',
    'analyze-csv-data': 'CSV を分析',
    'automate-browser-workflow': 'ブラウザ作業を自動化',
    'generate-seo-content': 'SEO コンテンツを作成',
    'triage-github-issues': 'GitHub Issue を整理',
    'scan-security-risks': 'セキュリティリスクを確認',
    'summarize-research-sources': 'リサーチを要約',
    'create-presentation-deck': 'プレゼン資料を作成',
  },
  ko: {
    'scrape-pricing-pages': '가격 페이지 수집',
    'crawl-documentation-site': '문서 사이트 크롤링',
    'review-pull-requests': 'PR 검토',
    'fix-ci-failures': 'CI 수정',
    'convert-pdf-to-markdown': 'PDF를 Markdown으로 변환',
    'build-rag-knowledge-base': 'RAG 지식 베이스 구축',
    'analyze-csv-data': 'CSV 데이터 분석',
    'automate-browser-workflow': '브라우저 워크플로 자동화',
    'generate-seo-content': 'SEO 콘텐츠 초안 작성',
    'triage-github-issues': 'GitHub 이슈 분류',
    'scan-security-risks': '보안 위험 검사',
    'summarize-research-sources': '리서치 소스 요약',
    'create-presentation-deck': '프레젠테이션 제작',
  },
  es: {
    'scrape-pricing-pages': 'Extraer precios',
    'crawl-documentation-site': 'Rastrear documentación',
    'review-pull-requests': 'Revisar PR',
    'fix-ci-failures': 'Corregir CI',
    'convert-pdf-to-markdown': 'Convertir PDF a Markdown',
    'build-rag-knowledge-base': 'Crear base RAG',
    'analyze-csv-data': 'Analizar CSV',
    'automate-browser-workflow': 'Automatizar navegador',
    'generate-seo-content': 'Crear contenido SEO',
    'triage-github-issues': 'Clasificar issues',
    'scan-security-risks': 'Analizar riesgos',
    'summarize-research-sources': 'Resumir investigación',
    'create-presentation-deck': 'Crear presentación',
  },
  de: {
    'scrape-pricing-pages': 'Preis-Seiten extrahieren',
    'crawl-documentation-site': 'Dokumentation crawlen',
    'review-pull-requests': 'PRs prüfen',
    'fix-ci-failures': 'CI beheben',
    'convert-pdf-to-markdown': 'PDF in Markdown umwandeln',
    'build-rag-knowledge-base': 'RAG-Wissensbasis bauen',
    'analyze-csv-data': 'CSV analysieren',
    'automate-browser-workflow': 'Browser-Workflow automatisieren',
    'generate-seo-content': 'SEO-Inhalte erstellen',
    'triage-github-issues': 'GitHub-Issues priorisieren',
    'scan-security-risks': 'Sicherheitsrisiken prüfen',
    'summarize-research-sources': 'Quellen zusammenfassen',
    'create-presentation-deck': 'Präsentation erstellen',
  },
  fr: {
    'scrape-pricing-pages': 'Extraire les tarifs',
    'crawl-documentation-site': 'Explorer la documentation',
    'review-pull-requests': 'Relire les PR',
    'fix-ci-failures': 'Corriger la CI',
    'convert-pdf-to-markdown': 'Convertir un PDF en Markdown',
    'build-rag-knowledge-base': 'Créer une base RAG',
    'analyze-csv-data': 'Analyser un CSV',
    'automate-browser-workflow': 'Automatiser le navigateur',
    'generate-seo-content': 'Créer du contenu SEO',
    'triage-github-issues': 'Trier les issues GitHub',
    'scan-security-risks': 'Analyser les risques',
    'summarize-research-sources': 'Résumer des sources',
    'create-presentation-deck': 'Créer une présentation',
  },
  id: {
    'scrape-pricing-pages': 'Ekstrak halaman harga',
    'crawl-documentation-site': 'Crawl dokumentasi',
    'review-pull-requests': 'Tinjau PR',
    'fix-ci-failures': 'Perbaiki CI',
    'convert-pdf-to-markdown': 'Ubah PDF ke Markdown',
    'build-rag-knowledge-base': 'Bangun basis pengetahuan RAG',
    'analyze-csv-data': 'Analisis CSV',
    'automate-browser-workflow': 'Otomatiskan browser',
    'generate-seo-content': 'Buat konten SEO',
    'triage-github-issues': 'Triage issue GitHub',
    'scan-security-risks': 'Pindai risiko keamanan',
    'summarize-research-sources': 'Ringkas sumber riset',
    'create-presentation-deck': 'Buat presentasi',
  },
}

const packsByLocale: Record<MarketLocale, Record<string, PackCopy>> = {
  zh: {
    'frontend-engineer-agent-pack': { title: '前端工程师', description: '为 React、Next.js、设计系统、组件质量和浏览器验证准备的技能包。' },
    'design-agent-pack': { title: '设计 Agent', description: '为动效、设计系统、UI 组件和视觉生产工作流准备的技能包。' },
    'seo-automation-agent-pack': { title: 'SEO 自动化', description: '把研究、页面、比较内容和社交分发连接起来的增长技能包。' },
    'data-analyst-agent-pack': { title: '数据分析师', description: '用于表格、SQL、数据集、图表和可追溯分析的技能包。' },
    'presentation-agent-pack': { title: '演示 Agent', description: '将文档、链接和研究资料转成可编辑演示文稿的技能包。' },
    'startup-founder-agent-pack': { title: '创业者', description: '用于调研、定位、增长和重复运营工作的创业者技能包。' },
    'supabase-vercel-stripe-builder-pack': { title: 'SaaS 构建者', description: '面向 Supabase、Vercel、Stripe 和 Next.js 全栈交付的技能包。' },
  },
  ja: {
    'frontend-engineer-agent-pack': { title: 'フロントエンドエンジニア', description: 'React、Next.js、デザインシステム、コンポーネント品質、ブラウザ検証のための Skill Pack。' },
    'design-agent-pack': { title: 'デザイン Agent', description: 'モーション、デザインシステム、UI コンポーネント、ビジュアル制作のための Skill Pack。' },
    'seo-automation-agent-pack': { title: 'SEO 自動化', description: 'リサーチ、ページ作成、比較コンテンツ、ソーシャル配信をつなぐ成長向け Skill Pack。' },
    'data-analyst-agent-pack': { title: 'データアナリスト', description: 'スプレッドシート、SQL、データセット、チャート、根拠ある分析のための Skill Pack。' },
    'presentation-agent-pack': { title: 'プレゼンテーション Agent', description: '資料、URL、リサーチを編集可能なプレゼンテーションへ変換する Skill Pack。' },
    'startup-founder-agent-pack': { title: 'スタートアップ創業者', description: 'リサーチ、ポジショニング、成長、繰り返しの運用作業を進める Skill Pack。' },
    'supabase-vercel-stripe-builder-pack': { title: 'SaaS ビルダー', description: 'Supabase、Vercel、Stripe、Next.js によるフルスタック開発の Skill Pack。' },
  },
  ko: {
    'frontend-engineer-agent-pack': { title: '프론트엔드 엔지니어', description: 'React, Next.js, 디자인 시스템, 컴포넌트 품질, 브라우저 검증을 위한 Skill Pack입니다.' },
    'design-agent-pack': { title: '디자인 Agent', description: '모션, 디자인 시스템, UI 컴포넌트, 시각 제작 워크플로를 위한 Skill Pack입니다.' },
    'seo-automation-agent-pack': { title: 'SEO 자동화', description: '리서치, 페이지 제작, 비교 콘텐츠, 소셜 배포를 잇는 성장용 Skill Pack입니다.' },
    'data-analyst-agent-pack': { title: '데이터 분석가', description: '스프레드시트, SQL, 데이터셋, 차트, 근거 기반 분석을 위한 Skill Pack입니다.' },
    'presentation-agent-pack': { title: '프레젠테이션 Agent', description: '문서, URL, 리서치를 편집 가능한 발표 자료로 바꾸는 Skill Pack입니다.' },
    'startup-founder-agent-pack': { title: '스타트업 창업자', description: '리서치, 포지셔닝, 성장, 반복 운영 업무를 위한 Skill Pack입니다.' },
    'supabase-vercel-stripe-builder-pack': { title: 'SaaS 빌더', description: 'Supabase, Vercel, Stripe, Next.js 풀스택 출시를 위한 Skill Pack입니다.' },
  },
  es: {
    'frontend-engineer-agent-pack': { title: 'Ingeniería frontend', description: 'Un pack para React, Next.js, sistemas de diseño, calidad de componentes y verificación en navegador.' },
    'design-agent-pack': { title: 'Agent de diseño', description: 'Un pack para motion, sistemas de diseño, componentes UI y producción visual.' },
    'seo-automation-agent-pack': { title: 'Automatización SEO', description: 'Un pack de crecimiento para investigación, páginas, comparativas y distribución social.' },
    'data-analyst-agent-pack': { title: 'Analista de datos', description: 'Un pack para hojas de cálculo, SQL, conjuntos de datos, gráficos y análisis verificable.' },
    'presentation-agent-pack': { title: 'Agent de presentaciones', description: 'Convierte documentos, URLs e investigación en presentaciones editables.' },
    'startup-founder-agent-pack': { title: 'Fundador de startup', description: 'Un pack para investigación, posicionamiento, crecimiento y operaciones repetibles.' },
    'supabase-vercel-stripe-builder-pack': { title: 'Constructor SaaS', description: 'Un pack full-stack para entregar productos con Supabase, Vercel, Stripe y Next.js.' },
  },
  de: {
    'frontend-engineer-agent-pack': { title: 'Frontend-Engineering', description: 'Ein Pack für React, Next.js, Designsysteme, Komponentenqualität und Browser-Verifikation.' },
    'design-agent-pack': { title: 'Design-Agent', description: 'Ein Pack für Motion, Designsysteme, UI-Komponenten und visuelle Produktion.' },
    'seo-automation-agent-pack': { title: 'SEO-Automatisierung', description: 'Ein Growth-Pack für Recherche, Seiten, Vergleiche und Social Distribution.' },
    'data-analyst-agent-pack': { title: 'Datenanalyse', description: 'Ein Pack für Tabellen, SQL, Datensätze, Charts und nachvollziehbare Analysen.' },
    'presentation-agent-pack': { title: 'Präsentations-Agent', description: 'Macht aus Dokumenten, URLs und Recherche bearbeitbare Präsentationen.' },
    'startup-founder-agent-pack': { title: 'Startup-Founder', description: 'Ein Pack für Recherche, Positionierung, Wachstum und wiederkehrende operative Arbeit.' },
    'supabase-vercel-stripe-builder-pack': { title: 'SaaS-Builder', description: 'Ein Full-Stack-Pack für Supabase, Vercel, Stripe und Next.js.' },
  },
  fr: {
    'frontend-engineer-agent-pack': { title: 'Ingénierie frontend', description: 'Un pack pour React, Next.js, les systèmes de design, la qualité des composants et la vérification navigateur.' },
    'design-agent-pack': { title: 'Agent de design', description: 'Un pack pour le motion, les systèmes de design, les composants UI et la production visuelle.' },
    'seo-automation-agent-pack': { title: 'Automatisation SEO', description: 'Un pack de croissance pour la recherche, les pages, les comparatifs et la diffusion sociale.' },
    'data-analyst-agent-pack': { title: 'Analyse de données', description: 'Un pack pour les tableurs, SQL, jeux de données, graphiques et analyses vérifiables.' },
    'presentation-agent-pack': { title: 'Agent de présentation', description: 'Transforme documents, URLs et recherche en présentations éditables.' },
    'startup-founder-agent-pack': { title: 'Fondateur de startup', description: 'Un pack pour la recherche, le positionnement, la croissance et les opérations récurrentes.' },
    'supabase-vercel-stripe-builder-pack': { title: 'Créateur SaaS', description: 'Un pack full-stack pour Supabase, Vercel, Stripe et Next.js.' },
  },
  id: {
    'frontend-engineer-agent-pack': { title: 'Engineer frontend', description: 'Pack untuk React, Next.js, sistem desain, kualitas komponen, dan verifikasi browser.' },
    'design-agent-pack': { title: 'Agent desain', description: 'Pack untuk motion, sistem desain, komponen UI, dan produksi visual.' },
    'seo-automation-agent-pack': { title: 'Otomasi SEO', description: 'Pack pertumbuhan untuk riset, halaman, perbandingan, dan distribusi sosial.' },
    'data-analyst-agent-pack': { title: 'Analis data', description: 'Pack untuk spreadsheet, SQL, dataset, grafik, dan analisis yang dapat diverifikasi.' },
    'presentation-agent-pack': { title: 'Agent presentasi', description: 'Mengubah dokumen, URL, dan riset menjadi presentasi yang bisa diedit.' },
    'startup-founder-agent-pack': { title: 'Pendiri startup', description: 'Pack untuk riset, positioning, pertumbuhan, dan pekerjaan operasional berulang.' },
    'supabase-vercel-stripe-builder-pack': { title: 'Builder SaaS', description: 'Pack full-stack untuk Supabase, Vercel, Stripe, dan Next.js.' },
  },
}

const content: Record<MarketLocale, LocalizedNavigationContent> = {
  zh: {
    tasks: { eyebrow: 'Agent 任务', title: '从你的 Agent 需要完成的工作开始。', description: '每个任务页都会把真实工作流转成可排序的技能清单、安装命令、安全提示和 Resolve API 调用。', agentEntry: 'Agent 入口', textApi: '文本 API', taskMetric: '任务', indexedSkillsMetric: '已索引技能', installHandoffMetric: '安装交接', taskCardDescription: '打开任务，查看匹配技能、安装计划和人工审查提示。', openTask: '打开任务' },
    packs: { eyebrow: '技能包', title: '为真实 Agent 工作流安装完整技能包。', description: '技能包按工作目标聚合高信号技能，并提供 Agent 所需的安装命令、信任分和工作流步骤。', packsMetric: '技能包', skillsMetric: '技能', stepsMetric: '步骤', picks: '个候选', topScore: '最高分', topStars: '最高 Stars', workflow: '工作流', openPack: '打开技能包', cards: packsByLocale.zh },
    compare: { eyebrow: '技能对比', title: '安装前比较 Agent Skills。', description: '在一个页面内比较高质量技能的质量、信任、采用信号和安装准备情况。', platformComparison: '平台对比', agentskillsDescription: '比较文档优先的浏览方式与面向 Agent 的注册表和安装 API。', skillsShDescription: '比较任务优先的注册表发现与 CLI 优先的技能分发。', popularSkills: '从热门技能开始', popularSkillsDescription: '选择一个可信技能，查看其信任、审计和安装路径。', compareSkill: '对比技能', quality: '质量', trust: '信任', stars: 'Stars' },
    apiDocs: { eyebrow: 'API 文档', title: '面向 Agent 的发现、排序和安装数据。', description: '使用针对 LLM 优化的 JSON 或纯文本响应，以编程方式发现和审查技能。', baseUrls: '基础地址', responseFormats: '响应格式', endpointOverview: '核心端点', agentResolve: '解析任务', agentResolveDescription: '将任务转成推荐技能、备选方案、风险信息和安装计划。', registry: '公共注册表', registryDescription: '搜索技能、读取清单，或取得可审查的安装交接。', outcomes: '结果回传', outcomesDescription: '让 Agent 报告安装与运行结果，帮助推荐从真实使用中学习。', jsonDescription: '结构化 JSON，适合工具调用和程序处理。', textDescription: '为 LLM 消费优化的简洁纯文本。' },
  },
  ja: {
    tasks: { eyebrow: 'Agent タスク', title: 'Agent が行う仕事から始める。', description: '各タスクページは、実際のワークフローを順位付き Skill 候補、インストール手順、安全メモ、Resolve API 呼び出しへ変換します。', agentEntry: 'Agent 入口', textApi: 'テキスト API', taskMetric: 'タスク', indexedSkillsMetric: 'インデックス済み Skills', installHandoffMetric: 'インストール引き渡し', taskCardDescription: 'タスクを開くと、適合する Skill、インストール計画、人によるレビューの注意点を確認できます。', openTask: 'タスクを開く' },
    packs: { eyebrow: 'Skill Packs', title: '実際の Agent ワークフロー向けに、完成した Skill Pack を導入する。', description: 'Skill Pack は仕事ごとに高シグナルの Skill をまとめ、Agent が始めるためのインストールコマンド、Trust Score、ワークフローを提供します。', packsMetric: 'Packs', skillsMetric: 'Skills', stepsMetric: 'ステップ', picks: '候補', topScore: '最高スコア', topStars: '最多 Stars', workflow: 'ワークフロー', openPack: 'Pack を開く', cards: packsByLocale.ja },
    compare: { eyebrow: 'Skill 比較', title: 'インストール前に Agent Skill を比較する。', description: '高シグナルな Skill の品質、Trust、採用シグナル、インストール準備状況を一か所で比較できます。', platformComparison: 'プラットフォーム比較', agentskillsDescription: 'ドキュメント中心の閲覧と、Agent が読める Registry・インストール API を比較します。', skillsShDescription: 'タスク中心の Registry 発見と、CLI 中心の Skill 配布を比較します。', popularSkills: '人気の Skill から始める', popularSkillsDescription: '信頼、監査、インストール経路を確認できる高品質 Skill を選んでください。', compareSkill: 'Skill を比較', quality: '品質', trust: '信頼', stars: 'Stars' },
    apiDocs: { eyebrow: 'API リファレンス', title: 'Agent 向けの発見、ランキング、インストールデータ。', description: 'LLM 消費用に最適化された JSON またはプレーンテキストで、Skill をプログラムから発見・確認できます。', baseUrls: 'ベース URL', responseFormats: 'レスポンス形式', endpointOverview: '主要エンドポイント', agentResolve: 'タスクを解決', agentResolveDescription: 'タスクを推奨 Skill、代替案、リスク情報、インストール計画へ変換します。', registry: '公開 Registry', registryDescription: 'Skill の検索、マニフェストの取得、確認可能なインストール引き渡しを行えます。', outcomes: '結果を報告', outcomesDescription: 'Agent がインストールと実行結果を報告し、実際の利用から推薦を学習させます。', jsonDescription: 'ツール呼び出しとプログラム処理向けの構造化 JSON。', textDescription: 'LLM 消費向けに最適化された簡潔なプレーンテキスト。' },
  },
  ko: {
    tasks: { eyebrow: 'Agent 작업', title: 'Agent가 해야 할 일부터 시작하세요.', description: '각 작업 페이지는 실제 워크플로를 순위화된 Skill 후보, 설치 명령, 안전 메모, Resolve API 호출로 바꿉니다.', agentEntry: 'Agent 시작', textApi: '텍스트 API', taskMetric: '작업', indexedSkillsMetric: '색인된 Skills', installHandoffMetric: '설치 인계', taskCardDescription: '작업을 열어 맞는 Skill, 설치 계획, 사람 검토 메모를 확인하세요.', openTask: '작업 열기' },
    packs: { eyebrow: 'Skill Packs', title: '실제 Agent 워크플로를 위한 완성된 Skill Pack을 설치하세요.', description: 'Skill Pack은 작업별 고신호 Skill을 묶고 Agent가 시작하는 데 필요한 설치 명령, 신뢰 점수, 워크플로 단계를 제공합니다.', packsMetric: 'Packs', skillsMetric: 'Skills', stepsMetric: '단계', picks: '후보', topScore: '최고 점수', topStars: '최고 Stars', workflow: '워크플로', openPack: 'Pack 열기', cards: packsByLocale.ko },
    compare: { eyebrow: 'Skill 비교', title: '설치 전에 Agent Skill을 비교하세요.', description: '고신호 Skill의 품질, 신뢰, 사용 신호, 설치 준비 상태를 한 곳에서 비교합니다.', platformComparison: '플랫폼 비교', agentskillsDescription: '문서 중심 탐색과 Agent가 읽을 수 있는 Registry 및 설치 API를 비교합니다.', skillsShDescription: '작업 중심 Registry 발견과 CLI 중심 Skill 배포를 비교합니다.', popularSkills: '인기 Skill부터 시작', popularSkillsDescription: '신뢰, 감사, 설치 경로를 확인할 수 있는 고품질 Skill을 선택하세요.', compareSkill: 'Skill 비교', quality: '품질', trust: '신뢰', stars: 'Stars' },
    apiDocs: { eyebrow: 'API 레퍼런스', title: 'Agent 친화적인 발견, 순위, 설치 데이터.', description: 'LLM 소비에 최적화된 JSON 또는 일반 텍스트로 Skill을 프로그래밍 방식으로 찾고 검토합니다.', baseUrls: '기본 URL', responseFormats: '응답 형식', endpointOverview: '핵심 엔드포인트', agentResolve: '작업 해결', agentResolveDescription: '작업을 추천 Skill, 대안, 위험 정보, 설치 계획으로 바꿉니다.', registry: '공개 Registry', registryDescription: 'Skill을 검색하고 manifest를 가져오거나 검토 가능한 설치 인계를 받을 수 있습니다.', outcomes: '결과 보고', outcomesDescription: 'Agent가 설치와 실행 결과를 보고하여 실제 사용에서 추천이 학습하도록 합니다.', jsonDescription: '도구 호출과 프로그래밍 처리용 구조화 JSON.', textDescription: 'LLM 소비에 최적화된 간결한 일반 텍스트.' },
  },
  es: {
    tasks: { eyebrow: 'Tareas de agents', title: 'Empieza por el trabajo que tu agent debe resolver.', description: 'Cada página convierte un flujo de trabajo real en una lista de skills, un plan de instalación, notas de seguridad y una llamada a Resolve.', agentEntry: 'Entrada para agents', textApi: 'API de texto', taskMetric: 'Tareas', indexedSkillsMetric: 'Skills indexados', installHandoffMetric: 'Entrega de instalación', taskCardDescription: 'Abre una tarea para ver skills adecuadas, un plan de instalación y notas de revisión humana.', openTask: 'Abrir tarea' },
    packs: { eyebrow: 'Packs de skills', title: 'Instala packs completos para flujos de trabajo reales.', description: 'Los packs agrupan skills de alta señal por trabajo y muestran comandos de instalación, confianza y pasos de flujo para agents.', packsMetric: 'Packs', skillsMetric: 'Skills', stepsMetric: 'Pasos', picks: 'selecciones', topScore: 'Mejor puntuación', topStars: 'Más stars', workflow: 'Flujo', openPack: 'Abrir pack', cards: packsByLocale.es },
    compare: { eyebrow: 'Comparación de skills', title: 'Compara skills de agents antes de instalar.', description: 'Compara calidad, confianza, adopción y preparación de instalación de skills en un solo lugar.', platformComparison: 'Comparación de plataformas', agentskillsDescription: 'Compara la exploración centrada en documentación con un registry y una API de instalación legibles por agents.', skillsShDescription: 'Compara el descubrimiento por tareas con la distribución de skills centrada en CLI.', popularSkills: 'Empieza con skills populares', popularSkillsDescription: 'Elige un skill de alta calidad con señales de confianza, auditoría e instalación.', compareSkill: 'Comparar skill', quality: 'Calidad', trust: 'Confianza', stars: 'Stars' },
    apiDocs: { eyebrow: 'Referencia API', title: 'Datos de descubrimiento, ranking e instalación para agents.', description: 'Descubre y revisa skills mediante JSON o texto plano optimizado para consumo por LLM.', baseUrls: 'URLs base', responseFormats: 'Formatos de respuesta', endpointOverview: 'Endpoints principales', agentResolve: 'Resolver una tarea', agentResolveDescription: 'Convierte una tarea en un skill recomendado, alternativas, riesgos y un plan de instalación.', registry: 'Registry público', registryDescription: 'Busca skills, obtén manifiestos o solicita una entrega de instalación revisable.', outcomes: 'Reportar resultados', outcomesDescription: 'Permite que agents reporten resultados de instalación y ejecución para aprender del uso real.', jsonDescription: 'JSON estructurado para llamadas de herramientas y procesamiento programático.', textDescription: 'Texto plano conciso optimizado para consumo por LLM.' },
  },
  de: {
    tasks: { eyebrow: 'Agent-Aufgaben', title: 'Beginne mit der Arbeit, die dein Agent erledigen soll.', description: 'Jede Aufgabenseite macht aus einem echten Workflow eine priorisierte Skill-Liste, einen Installationsplan, Sicherheitsnotizen und einen Resolve-API-Aufruf.', agentEntry: 'Agent-Einstieg', textApi: 'Text-API', taskMetric: 'Aufgaben', indexedSkillsMetric: 'Indexierte Skills', installHandoffMetric: 'Installationsübergabe', taskCardDescription: 'Öffne eine Aufgabe, um passende Skills, einen Installationsplan und Hinweise zur menschlichen Prüfung zu sehen.', openTask: 'Aufgabe öffnen' },
    packs: { eyebrow: 'Skill Packs', title: 'Installiere komplette Packs für echte Agent-Workflows.', description: 'Packs bündeln hochwertige Skills nach Aufgabe und zeigen Installationsbefehle, Trust Score und Workflow-Schritte für Agents.', packsMetric: 'Packs', skillsMetric: 'Skills', stepsMetric: 'Schritte', picks: 'Picks', topScore: 'Top-Score', topStars: 'Top-Stars', workflow: 'Workflow', openPack: 'Pack öffnen', cards: packsByLocale.de },
    compare: { eyebrow: 'Skill-Vergleich', title: 'Vergleiche Agent Skills vor der Installation.', description: 'Vergleiche Qualität, Trust, Adoption und Installationsbereitschaft hochwertiger Skills an einem Ort.', platformComparison: 'Plattformvergleich', agentskillsDescription: 'Vergleiche dokumentationsorientiertes Browsing mit einer Agent-lesbaren Registry und Installations-API.', skillsShDescription: 'Vergleiche aufgabenorientierte Registry-Discovery mit CLI-zentrierter Skill-Verteilung.', popularSkills: 'Mit beliebten Skills starten', popularSkillsDescription: 'Wähle einen hochwertigen Skill mit Trust-, Audit- und Installationssignalen.', compareSkill: 'Skill vergleichen', quality: 'Qualität', trust: 'Trust', stars: 'Stars' },
    apiDocs: { eyebrow: 'API-Referenz', title: 'Agent-freundliche Daten für Discovery, Ranking und Installation.', description: 'Entdecke und prüfe Skills programmatisch mit JSON oder Klartext, optimiert für LLMs.', baseUrls: 'Basis-URLs', responseFormats: 'Antwortformate', endpointOverview: 'Kernendpunkte', agentResolve: 'Aufgabe auflösen', agentResolveDescription: 'Macht aus einer Aufgabe einen empfohlenen Skill, Alternativen, Risikohinweise und einen Installationsplan.', registry: 'Öffentliche Registry', registryDescription: 'Suche Skills, lade Manifeste oder erhalte eine prüfbare Installationsübergabe.', outcomes: 'Ergebnisse melden', outcomesDescription: 'Agents können Installations- und Ausführungsergebnisse melden, damit Empfehlungen aus echter Nutzung lernen.', jsonDescription: 'Strukturiertes JSON für Tool-Aufrufe und programmatische Verarbeitung.', textDescription: 'Kompakter Klartext für den LLM-Verbrauch.' },
  },
  fr: {
    tasks: { eyebrow: 'Tâches d’agent', title: 'Partez du travail que votre agent doit accomplir.', description: 'Chaque page transforme un vrai flux de travail en liste de skills classée, plan d’installation, notes de sécurité et appel Resolve.', agentEntry: 'Entrée agent', textApi: 'API texte', taskMetric: 'Tâches', indexedSkillsMetric: 'Skills indexés', installHandoffMetric: 'Relais d’installation', taskCardDescription: 'Ouvrez une tâche pour consulter les skills adaptées, le plan d’installation et les notes de revue humaine.', openTask: 'Ouvrir la tâche' },
    packs: { eyebrow: 'Packs de skills', title: 'Installez des packs complets pour de vrais flux d’agents.', description: 'Les packs regroupent des skills fiables par travail et montrent commandes, confiance et étapes nécessaires aux agents.', packsMetric: 'Packs', skillsMetric: 'Skills', stepsMetric: 'Étapes', picks: 'sélections', topScore: 'Meilleur score', topStars: 'Plus de stars', workflow: 'Flux', openPack: 'Ouvrir le pack', cards: packsByLocale.fr },
    compare: { eyebrow: 'Comparaison de skills', title: 'Comparez les skills d’agents avant installation.', description: 'Comparez qualité, confiance, adoption et préparation d’installation de skills fiables au même endroit.', platformComparison: 'Comparaison de plateformes', agentskillsDescription: 'Comparez la navigation axée documentation à une registry et une API d’installation lisibles par les agents.', skillsShDescription: 'Comparez la découverte axée tâche à la distribution de skills centrée sur le CLI.', popularSkills: 'Commencer avec les skills populaires', popularSkillsDescription: 'Choisissez un skill de qualité avec signaux de confiance, d’audit et d’installation.', compareSkill: 'Comparer le skill', quality: 'Qualité', trust: 'Confiance', stars: 'Stars' },
    apiDocs: { eyebrow: 'Référence API', title: 'Données de découverte, classement et installation pour agents.', description: 'Découvrez et examinez les skills par programmation avec JSON ou texte optimisé pour les LLM.', baseUrls: 'URLs de base', responseFormats: 'Formats de réponse', endpointOverview: 'Endpoints essentiels', agentResolve: 'Résoudre une tâche', agentResolveDescription: 'Transforme une tâche en skill recommandée, alternatives, informations de risque et plan d’installation.', registry: 'Registry publique', registryDescription: 'Recherchez des skills, récupérez un manifeste ou obtenez un relais d’installation vérifiable.', outcomes: 'Rapporter les résultats', outcomesDescription: 'Les agents peuvent rapporter installation et exécution pour que les recommandations apprennent des usages réels.', jsonDescription: 'JSON structuré pour les appels d’outils et le traitement programmatique.', textDescription: 'Texte concis optimisé pour la consommation par un LLM.' },
  },
  id: {
    tasks: { eyebrow: 'Tugas agent', title: 'Mulai dari pekerjaan yang perlu dilakukan agent Anda.', description: 'Setiap halaman tugas mengubah alur kerja nyata menjadi daftar skill berperingkat, rencana pemasangan, catatan keamanan, dan panggilan Resolve API.', agentEntry: 'Masuk agent', textApi: 'API teks', taskMetric: 'Tugas', indexedSkillsMetric: 'Skills terindeks', installHandoffMetric: 'Serah terima instalasi', taskCardDescription: 'Buka tugas untuk melihat skill yang sesuai, rencana pemasangan, dan catatan peninjauan manusia.', openTask: 'Buka tugas' },
    packs: { eyebrow: 'Skill Packs', title: 'Pasang pack lengkap untuk alur kerja agent nyata.', description: 'Pack mengelompokkan skill berkualitas berdasarkan pekerjaan serta menyediakan perintah pemasangan, trust score, dan langkah kerja bagi agent.', packsMetric: 'Packs', skillsMetric: 'Skills', stepsMetric: 'Langkah', picks: 'pilihan', topScore: 'Skor tertinggi', topStars: 'Stars tertinggi', workflow: 'Alur kerja', openPack: 'Buka pack', cards: packsByLocale.id },
    compare: { eyebrow: 'Perbandingan skill', title: 'Bandingkan skill agent sebelum memasang.', description: 'Bandingkan kualitas, trust, adopsi, dan kesiapan pemasangan skill berkualitas di satu tempat.', platformComparison: 'Perbandingan platform', agentskillsDescription: 'Bandingkan penelusuran berbasis dokumentasi dengan registry dan API pemasangan yang dapat dibaca agent.', skillsShDescription: 'Bandingkan discovery berbasis tugas dengan distribusi skill berpusat CLI.', popularSkills: 'Mulai dengan skill populer', popularSkillsDescription: 'Pilih skill berkualitas dengan sinyal trust, audit, dan pemasangan.', compareSkill: 'Bandingkan skill', quality: 'Kualitas', trust: 'Kepercayaan', stars: 'Stars' },
    apiDocs: { eyebrow: 'Referensi API', title: 'Data discovery, ranking, dan pemasangan yang ramah agent.', description: 'Temukan dan tinjau skill secara terprogram dengan JSON atau teks biasa yang dioptimalkan untuk LLM.', baseUrls: 'URL dasar', responseFormats: 'Format respons', endpointOverview: 'Endpoint inti', agentResolve: 'Selesaikan tugas', agentResolveDescription: 'Mengubah tugas menjadi skill rekomendasi, alternatif, informasi risiko, dan rencana pemasangan.', registry: 'Registry publik', registryDescription: 'Cari skill, ambil manifest, atau dapatkan serah terima pemasangan yang dapat ditinjau.', outcomes: 'Laporkan hasil', outcomesDescription: 'Agent dapat melaporkan hasil pemasangan dan eksekusi agar rekomendasi belajar dari penggunaan nyata.', jsonDescription: 'JSON terstruktur untuk pemanggilan tool dan pemrosesan programatis.', textDescription: 'Teks ringkas yang dioptimalkan untuk konsumsi LLM.' },
  },
}

export function getLocalizedNavigationContent(locale: MarketLocale) {
  return content[locale]
}

export function getLocalizedNavigationPageMeta(locale: MarketLocale, page: string): PageMeta | null {
  const pageContent = content[locale]
  if (page === 'tasks') return pageContent.tasks
  if (page === 'skill-packs') return pageContent.packs
  if (page === 'compare') return pageContent.compare
  if (page === 'api-docs') return pageContent.apiDocs
  return null
}

export function getLocalizedTaskTitle(locale: MarketLocale, slug: string, fallback: string) {
  return taskTitles[locale][slug] || fallback
}
