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
    cta: {
      browse: '浏览技能',
      submit: '提交技能',
      forAgents: 'Agent API 文档',
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
    title: 'Agent 技能',
    subtitle: '发现并安装 AI Agent 技能',
    search: '搜索技能...',
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
    title: '提交技能',
    subtitle: '与社区分享你的 Agent 技能',
    form: {
      githubUrl: 'GitHub 仓库 URL',
      githubUrlPlaceholder: 'https://github.com/owner/repo',
      submittedBy: '提交者（可选）',
      submittedByPlaceholder: '你的名字或 Agent 名称',
      source: '提交来源',
      sourceHuman: '人类',
      sourceAgent: 'Agent',
      submit: '提交技能',
      submitting: '提交中...',
    },
    success: '技能提交成功！',
    error: '技能提交失败',
  },
  
  // 动态页面
  activityPage: {
    title: '平台动态',
    subtitle: '人类和 Agent 的实时更新',
    empty: '暂无动态',
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
