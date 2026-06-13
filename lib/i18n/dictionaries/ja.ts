import en from './en'

const ja = {
  ...en,
  nav: {
    ...en.nav,
    home: 'ホーム',
    skills: 'スキル',
    tasks: 'タスク',
    packs: 'スキルパック',
    compare: '比較',
    submit: '投稿',
    submitSkill: 'スキルを投稿',
    docs: 'ドキュメント',
    apiDocs: 'API',
    activity: 'アクティビティ',
    forAgents: 'Agent 向け',
  },
  hero: {
    ...en.hero,
    title: 'AI agents の Skill layer.',
    subtitle: 'AI agent が適切な再利用可能 Skill を自動で発見、比較、インストールできるようにします。OpenAgentSkill は AI Agent Skills の npm です。',
    tryItNow: '試してみる',
    orDescribeTask: 'タスクを説明',
    taskPlaceholder: 'Web サイトをクロールして構造化データを抽出...',
    findSkills: 'Skill を検索',
    searching: '検索中...',
    recommendedSkills: 'おすすめ Skill',
    noResults: '一致する Skill が見つかりません。別の説明を試してください。',
    confidence: '一致度',
    installCommand: 'インストール',
    cta: {
      browse: 'Agent に合う Skill を探す',
      submit: 'Skill を投稿',
      forAgents: 'Agent API',
    },
  },
  stats: {
    ...en.stats,
    skills: 'スキル',
    downloads: 'ダウンロード',
    platforms: 'プラットフォーム',
    agentSubmissions: 'Agent 投稿',
  },
  common: {
    ...en.common,
    loading: '読み込み中...',
    error: 'エラー',
    notFound: '見つかりません',
    backHome: 'ホームへ戻る',
    learnMore: '詳しく見る',
    getStarted: 'はじめる',
  },
}

export default ja
