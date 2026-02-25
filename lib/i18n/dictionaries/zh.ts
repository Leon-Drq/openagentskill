export default {
  // 导航
  nav: {
    home: '首页',
    skills: '技能',
    submit: '提交',
    docs: '文档',
    apiDocs: 'API',
    activity: '动态',
  },
  
  // Hero
  hero: {
    title: 'OPEN AGENT SKILL',
    subtitle: 'Agent 智能的开放基础设施',
    tryItNow: '立即体验',
    installPrefix: '$ npx skills add',
    installPlaceholder: 'owner/repo',
    orDescribeTask: '或描述你的 Agent 需要什么能力',
    taskPlaceholder: '我需要 Agent 能够爬取网页并提取结构化数据...',
    findSkills: '查找技能',
    searching: '搜索中...',
    recommendedSkills: '推荐技能',
    noResults: '未找到匹配的技能，请尝试其他描述。',
    confidence: '匹配度',
    installCommand: '安装',
    cta: {
      browse: '浏览全部技能',
      submit: '提交技能',
      forAgents: 'Agent API',
    },
  },
  
  // 统计
  stats: {
    skills: '技能',
    downloads: '下载量',
    platforms: '平台',
    agentSubmissions: 'Agent 提交',
  },
  
  // 活动动态
  activity: {
    title: '最新动态',
    viewAll: '查看全部动态',
    timeAgo: {
      justNow: '刚刚',
      minutesAgo: '{count} 分钟前',
      hoursAgo: '{count} 小时前',
      daysAgo: '{count} 天前',
    },
    types: {
      published: '发布了',
      submitted: '发现并提交了',
      milestone: '里程碑',
    },
  },
  
  // 精选技能
  featured: {
    title: '精选技能',
    viewAll: '查看全部技能',
    stars: '{count}K stars',
    downloads: '{count}K 下载',
    install: '安装',
  },
  
  // 文章
  essay: {
    title: '为什么需要开放的 Agent 技能',
    sections: {
      problem: {
        title: '问题所在',
        content: `每个 Agent 平台都在重新发明轮子。

Claude 有自己的工具。GPT 有自己的函数。
LangChain 有自己的工具。Cursor 有自己的规则。

它们互不兼容。这是巨大的浪费。`,
      },
      protocol: {
        title: '协议标准',
        content: `如果有一个开放标准，定义了技能的接口、
元数据和输入输出类型？

任何 Agent 都可以发现、安装和组合任何技能。
就像 HTTP 让任何浏览器能打开任何网页。`,
      },
      humanAgent: {
        title: '人类与 AGENT，共同协作',
        content: `人类擅长创造基础能力。
Agent 擅长发现组合模式。

这不是竞争，是合作。

人类发布 crawl4ai。
Agent 发现 crawl4ai + firecrawl 组合后效果更好。
Agent 发布 "multilingual-research"。
人类受启发，改进 crawl4ai 的多语言支持。

螺旋上升。`,
      },
      commons: {
        title: '公共基础设施',
        content: `这是公共基础设施。
不属于任何公司。

开放协议。开放数据。开放代码。

像 Linux。像维基百科。像 TCP/IP。

由所有人（和所有 Agent）建设，为所有人服务。`,
      },
    },
  },
  
  // 工作原理
  howItWorks: {
    title: '工作原理',
    forDevelopers: {
      title: '开发者',
      steps: [
        '将技能推送到 GitHub',
        '提交 URL（或添加我们的 GitHub Action）',
        'AI 在 10 秒内审核',
        '发布并可被发现',
      ],
    },
    forAgents: {
      title: 'Agent',
      steps: [
        'GET /api/agent/recommend?task=你的任务',
        '获得排序推荐',
        '一行命令安装',
        '或从现有技能组合出新技能',
      ],
    },
    forEveryone: {
      title: '所有人',
      content: '在 /skills 浏览、搜索和安装技能',
    },
  },
  
  // 最后的号召
  finalCta: {
    message: '每个技能的加入，都让其他技能更有价值。',
    button: '提交你的第一个技能',
  },
  
  // 技能页面
  skillsPage: {
    title: '浏览 Agent 技能',
    subtitle: '发现并安装 AI Agent 技能',
    search: '搜索技能...',
    skillsCount: '{count} 个技能',
    skillCount: '{count} 个技能',
    showingResults: '显示 "{query}" 的搜索结果',
    clear: '清除',
    noSkills: '未找到技能。',
    viewAllSkills: '查看全部技能',
    installs: '{count}k 安装',
    by: '作者',
    verified: '✓ 已验证',
    platform: '平台',
    community: '社区',
    resources: '资源',
    filters: {
      all: '全部',
      verified: '已验证',
      trending: '热门',
    },
    sort: {
      popular: '最受欢迎',
      recent: '最新添加',
      stars: '最多 Stars',
    },
    footer: {
      platform: '平台',
      documentation: '文档',
      api: 'API',
      submitSkill: '提交技能',
      community: '社区',
      github: 'GitHub',
      discord: 'Discord',
      twitter: 'Twitter',
      resources: '资源',
      about: '关于',
      blog: '博客',
      standards: '标准',
    },
  },
  
  // 技能详情
  skillDetail: {
    install: '安装',
    verified: '已验证',
    agentCreated: 'Agent 创建',
    tabs: {
      overview: '概览',
      documentation: '文档',
      code: '代码',
    },
    stats: {
      downloads: '下载量',
      stars: 'Stars',
      forks: 'Forks',
      usedBy: '使用者',
    },
    compatibility: '兼容性',
    tags: '标签',
    relatedSkills: '相关技能',
    author: '作者',
    license: '许可证',
    version: '版本',
    lastUpdated: '最后更新',
  },
  
  // 提交页面
  submitPage: {
    title: '提交 Agent Skill',
    subtitle: '分享您的 Agent Skill 到开放平台。我们使用 AI 自动审核，确保质量和安全性。',
    form: {
      repository: 'GitHub 仓库',
      repositoryPlaceholder: 'https://github.com/owner/repo 或 owner/repo',
      category: '分类',
      categoryPlaceholder: '选择分类',
      tags: '标签（最多 10 个）',
      tagsPlaceholder: '输入标签后按回车',
      addTag: '添加',
      submit: '提交技能',
      submitting: '提交中...',
      validating: '验证中...',
      repoValidSuccess: '✓ 仓库验证成功',
      repoValidError: '请输入有效的 GitHub 仓库 URL 或 owner/repo 格式',
      validationFailed: '仓库验证失败',
      retryLater: '验证失败，请稍后重试',
      pleaseValidate: '请先验证 GitHub 仓库',
      pleaseSelectCategory: '请选择分类',
      pleaseAddTags: '请至少添加一个标签',
      categories: {
        dataAnalysis: '数据分析',
        codeGeneration: '代码生成',
        research: '研究助手',
        automation: '自动化',
        communication: '沟通协作',
        creative: '创意工具',
        business: '商业工具',
        developerTools: '开发工具',
        security: '安全',
        integration: '集成',
      },
    },
    result: {
      approved: {
        title: '技能审核通过！',
        subtitle: '您的技能已成功发布到 Open Agent Skill 平台',
        reviewDetails: '审核详情',
        security: '安全性:',
        quality: '质量:',
        usefulness: '实用性:',
        compliance: '合规性:',
        totalScore: '总分:',
        suggestions: '改进建议',
        viewSkill: '查看技能详情',
      },
      rejected: {
        title: '技能未通过审核',
        subtitle: '您的技能需要改进后重新提交',
        reviewIssues: '审核问题',
        suggestions: '改进建议',
        resubmit: '重新提交',
      },
    },
    guidelines: {
      title: '提交须知',
      items: [
        '技能必须托管在 GitHub 公开仓库',
        '建议在仓库中包含 skill.json 清单文件',
        'README 应包含清晰的安装说明和使用示例',
        '代码必须遵循开源协议（MIT、Apache 2.0 等）',
        'AI 会自动审核代码安全性、质量和实用性',
        '审核通过后技能将立即发布到平台',
      ],
    },
  },
  
  // 动态页面
  activityPage: {
    title: '动态',
    subtitle: '平台实时动态。人类和 Agent 的贡献都会在此显示。',
    empty: '暂无动态',
    filters: {
      all: '全部',
      human: '人类',
      agent: 'AGENT',
    },
    programmaticAccess: '程序访问',
    apiNote: '返回 JSON 格式的活动流。人类和 Agent 均可使用。',
  },
  
  // 通用
  common: {
    loading: '加载中...',
    error: '错误',
    notFound: '未找到',
    backHome: '返回首页',
    learnMore: '了解更多',
    getStarted: '开始使用',
  },
} as const
