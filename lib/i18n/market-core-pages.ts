import type { LocalizedCorePageSlug, MarketLocale } from '@/lib/i18n/market-routing'

type PageMeta = {
  eyebrow: string
  title: string
  description: string
}

type Feature = {
  title: string
  copy: string
}

export type MarketCoreContent = {
  language: string
  labels: {
    trust: string
    stars: string
    audit: string
    install: string
    category: string
    openSkill: string
    viewAudit: string
    browseSkills: string
    viewDocs: string
    apiDocs: string
    repository: string
    noResults: string
    searchResults: string
    agentReady: string
    quality: string
    tryExample: string
    match: string
    safety: string
    englishDirectory: string
  }
  resolve: PageMeta & {
    taskLabel: string
    taskPlaceholder: string
    submit: string
    resolving: string
    emptyTitle: string
    emptyDescription: string
    resultLabel: string
    alternativesLabel: string
    whyLabel: string
    riskLabel: string
    copyInstall: string
    copiedInstall: string
    examples: string[]
    features: Feature[]
  }
  skills: PageMeta & {
    searchLabel: string
    searchPlaceholder: string
    search: string
    intro: string
  }
  agentSkill: PageMeta & {
    sections: Feature[]
  }
  registry: PageMeta & {
    metrics: Feature[]
    introTitle: string
    intro: string
  }
  docs: PageMeta & {
    sections: Feature[]
    installIntro: string
    apiIntro: string
  }
}

const zh: MarketCoreContent = {
  language: '中文',
  labels: {
    trust: '信任',
    stars: 'Stars',
    audit: '审计',
    install: '安装',
    category: '分类',
    openSkill: '打开技能',
    viewAudit: '查看审计',
    browseSkills: '浏览技能',
    viewDocs: '查看文档',
    apiDocs: 'API 文档',
    repository: '仓库',
    noResults: '没有找到匹配的技能。',
    searchResults: '搜索结果',
    agentReady: '适合 Agent 使用',
    quality: '质量',
    tryExample: '尝试示例',
    match: '匹配度',
    safety: '安全性',
    englishDirectory: '英文目录',
  },
  resolve: {
    eyebrow: 'Agent 技能解析',
    title: '描述任务，找到合适的技能。',
    description: 'OpenAgentSkill 会把 Agent 的工作转成一份包含安装命令、信任分、审计信息和风险提示的具体推荐。',
    taskLabel: '你的 Agent 需要完成什么？',
    taskPlaceholder: '分析最新股票新闻并总结市场风险',
    submit: '查找技能',
    resolving: '正在分析…',
    emptyTitle: '给你一个决策，而不只是链接列表。',
    emptyDescription: '描述目标后，你会得到推荐技能、备选项、安装路径和安全审查提示。',
    resultLabel: '推荐技能',
    alternativesLabel: '备选技能',
    whyLabel: '推荐原因',
    riskLabel: '风险提示',
    copyInstall: '复制安装命令',
    copiedInstall: '已复制',
    examples: ['分析最新股票新闻', '从 PDF 中提取报告表格', '从网页收集竞争对手价格'],
    features: [
      { title: '任务匹配', copy: '将任务场景、分类和仓库信号与 Agent 实际要完成的工作对应起来。' },
      { title: '可审查质量', copy: '在使用前展示信任、审计、维护状态和安装就绪程度。' },
      { title: '安全交接', copy: '返回具体安装命令，以及审查前需要完成的下一步。' },
    ],
  },
  skills: {
    eyebrow: '技能目录',
    title: '为 AI Agent 发现可复用技能。',
    description: '按任务搜索真实的 GitHub 技能，并在使用前查看 Stars、信任、审计、分类和安装路径。',
    searchLabel: '搜索技能',
    searchPlaceholder: '例如：PDF、股票分析或演示文稿',
    search: '搜索',
    intro: '每个推荐都保留与其仓库、审计和安装路径的明确关联。',
  },
  agentSkill: {
    eyebrow: '基础知识',
    title: '什么是 Agent Skill？',
    description: 'Agent Skill 是一段可复用的说明、工作流或资源包，用来让 AI Agent 稳定地获得一项具体能力。',
    sections: [
      { title: '围绕任务', copy: '好的技能不只描述一个主题，还能帮助 Agent 用清晰的输入、步骤和预期结果完成一项具体工作。' },
      { title: '安装前可审查', copy: 'OpenAgentSkill 补充信任、审计、维护和风险信号，避免 Agent 和团队盲目安装。' },
      { title: '同时服务人和 Agent', copy: '人可以比较和审查；Agent 可以从 Registry API 使用同样的信号，生成安全的交接方案。' },
    ],
  },
  registry: {
    eyebrow: 'Agent 技能注册表',
    title: 'AI Agent 的技能层。',
    description: '一个开放注册表和推荐 API，让 Agent 发现、比较、审查并安装可复用技能。',
    introTitle: '从任务到可安装的候选列表。',
    intro: 'Agent 不必翻阅无结构的仓库列表，而是获得按任务匹配、信任、审计、风险和安装路径排序的候选项。',
    metrics: [
      { title: '发现', copy: '基于真实技能和 GitHub 元数据的任务导向搜索。' },
      { title: '审查', copy: '在执行前查看信任、审计、维护、许可证和安装就绪程度。' },
      { title: '安装', copy: '为 Codex、Claude Code 和 Cursor 提供 CLI 命令和 Agent 交接。' },
    ],
  },
  docs: {
    eyebrow: '文档',
    title: '使用 OpenAgentSkill 注册表。',
    description: '了解如何发现、安装和审查技能，并通过 Agent 友好的 API 接入工作流。',
    installIntro: '安装命令保持原样，确保可以直接对接原始仓库。',
    apiIntro: 'API 以机器可读格式返回任务匹配、信任、审计、风险和安装指引。',
    sections: [
      { title: '发现技能', copy: '用于人工审查时可浏览目录；当 Agent 需要从任务得到具体推荐时，可使用解析器。' },
      { title: '安装前审查', copy: '阅读审计和信任分，确认许可证，并优先在沙箱中测试高风险技能。' },
      { title: '回传结果', copy: '完成一次范围明确的运行后回传结果，让后续推荐从真实使用中学习。' },
    ],
  },
}

const ja: MarketCoreContent = {
  language: '日本語',
  labels: {
    trust: '信頼',
    stars: 'Stars',
    audit: '監査',
    install: 'インストール',
    category: 'カテゴリ',
    openSkill: 'Skill を開く',
    viewAudit: '監査を見る',
    browseSkills: 'Skills を見る',
    viewDocs: 'ドキュメントを見る',
    apiDocs: 'API ドキュメント',
    repository: 'リポジトリ',
    noResults: '一致する Skill が見つかりません。',
    searchResults: '検索結果',
    agentReady: 'Agent 対応',
    quality: '品質',
    tryExample: '例を試す',
    match: '適合度',
    safety: '安全性',
    englishDirectory: '英語版ディレクトリ',
  },
  resolve: {
    eyebrow: 'Agent Skill Resolver',
    title: 'タスクを説明して、適切な Skill を見つける。',
    description: 'OpenAgentSkill は Agent の仕事を、インストールコマンド、Trust Score、監査、リスクメモを含む具体的な推奨に変換します。',
    taskLabel: 'Agent に何をさせますか？',
    taskPlaceholder: '最新の株式ニュースを分析して市場リスクを要約する',
    submit: 'Skill を探す',
    resolving: '分析中…',
    emptyTitle: 'リンク集ではなく、ひとつの判断を。',
    emptyDescription: '目的を説明すると、おすすめの Skill、代替案、インストール経路、安全なレビュー手順が得られます。',
    resultLabel: 'おすすめの Skill',
    alternativesLabel: '代替 Skill',
    whyLabel: 'おすすめの理由',
    riskLabel: 'リスクメモ',
    copyInstall: 'インストールコマンドをコピー',
    copiedInstall: 'コピーしました',
    examples: ['最新の株式ニュースを分析する', 'PDF の表をレポート用に抽出する', 'Web から競合の価格を集める'],
    features: [
      { title: 'タスク適合', copy: 'シナリオ、カテゴリ、リポジトリのシグナルを、Agent が実際に行う作業に結び付けます。' },
      { title: '確認できる品質', copy: '利用前に Trust、監査、保守状況、インストール準備状況を表示します。' },
      { title: '安全な引き渡し', copy: '具体的なインストールコマンドと、レビューの次の手順を返します。' },
    ],
  },
  skills: {
    eyebrow: 'Skill ディレクトリ',
    title: 'AI Agent のための再利用可能な Skill を見つける。',
    description: 'タスクで実際の GitHub Skill を検索し、利用前に Stars、Trust、監査、カテゴリ、インストール経路を確認できます。',
    searchLabel: 'Skills を検索',
    searchPlaceholder: '例：PDF、株式分析、プレゼンテーション',
    search: '検索',
    intro: 'すべての推奨は、リポジトリ、監査、インストール経路に明確につながっています。',
  },
  agentSkill: {
    eyebrow: '基本',
    title: 'Agent Skill とは？',
    description: 'Agent Skill は、AI Agent に具体的な能力を確実に与える再利用可能な指示、ワークフロー、またはリソースパッケージです。',
    sections: [
      { title: 'タスク中心', copy: '良い Skill はテーマを説明するだけではありません。明確な入力、手順、期待結果で Agent が特定の仕事を完了できるようにします。' },
      { title: 'インストール前に確認', copy: 'OpenAgentSkill は Trust、監査、保守、リスクのシグナルを加え、Agent とチームが盲目的にインストールしないようにします。' },
      { title: '人と Agent のために', copy: '人は比較と確認を行えます。Agent は Registry API から同じシグナルを読み、安全な引き渡しを生成できます。' },
    ],
  },
  registry: {
    eyebrow: 'Agent Skill Registry',
    title: 'AI Agent の Skill Layer。',
    description: 'Agent が再利用可能な Skill を発見、比較、確認、インストールするためのオープンな Registry と推奨 API です。',
    introTitle: 'タスクから、インストール可能な候補へ。',
    intro: '構造のないリポジトリ一覧を探す代わりに、Agent はタスク適合、Trust、監査、リスク、インストール経路で並んだ候補を受け取ります。',
    metrics: [
      { title: '発見', copy: '実際の Skill と GitHub メタデータを対象にしたタスク中心の検索。' },
      { title: '確認', copy: '実行前に Trust、監査、保守、ライセンス、インストール準備状況を確認。' },
      { title: 'インストール', copy: 'Codex、Claude Code、Cursor 向けの CLI コマンドと Agent 引き渡し。' },
    ],
  },
  docs: {
    eyebrow: 'ドキュメント',
    title: 'OpenAgentSkill Registry を使う。',
    description: 'Skill の発見、インストール、レビュー、および Agent 対応 API でのワークフロー接続方法を学びます。',
    installIntro: 'インストールコマンドは元のリポジトリでそのまま動くよう、翻訳しません。',
    apiIntro: 'API はタスク適合、Trust、監査、リスク、インストール指示を機械可読な形式で返します。',
    sections: [
      { title: 'Skill を発見する', copy: '人が確認する場合はディレクトリを使い、Agent がタスクから具体的な推奨に進む場合は Resolver を使います。' },
      { title: 'インストール前に確認する', copy: '監査と Trust Score を読み、ライセンスを確認し、リスクの高い Skill はまずサンドボックスで試してください。' },
      { title: '結果を報告する', copy: '範囲を絞った実行後に結果を報告すると、将来の推奨が実際の利用から学べます。' },
    ],
  },
}

const ko: MarketCoreContent = {
  language: '한국어',
  labels: {
    trust: '신뢰',
    stars: 'Stars',
    audit: '감사',
    install: '설치',
    category: '카테고리',
    openSkill: 'Skill 열기',
    viewAudit: '감사 보기',
    browseSkills: 'Skills 둘러보기',
    viewDocs: '문서 보기',
    apiDocs: 'API 문서',
    repository: '리포지토리',
    noResults: '일치하는 Skill을 찾지 못했습니다.',
    searchResults: '검색 결과',
    agentReady: 'Agent 준비 완료',
    quality: '품질',
    tryExample: '예시 사용',
    match: '적합도',
    safety: '안전성',
    englishDirectory: '영문 디렉토리',
  },
  resolve: {
    eyebrow: 'Agent Skill Resolver',
    title: '작업을 설명하고 알맞은 Skill을 찾으세요.',
    description: 'OpenAgentSkill은 Agent의 작업을 설치 명령, Trust Score, 감사 정보, 위험 메모가 포함된 구체적인 추천으로 바꿉니다.',
    taskLabel: 'Agent가 무엇을 해야 하나요?',
    taskPlaceholder: '최근 주식 뉴스를 분석하고 시장 위험을 요약하세요',
    submit: 'Skill 찾기',
    resolving: '분석 중…',
    emptyTitle: '링크 목록이 아니라 하나의 결정을 제공합니다.',
    emptyDescription: '목표를 설명하면 추천 Skill, 대안, 설치 경로, 안전한 검토 단계가 제공됩니다.',
    resultLabel: '추천 Skill',
    alternativesLabel: '대안 Skill',
    whyLabel: '추천 이유',
    riskLabel: '위험 메모',
    copyInstall: '설치 명령 복사',
    copiedInstall: '복사됨',
    examples: ['최근 주식 뉴스 분석', '보고서용 PDF 표 추출', '웹에서 경쟁사 가격 수집'],
    features: [
      { title: '작업 적합도', copy: '시나리오, 카테고리, 리포지토리 신호를 Agent가 실제로 해야 할 작업과 연결합니다.' },
      { title: '검토 가능한 품질', copy: '사용 전에 신뢰, 감사, 유지보수, 설치 준비 상태를 보여줍니다.' },
      { title: '안전한 인계', copy: '구체적인 설치 명령과 검토를 위한 다음 단계를 제공합니다.' },
    ],
  },
  skills: {
    eyebrow: 'Skill 디렉토리',
    title: 'AI Agent를 위한 재사용 가능한 Skill을 찾으세요.',
    description: '작업으로 실제 GitHub Skill을 검색하고 사용 전에 Stars, 신뢰, 감사, 카테고리, 설치 경로를 확인하세요.',
    searchLabel: 'Skills 검색',
    searchPlaceholder: '예: PDF, 주식 분석 또는 프레젠테이션',
    search: '검색',
    intro: '모든 추천은 리포지토리, 감사, 설치 경로와 명확하게 연결됩니다.',
  },
  agentSkill: {
    eyebrow: '기본',
    title: 'Agent Skill이란 무엇인가요?',
    description: 'Agent Skill은 AI Agent에게 구체적인 능력을 안정적으로 제공하는 재사용 가능한 지침, 워크플로 또는 리소스 패키지입니다.',
    sections: [
      { title: '작업 중심', copy: '좋은 Skill은 주제를 설명하는 데 그치지 않고, 명확한 입력, 단계, 기대 결과로 Agent가 특정 작업을 끝낼 수 있게 합니다.' },
      { title: '설치 전 검토', copy: 'OpenAgentSkill은 신뢰, 감사, 유지보수, 위험 신호를 더해 Agent와 팀이 무작정 설치하지 않도록 돕습니다.' },
      { title: '사람과 Agent 모두를 위해', copy: '사람은 비교하고 검토할 수 있으며, Agent는 Registry API에서 같은 신호를 읽어 안전한 인계를 만들 수 있습니다.' },
    ],
  },
  registry: {
    eyebrow: 'Agent Skill Registry',
    title: 'AI Agent를 위한 Skill Layer.',
    description: 'Agent가 재사용 가능한 Skill을 찾고, 비교하고, 검토하고, 설치할 수 있게 하는 개방형 Registry와 추천 API입니다.',
    introTitle: '작업에서 설치 가능한 후보까지.',
    intro: '구조화되지 않은 리포지토리 목록을 훑는 대신, Agent는 작업 적합도, 신뢰, 감사, 위험, 설치 경로로 정렬된 후보를 받습니다.',
    metrics: [
      { title: '발견', copy: '실제 Skill과 GitHub 메타데이터를 대상으로 하는 작업 중심 검색.' },
      { title: '검토', copy: '실행 전에 신뢰, 감사, 유지보수, 라이선스, 설치 준비 상태를 확인.' },
      { title: '설치', copy: 'Codex, Claude Code, Cursor용 CLI 명령과 Agent 인계 제공.' },
    ],
  },
  docs: {
    eyebrow: '문서',
    title: 'OpenAgentSkill Registry 사용하기.',
    description: 'Skill을 찾고, 설치하고, 검토하는 방법과 Agent 친화적 API를 워크플로에 연결하는 방법을 알아보세요.',
    installIntro: '설치 명령은 원본 리포지토리에서 바로 작동하도록 번역하지 않습니다.',
    apiIntro: 'API는 작업 적합도, 신뢰, 감사, 위험, 설치 지침을 기계가 읽을 수 있는 형식으로 반환합니다.',
    sections: [
      { title: 'Skill 찾기', copy: '사람이 검토할 때는 디렉토리를 사용하고, Agent가 작업에서 구체적 추천으로 이동할 때는 Resolver를 사용하세요.' },
      { title: '설치 전 검토', copy: '감사와 Trust Score를 읽고 라이선스를 확인한 다음 위험한 Skill은 먼저 샌드박스에서 테스트하세요.' },
      { title: '결과 보고', copy: '범위를 제한한 실행 후 결과를 보고하면 이후 추천이 실제 사용에서 학습합니다.' },
    ],
  },
}

const fr: MarketCoreContent = {
  language: 'Français',
  labels: {
    trust: 'Confiance',
    stars: 'Stars',
    audit: 'Audit',
    install: 'Installer',
    category: 'Catégorie',
    openSkill: 'Ouvrir le skill',
    viewAudit: 'Voir l’audit',
    browseSkills: 'Explorer les skills',
    viewDocs: 'Voir la documentation',
    apiDocs: 'Documentation API',
    repository: 'Dépôt',
    noResults: 'Aucun skill correspondant.',
    searchResults: 'Résultats de recherche',
    agentReady: 'Prêt pour les agents',
    quality: 'Qualité',
    tryExample: 'Essayer un exemple',
    match: 'Correspondance',
    safety: 'Sécurité',
    englishDirectory: 'Annuaire en anglais',
  },
  resolve: {
    eyebrow: 'Résolveur de skills pour agents',
    title: 'Décrivez la tâche. Trouvez le bon skill.',
    description: 'OpenAgentSkill transforme le travail de votre agent en recommandation concrète avec commande d’installation, Trust Score, audit et notes de risque.',
    taskLabel: 'Que doit faire votre agent ?',
    taskPlaceholder: 'Analyser les dernières actualités boursières et résumer les risques du marché',
    submit: 'Trouver un skill',
    resolving: 'Analyse en cours…',
    emptyTitle: 'Une décision, pas une simple liste de liens.',
    emptyDescription: 'Décrivez l’objectif pour obtenir un skill recommandé, des alternatives, un chemin d’installation et des étapes de vérification sûres.',
    resultLabel: 'Skill recommandé',
    alternativesLabel: 'Skills alternatifs',
    whyLabel: 'Pourquoi ce skill',
    riskLabel: 'Notes de risque',
    copyInstall: 'Copier la commande d’installation',
    copiedInstall: 'Copié',
    examples: ['Analyser les dernières actualités boursières', 'Extraire des tableaux PDF pour un rapport', 'Collecter les prix des concurrents sur le web'],
    features: [
      { title: 'Adéquation à la tâche', copy: 'Relie le scénario, la catégorie et les signaux du dépôt au travail réel de l’agent.' },
      { title: 'Qualité vérifiable', copy: 'Affiche confiance, audit, maintenance et préparation à l’installation avant l’utilisation.' },
      { title: 'Passage de relais sûr', copy: 'Renvoie une commande d’installation concrète et les étapes suivantes de vérification.' },
    ],
  },
  skills: {
    eyebrow: 'Annuaire de skills',
    title: 'Découvrez des skills réutilisables pour les AI agents.',
    description: 'Recherchez de vrais skills GitHub par tâche et vérifiez Stars, confiance, audit, catégorie et chemin d’installation avant de les utiliser.',
    searchLabel: 'Rechercher des skills',
    searchPlaceholder: 'Par exemple : PDF, analyse boursière ou présentation',
    search: 'Rechercher',
    intro: 'Chaque recommandation reste clairement reliée à son dépôt, son audit et son chemin d’installation.',
  },
  agentSkill: {
    eyebrow: 'Principes',
    title: 'Qu’est-ce qu’un agent skill ?',
    description: 'Un agent skill est une instruction, un workflow ou un paquet de ressources réutilisable qui donne de façon fiable une capacité précise à un AI agent.',
    sections: [
      { title: 'Orienté tâche', copy: 'Un bon skill ne décrit pas seulement un sujet. Il aide un agent à accomplir un travail précis avec des entrées, étapes et résultats attendus clairs.' },
      { title: 'Vérifiable avant installation', copy: 'OpenAgentSkill ajoute des signaux de confiance, audit, maintenance et risque pour éviter aux agents et aux équipes toute installation aveugle.' },
      { title: 'Pour les humains et les agents', copy: 'Les humains peuvent comparer et vérifier. Les agents peuvent lire les mêmes signaux via la Registry API et générer un passage de relais sûr.' },
    ],
  },
  registry: {
    eyebrow: 'Registry de skills pour agents',
    title: 'La couche de skills pour les AI agents.',
    description: 'Une Registry ouverte et une API de recommandation pour permettre aux agents de découvrir, comparer, vérifier et installer des skills réutilisables.',
    introTitle: 'D’une tâche à une sélection installable.',
    intro: 'Au lieu de parcourir une liste de dépôts non structurée, un agent reçoit des candidats triés par adéquation, confiance, audit, risque et chemin d’installation.',
    metrics: [
      { title: 'Découvrir', copy: 'Recherche orientée tâche sur de vrais skills et des métadonnées GitHub.' },
      { title: 'Vérifier', copy: 'Confiance, audit, maintenance, licence et disponibilité avant exécution.' },
      { title: 'Installer', copy: 'Commande CLI et passage de relais pour Codex, Claude Code et Cursor.' },
    ],
  },
  docs: {
    eyebrow: 'Documentation',
    title: 'Utiliser la Registry OpenAgentSkill.',
    description: 'Découvrez comment trouver, installer et vérifier des skills, puis les connecter à des workflows avec des API pensées pour les agents.',
    installIntro: 'Les commandes d’installation restent inchangées afin de fonctionner directement avec le dépôt d’origine.',
    apiIntro: 'L’API renvoie l’adéquation à la tâche, la confiance, l’audit, le risque et les consignes d’installation dans un format lisible par machine.',
    sections: [
      { title: 'Découvrir des skills', copy: 'Utilisez l’annuaire pour une vérification humaine ou le résolveur lorsqu’un agent doit passer d’une tâche à une recommandation précise.' },
      { title: 'Vérifier avant installation', copy: 'Lisez l’audit et le Trust Score, vérifiez la licence et testez d’abord les skills à risque dans un sandbox.' },
      { title: 'Rapporter les résultats', copy: 'Après une exécution limitée, rapportez le résultat pour que les recommandations futures apprennent de l’usage réel.' },
    ],
  },
}

const de: MarketCoreContent = {
  language: 'Deutsch',
  labels: {
    trust: 'Trust',
    stars: 'Stars',
    audit: 'Audit',
    install: 'Installieren',
    category: 'Kategorie',
    openSkill: 'Skill öffnen',
    viewAudit: 'Audit ansehen',
    browseSkills: 'Skills durchsuchen',
    viewDocs: 'Dokumentation ansehen',
    apiDocs: 'API-Dokumentation',
    repository: 'Repository',
    noResults: 'Keine passenden Skills gefunden.',
    searchResults: 'Suchergebnisse',
    agentReady: 'Agent-ready',
    quality: 'Qualität',
    tryExample: 'Beispiel ausprobieren',
    match: 'Passung',
    safety: 'Sicherheit',
    englishDirectory: 'Englisches Verzeichnis',
  },
  resolve: {
    eyebrow: 'Agent-Skill-Resolver',
    title: 'Beschreibe die Aufgabe. Finde den passenden Skill.',
    description: 'OpenAgentSkill übersetzt Arbeit für deinen Agent in eine konkrete Empfehlung mit Installationsbefehl, Trust Score, Audit und Risikohinweisen.',
    taskLabel: 'Was soll dein Agent erledigen?',
    taskPlaceholder: 'Aktuelle Aktiennachrichten analysieren und Marktrisiken zusammenfassen',
    submit: 'Skill finden',
    resolving: 'Wird geprüft…',
    emptyTitle: 'Eine Entscheidung statt einer Linkliste.',
    emptyDescription: 'Beschreibe das Ziel. Du erhältst einen empfohlenen Skill, Alternativen, einen Installationspfad und Hinweise zur sicheren Prüfung.',
    resultLabel: 'Empfohlener Skill',
    alternativesLabel: 'Alternativen',
    whyLabel: 'Warum dieser Skill',
    riskLabel: 'Risikohinweise',
    copyInstall: 'Installationsbefehl kopieren',
    copiedInstall: 'Kopiert',
    examples: [
      'Aktuelle Aktiennachrichten analysieren',
      'PDF-Tabellen für einen Bericht extrahieren',
      'Preise von Wettbewerbern aus dem Web sammeln',
    ],
    features: [
      { title: 'Aufgabenbezug', copy: 'Ordnet Szenario, Kategorie und Repository-Signale der tatsächlichen Aufgabe zu.' },
      { title: 'Prüfbare Qualität', copy: 'Zeigt Trust, Audit, Wartung und Installationsbereitschaft vor der Nutzung.' },
      { title: 'Sicherer Übergabepunkt', copy: 'Gibt einen konkreten Installationsbefehl und klare nächste Schritte zurück.' },
    ],
  },
  skills: {
    eyebrow: 'Skill-Verzeichnis',
    title: 'Wiederverwendbare Skills für AI Agents entdecken.',
    description: 'Durchsuche reale GitHub-Skills nach Aufgabe und prüfe Stars, Trust, Audit, Kategorie und Installationspfad vor der Verwendung.',
    searchLabel: 'Skills durchsuchen',
    searchPlaceholder: 'Zum Beispiel: PDF, Aktienanalyse oder Präsentation',
    search: 'Suchen',
    intro: 'Jede Empfehlung bleibt mit ihrem Repository, Audit und Installationspfad nachvollziehbar.',
  },
  agentSkill: {
    eyebrow: 'Grundlagen',
    title: 'Was ist ein Agent Skill?',
    description: 'Ein Agent Skill ist eine wiederverwendbare Anleitung, ein Workflow oder ein Ressourcenpaket, das einem AI Agent eine konkrete Fähigkeit verlässlich vermittelt.',
    sections: [
      { title: 'Aufgabenbezogen', copy: 'Ein guter Skill beschreibt nicht nur ein Thema. Er hilft einem Agent, eine bestimmte Aufgabe mit klaren Eingaben, Schritten und erwarteten Ergebnissen zu erledigen.' },
      { title: 'Prüfbar vor der Installation', copy: 'OpenAgentSkill ergänzt das Repository um Trust-, Audit-, Wartungs- und Risikosignale, damit Agents und Teams nicht blind installieren.' },
      { title: 'Für Menschen und Agents', copy: 'Menschen können vergleichen und prüfen. Agents können dieselben Signale über die Registry API abrufen und eine sichere Übergabe erzeugen.' },
    ],
  },
  registry: {
    eyebrow: 'Agent Skill Registry',
    title: 'Die Skill-Schicht für AI Agents.',
    description: 'Eine offene Registry und Empfehlungs-API, mit der Agents wiederverwendbare Skills finden, vergleichen, prüfen und installieren können.',
    introTitle: 'Von einer Aufgabe zu einer installierbaren Auswahl.',
    intro: 'Statt eine unstrukturierte Liste von Repositories zu durchsuchen, erhält ein Agent eine geordnete Auswahl mit Aufgabenbezug, Trust, Audit, Risiko und Installationspfad.',
    metrics: [
      { title: 'Entdecken', copy: 'Aufgabenorientierte Suche über echte Skills und GitHub-Metadaten.' },
      { title: 'Prüfen', copy: 'Trust, Audit, Wartung, Lizenz und Installationsbereitschaft vor der Ausführung.' },
      { title: 'Installieren', copy: 'CLI-Befehl und agent-taugliche Übergabe für Codex, Claude Code und Cursor.' },
    ],
  },
  docs: {
    eyebrow: 'Dokumentation',
    title: 'Mit der OpenAgentSkill Registry arbeiten.',
    description: 'Erfahre, wie du Skills findest, installierst, prüfst und über die agent-freundlichen APIs in Workflows einbindest.',
    installIntro: 'Installationsbefehle bleiben bewusst unverändert, damit sie direkt mit dem Original-Repository funktionieren.',
    apiIntro: 'Die API liefert Aufgabenbezug, Trust, Audit, Risiken und Installationshinweise in einem maschinenlesbaren Format.',
    sections: [
      { title: 'Skills entdecken', copy: 'Nutze das Verzeichnis für eine menschliche Prüfung oder den Resolver, wenn dein Agent von einer Aufgabe zu einer passenden Empfehlung gelangen soll.' },
      { title: 'Vorher prüfen', copy: 'Lies Audit und Trust Score, prüfe die Lizenz und teste risikoreiche Skills zuerst in einer Sandbox.' },
      { title: 'Ergebnisse zurückmelden', copy: 'Nach einer klar abgegrenzten Ausführung kann ein Outcome gemeldet werden, damit spätere Empfehlungen aus realen Ergebnissen lernen.' },
    ],
  },
}

const es: MarketCoreContent = {
  language: 'Español',
  labels: {
    trust: 'Confianza',
    stars: 'Stars',
    audit: 'Auditoría',
    install: 'Instalar',
    category: 'Categoría',
    openSkill: 'Abrir skill',
    viewAudit: 'Ver auditoría',
    browseSkills: 'Explorar skills',
    viewDocs: 'Ver documentación',
    apiDocs: 'Documentación de API',
    repository: 'Repositorio',
    noResults: 'No se encontraron skills coincidentes.',
    searchResults: 'Resultados de búsqueda',
    agentReady: 'Listo para agents',
    quality: 'Calidad',
    tryExample: 'Probar un ejemplo',
    match: 'Ajuste',
    safety: 'Seguridad',
    englishDirectory: 'Directorio en inglés',
  },
  resolve: {
    eyebrow: 'Resolver de agent skills',
    title: 'Describe la tarea. Encuentra el skill correcto.',
    description: 'OpenAgentSkill convierte el trabajo de tu agent en una recomendación concreta con comando de instalación, Trust Score, auditoría y notas de riesgo.',
    taskLabel: '¿Qué debe hacer tu agent?',
    taskPlaceholder: 'Analizar noticias bursátiles recientes y resumir los riesgos del mercado',
    submit: 'Buscar skill',
    resolving: 'Analizando…',
    emptyTitle: 'Una decisión, no solo una lista de enlaces.',
    emptyDescription: 'Describe el objetivo y recibe un skill recomendado, alternativas, una ruta de instalación y pasos de revisión segura.',
    resultLabel: 'Skill recomendado',
    alternativesLabel: 'Alternativas',
    whyLabel: 'Por qué este skill',
    riskLabel: 'Notas de riesgo',
    copyInstall: 'Copiar comando de instalación',
    copiedInstall: 'Copiado',
    examples: [
      'Analizar noticias bursátiles recientes',
      'Extraer tablas de PDF para un informe',
      'Recopilar precios de competidores desde la web',
    ],
    features: [
      { title: 'Ajuste a la tarea', copy: 'Relaciona el escenario, la categoría y las señales del repositorio con el trabajo real que debe hacer el agent.' },
      { title: 'Calidad verificable', copy: 'Muestra confianza, auditoría, mantenimiento y preparación de instalación antes de usar un skill.' },
      { title: 'Entrega segura', copy: 'Devuelve un comando de instalación concreto y los siguientes pasos para revisarlo.' },
    ],
  },
  skills: {
    eyebrow: 'Directorio de skills',
    title: 'Descubre skills reutilizables para AI agents.',
    description: 'Busca skills reales de GitHub por tarea y revisa stars, confianza, auditoría, categoría y ruta de instalación antes de utilizarlos.',
    searchLabel: 'Buscar skills',
    searchPlaceholder: 'Por ejemplo: PDF, análisis bursátil o presentación',
    search: 'Buscar',
    intro: 'Cada recomendación conserva un vínculo claro con su repositorio, auditoría y ruta de instalación.',
  },
  agentSkill: {
    eyebrow: 'Fundamentos',
    title: '¿Qué es un agent skill?',
    description: 'Un agent skill es una instrucción reutilizable, un flujo de trabajo o un paquete de recursos que enseña a un AI agent una capacidad concreta.',
    sections: [
      { title: 'Orientado a una tarea', copy: 'Un buen skill no solo describe un tema. Ayuda a un agent a completar un trabajo específico con entradas, pasos y resultados claros.' },
      { title: 'Revisable antes de instalar', copy: 'OpenAgentSkill añade señales de confianza, auditoría, mantenimiento y riesgo para que los equipos no instalen código a ciegas.' },
      { title: 'Para personas y agents', copy: 'Las personas pueden comparar y revisar. Los agents pueden consumir las mismas señales por la Registry API y producir una entrega segura.' },
    ],
  },
  registry: {
    eyebrow: 'Registry de agent skills',
    title: 'La capa de skills para AI agents.',
    description: 'Una registry abierta y una API de recomendación para que los agents descubran, comparen, revisen e instalen skills reutilizables.',
    introTitle: 'De una tarea a una lista instalable.',
    intro: 'En lugar de recorrer repositorios sin estructura, un agent recibe candidatos ordenados por ajuste a la tarea, confianza, auditoría, riesgo y ruta de instalación.',
    metrics: [
      { title: 'Descubrir', copy: 'Búsqueda orientada a tareas sobre skills reales y metadatos de GitHub.' },
      { title: 'Revisar', copy: 'Confianza, auditoría, mantenimiento, licencia y preparación antes de ejecutar.' },
      { title: 'Instalar', copy: 'Comando CLI y entrega lista para Codex, Claude Code y Cursor.' },
    ],
  },
  docs: {
    eyebrow: 'Documentación',
    title: 'Trabaja con la Registry de OpenAgentSkill.',
    description: 'Aprende a descubrir, instalar y revisar skills, y a conectarlos a flujos de trabajo mediante APIs para agents.',
    installIntro: 'Los comandos de instalación no se traducen para que sigan funcionando con el repositorio original.',
    apiIntro: 'La API devuelve ajuste a la tarea, confianza, auditoría, riesgo e instrucciones de instalación en un formato legible por máquinas.',
    sections: [
      { title: 'Descubrir skills', copy: 'Usa el directorio para revisión humana o el resolver cuando tu agent necesite pasar de una tarea a una recomendación concreta.' },
      { title: 'Revisar antes de instalar', copy: 'Lee la auditoría y el Trust Score, verifica la licencia y prueba primero los skills de mayor riesgo en una sandbox.' },
      { title: 'Reportar resultados', copy: 'Después de una ejecución acotada, informa el resultado para que las recomendaciones futuras aprendan de uso real.' },
    ],
  },
}

const id: MarketCoreContent = {
  language: 'Bahasa Indonesia',
  labels: {
    trust: 'Kepercayaan',
    stars: 'Stars',
    audit: 'Audit',
    install: 'Pasang',
    category: 'Kategori',
    openSkill: 'Buka skill',
    viewAudit: 'Lihat audit',
    browseSkills: 'Jelajahi skill',
    viewDocs: 'Lihat dokumentasi',
    apiDocs: 'Dokumentasi API',
    repository: 'Repositori',
    noResults: 'Tidak ada skill yang cocok.',
    searchResults: 'Hasil pencarian',
    agentReady: 'Siap untuk agent',
    quality: 'Kualitas',
    tryExample: 'Coba contoh',
    match: 'Kecocokan',
    safety: 'Keamanan',
    englishDirectory: 'Direktori bahasa Inggris',
  },
  resolve: {
    eyebrow: 'Pencari agent skill',
    title: 'Jelaskan tugasnya. Temukan skill yang tepat.',
    description: 'OpenAgentSkill mengubah pekerjaan agent menjadi rekomendasi konkret dengan perintah pemasangan, Trust Score, audit, dan catatan risiko.',
    taskLabel: 'Apa yang harus dilakukan agent Anda?',
    taskPlaceholder: 'Analisis berita saham terbaru dan rangkum risiko pasar',
    submit: 'Cari skill',
    resolving: 'Menganalisis…',
    emptyTitle: 'Sebuah keputusan, bukan sekadar daftar tautan.',
    emptyDescription: 'Jelaskan tujuan Anda untuk mendapatkan skill yang direkomendasikan, alternatif, jalur pemasangan, dan langkah peninjauan aman.',
    resultLabel: 'Skill yang direkomendasikan',
    alternativesLabel: 'Alternatif',
    whyLabel: 'Mengapa skill ini',
    riskLabel: 'Catatan risiko',
    copyInstall: 'Salin perintah pemasangan',
    copiedInstall: 'Tersalin',
    examples: [
      'Analisis berita saham terbaru',
      'Ekstrak tabel PDF untuk laporan',
      'Kumpulkan harga kompetitor dari web',
    ],
    features: [
      { title: 'Sesuai tugas', copy: 'Mencocokkan skenario, kategori, dan sinyal repositori dengan pekerjaan nyata yang perlu dilakukan agent.' },
      { title: 'Kualitas yang dapat ditinjau', copy: 'Menampilkan trust, audit, pemeliharaan, dan kesiapan pemasangan sebelum sebuah skill digunakan.' },
      { title: 'Serah terima aman', copy: 'Mengembalikan perintah pemasangan yang jelas dan langkah berikutnya untuk proses peninjauan.' },
    ],
  },
  skills: {
    eyebrow: 'Direktori skill',
    title: 'Temukan skill yang dapat digunakan kembali untuk AI agents.',
    description: 'Cari skill GitHub nyata berdasarkan tugas lalu periksa stars, trust, audit, kategori, dan jalur pemasangan sebelum digunakan.',
    searchLabel: 'Cari skill',
    searchPlaceholder: 'Contoh: PDF, analisis saham, atau presentasi',
    search: 'Cari',
    intro: 'Setiap rekomendasi tetap terhubung dengan repositori, audit, dan jalur pemasangannya.',
  },
  agentSkill: {
    eyebrow: 'Dasar-dasar',
    title: 'Apa itu agent skill?',
    description: 'Agent skill adalah instruksi, alur kerja, atau paket sumber daya yang dapat digunakan kembali untuk memberi AI agent kemampuan yang spesifik dan dapat diandalkan.',
    sections: [
      { title: 'Berorientasi pada tugas', copy: 'Skill yang baik bukan hanya menjelaskan topik. Ia membantu agent menyelesaikan pekerjaan tertentu dengan masukan, langkah, dan hasil yang jelas.' },
      { title: 'Dapat diperiksa sebelum dipasang', copy: 'OpenAgentSkill menambahkan sinyal trust, audit, pemeliharaan, dan risiko agar agent dan tim tidak memasang sesuatu secara membabi buta.' },
      { title: 'Untuk manusia dan agents', copy: 'Manusia dapat membandingkan dan meninjau. Agents dapat memakai sinyal yang sama melalui Registry API dan menghasilkan serah terima yang aman.' },
    ],
  },
  registry: {
    eyebrow: 'Registry agent skill',
    title: 'Lapisan skill untuk AI agents.',
    description: 'Registry terbuka dan API rekomendasi agar agents dapat menemukan, membandingkan, meninjau, dan memasang skill yang dapat digunakan kembali.',
    introTitle: 'Dari tugas menjadi daftar yang siap dipasang.',
    intro: 'Daripada menelusuri repositori tanpa struktur, agent menerima kandidat yang diperingkat berdasarkan kesesuaian tugas, trust, audit, risiko, dan jalur pemasangan.',
    metrics: [
      { title: 'Temukan', copy: 'Pencarian berbasis tugas pada skill nyata dan metadata GitHub.' },
      { title: 'Tinjau', copy: 'Trust, audit, pemeliharaan, lisensi, dan kesiapan pemasangan sebelum eksekusi.' },
      { title: 'Pasang', copy: 'Perintah CLI dan serah terima siap pakai untuk Codex, Claude Code, dan Cursor.' },
    ],
  },
  docs: {
    eyebrow: 'Dokumentasi',
    title: 'Bekerja dengan Registry OpenAgentSkill.',
    description: 'Pelajari cara menemukan, memasang, dan meninjau skill, serta menghubungkannya ke alur kerja melalui API yang ramah agent.',
    installIntro: 'Perintah pemasangan tidak diterjemahkan agar tetap bekerja dengan repositori asli.',
    apiIntro: 'API memberikan kesesuaian tugas, trust, audit, risiko, dan panduan pemasangan dalam format yang mudah dibaca mesin.',
    sections: [
      { title: 'Temukan skill', copy: 'Gunakan direktori untuk peninjauan manusia atau resolver saat agent perlu berubah dari tugas menjadi rekomendasi yang konkret.' },
      { title: 'Tinjau sebelum memasang', copy: 'Baca audit dan Trust Score, periksa lisensi, dan uji skill berisiko di sandbox terlebih dahulu.' },
      { title: 'Laporkan hasil', copy: 'Setelah satu penggunaan yang terukur, laporkan hasilnya agar rekomendasi berikutnya dapat belajar dari penggunaan nyata.' },
    ],
  },
}

const MARKET_CORE_CONTENT: Record<MarketLocale, MarketCoreContent> = { zh, ja, ko, es, de, fr, id }

const MARKET_CORE_PAGE_KEYS: Record<LocalizedCorePageSlug, keyof Pick<MarketCoreContent, 'resolve' | 'skills' | 'agentSkill' | 'registry' | 'docs'>> = {
  resolve: 'resolve',
  skills: 'skills',
  'agent-skill': 'agentSkill',
  'agent-skills-registry': 'registry',
  docs: 'docs',
}

export function getMarketCoreContent(locale: MarketLocale) {
  return MARKET_CORE_CONTENT[locale]
}

export function getMarketCorePageMeta(locale: MarketLocale, page: LocalizedCorePageSlug) {
  return getMarketCoreContent(locale)[MARKET_CORE_PAGE_KEYS[page]] as PageMeta
}
