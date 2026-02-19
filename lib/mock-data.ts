import { Skill, Author } from './types'

export const mockAuthors: Author[] = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    username: 'sarahchen',
    bio: 'AI Researcher specializing in agent architectures',
    reputation: 9542,
    skillCount: 23,
    verified: true,
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    username: 'mrodriguez',
    bio: 'Building the future of autonomous systems',
    reputation: 7821,
    skillCount: 18,
    verified: true,
  },
  {
    id: '3',
    name: 'Yuki Tanaka',
    username: 'yukidev',
    bio: 'Open source enthusiast and automation expert',
    reputation: 6234,
    skillCount: 31,
    verified: false,
  },
]

export const mockSkills: Skill[] = [
  {
    id: '1',
    slug: 'advanced-web-research',
    name: 'Advanced Web Research',
    tagline: 'Deep web research with source verification and fact-checking',
    description: 'An intelligent research skill that performs multi-source verification, fact-checking, and synthesizes information from across the web into structured reports.',
    longDescription: `Advanced Web Research transforms how AI agents gather and verify information. Unlike simple web scrapers, this skill implements a sophisticated research methodology that mirrors human research processes.

The skill performs parallel searches across multiple search engines, cross-references findings, evaluates source credibility, and constructs comprehensive reports with proper citations. It includes built-in fact-checking against known databases and can identify conflicting information across sources.

Perfect for agents that need to make informed decisions based on current, verified information. Used by autonomous research agents, content creation systems, and decision-support tools.`,
    category: 'research',
    tags: ['web-scraping', 'fact-checking', 'research', 'verification', 'citations'],
    author: mockAuthors[0],
    stats: {
      downloads: 45230,
      stars: 3421,
      forks: 892,
      usedBy: 1247,
      rating: 4.8,
      reviewCount: 423,
    },
    technical: {
      version: '2.3.1',
      language: ['Python', 'TypeScript'],
      frameworks: ['LangChain', 'LlamaIndex'],
      dependencies: ['beautifulsoup4', 'selenium', 'newspaper3k'],
      documentation: 'https://docs.openagentskill.com/skills/web-research',
      repository: 'https://github.com/openagentskill/web-research',
      license: 'MIT',
      size: '2.3 MB',
      lastUpdated: '2026-02-15',
    },
    pricing: {
      type: 'free',
    },
    compatibility: [
      { platform: 'langchain', version: '>=0.1.0', status: 'full' },
      { platform: 'llamaindex', version: '>=0.9.0', status: 'full' },
      { platform: 'crewai', version: '>=0.2.0', status: 'full' },
      { platform: 'autogpt', version: '>=0.5.0', status: 'partial' },
    ],
    createdAt: '2025-08-12',
    updatedAt: '2026-02-15',
    featured: true,
    verified: true,
  },
  {
    id: '2',
    slug: 'code-review-assistant',
    name: 'Code Review Assistant',
    tagline: 'Automated code review with security scanning and best practices',
    description: 'Performs comprehensive code reviews including security vulnerabilities, performance issues, code style violations, and suggests improvements aligned with industry best practices.',
    longDescription: `Code Review Assistant brings enterprise-grade code review capabilities to any AI agent. This skill analyzes codebases across multiple languages, identifying security vulnerabilities, performance bottlenecks, maintainability issues, and style violations.

The skill goes beyond simple linting — it understands architectural patterns, detects code smells, suggests refactoring opportunities, and can even generate improvement patches. It integrates with popular vulnerability databases and stays updated with the latest security advisories.

Ideal for autonomous development agents, CI/CD pipelines, and code quality monitoring systems. Supports over 30 programming languages with deep analysis for JavaScript, Python, Go, Rust, and Java.`,
    category: 'code-generation',
    tags: ['code-review', 'security', 'static-analysis', 'linting', 'best-practices'],
    author: mockAuthors[1],
    stats: {
      downloads: 38912,
      stars: 2876,
      forks: 654,
      usedBy: 892,
      rating: 4.7,
      reviewCount: 312,
    },
    technical: {
      version: '1.8.4',
      language: ['Python', 'Go'],
      frameworks: ['LangChain', 'Semantic Kernel'],
      dependencies: ['tree-sitter', 'semgrep', 'bandit'],
      documentation: 'https://docs.openagentskill.com/skills/code-review',
      repository: 'https://github.com/openagentskill/code-review',
      license: 'Apache 2.0',
      size: '4.1 MB',
      lastUpdated: '2026-02-10',
    },
    pricing: {
      type: 'freemium',
      price: 29,
      currency: 'USD',
      pricingModel: 'subscription',
    },
    compatibility: [
      { platform: 'langchain', version: '>=0.1.0', status: 'full' },
      { platform: 'semantic-kernel', version: '>=1.0.0', status: 'full' },
      { platform: 'openai-assistants', version: '>=2.0.0', status: 'experimental' },
    ],
    createdAt: '2025-09-23',
    updatedAt: '2026-02-10',
    featured: true,
    verified: true,
  },
  {
    id: '3',
    slug: 'data-visualization-generator',
    name: 'Data Visualization Generator',
    tagline: 'Create insightful charts and graphs from raw data automatically',
    description: 'Analyzes datasets and automatically generates appropriate visualizations with intelligent chart selection, color schemes, and annotations.',
    longDescription: `Data Visualization Generator empowers agents to transform raw data into compelling visual stories. This skill doesn't just plot data — it analyzes the structure, distribution, and relationships within datasets to select the most effective visualization types.

The skill supports over 40 chart types and can create multi-panel dashboards, interactive visualizations, and publication-ready graphics. It automatically handles data cleaning, outlier detection, and statistical summaries.

Perfect for business intelligence agents, reporting systems, and data analysis workflows. Outputs include D3.js, Plotly, Chart.js, and static image formats.`,
    category: 'data-analysis',
    tags: ['visualization', 'charts', 'data-analysis', 'business-intelligence'],
    author: mockAuthors[2],
    stats: {
      downloads: 29384,
      stars: 2103,
      forks: 487,
      usedBy: 673,
      rating: 4.6,
      reviewCount: 198,
    },
    technical: {
      version: '3.1.0',
      language: ['Python', 'JavaScript'],
      frameworks: ['LangChain', 'AutoGPT'],
      dependencies: ['matplotlib', 'plotly', 'd3.js', 'pandas'],
      documentation: 'https://docs.openagentskill.com/skills/data-viz',
      license: 'MIT',
      size: '5.8 MB',
      lastUpdated: '2026-02-08',
    },
    pricing: {
      type: 'free',
    },
    compatibility: [
      { platform: 'langchain', version: '>=0.1.0', status: 'full' },
      { platform: 'autogpt', version: '>=0.5.0', status: 'full' },
      { platform: 'crewai', version: '>=0.2.0', status: 'partial' },
    ],
    createdAt: '2025-11-05',
    updatedAt: '2026-02-08',
    featured: false,
    verified: false,
  },
  {
    id: '4',
    slug: 'api-orchestrator',
    name: 'API Orchestrator',
    tagline: 'Intelligently chain and compose API calls across services',
    description: 'Manages complex API workflows with automatic retry logic, rate limiting, authentication handling, and response transformation.',
    longDescription: `API Orchestrator is the Swiss Army knife for agents that need to interact with external services. This skill handles the complexity of modern API ecosystems — managing authentication flows, handling rate limits, implementing retry strategies, and transforming responses.

The skill can automatically discover API schemas from OpenAPI specifications, handle OAuth flows, manage API keys securely, and compose multi-step API workflows with conditional logic and error handling.

Essential for integration agents, workflow automation systems, and any agent that needs reliable external service interactions. Supports REST, GraphQL, gRPC, and webhook-based APIs.`,
    category: 'integration',
    tags: ['api', 'integration', 'orchestration', 'workflow', 'automation'],
    author: mockAuthors[0],
    stats: {
      downloads: 52103,
      stars: 4287,
      forks: 1203,
      usedBy: 1891,
      rating: 4.9,
      reviewCount: 567,
    },
    technical: {
      version: '4.2.0',
      language: ['TypeScript', 'Python'],
      frameworks: ['LangChain', 'CrewAI', 'Haystack'],
      dependencies: ['axios', 'openapi-client', 'oauth2-client'],
      documentation: 'https://docs.openagentskill.com/skills/api-orchestrator',
      repository: 'https://github.com/openagentskill/api-orchestrator',
      license: 'MIT',
      size: '3.2 MB',
      lastUpdated: '2026-02-18',
    },
    pricing: {
      type: 'free',
    },
    compatibility: [
      { platform: 'langchain', version: '>=0.1.0', status: 'full' },
      { platform: 'crewai', version: '>=0.2.0', status: 'full' },
      { platform: 'haystack', version: '>=2.0.0', status: 'full' },
      { platform: 'semantic-kernel', version: '>=1.0.0', status: 'full' },
    ],
    createdAt: '2025-07-19',
    updatedAt: '2026-02-18',
    featured: true,
    verified: true,
  },
  {
    id: '5',
    slug: 'document-intelligence',
    name: 'Document Intelligence',
    tagline: 'Extract, analyze, and structure information from any document format',
    description: 'Advanced document processing that handles PDFs, Word docs, spreadsheets, images, and more with OCR, layout analysis, and intelligent extraction.',
    longDescription: `Document Intelligence brings human-level document understanding to AI agents. This skill can process virtually any document format, extract structured data, understand layout and context, and handle complex documents like contracts, invoices, research papers, and forms.

The skill combines OCR, layout analysis, table detection, and semantic understanding to extract not just text, but meaningful information with proper context and relationships. It can handle multi-page documents, detect signatures, extract key-value pairs, and understand document hierarchies.

Critical for automation agents, document processing workflows, and compliance systems. Processes over 50 document formats with specialized handlers for legal, financial, and scientific documents.`,
    category: 'automation',
    tags: ['ocr', 'document-processing', 'data-extraction', 'nlp', 'automation'],
    author: mockAuthors[1],
    stats: {
      downloads: 41239,
      stars: 3654,
      forks: 891,
      usedBy: 1523,
      rating: 4.8,
      reviewCount: 445,
    },
    technical: {
      version: '2.7.3',
      language: ['Python'],
      frameworks: ['LlamaIndex', 'LangChain'],
      dependencies: ['tesseract', 'pdfplumber', 'docx', 'openpyxl'],
      documentation: 'https://docs.openagentskill.com/skills/document-intelligence',
      license: 'Apache 2.0',
      size: '8.4 MB',
      lastUpdated: '2026-02-14',
    },
    pricing: {
      type: 'freemium',
      price: 49,
      currency: 'USD',
      pricingModel: 'subscription',
    },
    compatibility: [
      { platform: 'llamaindex', version: '>=0.9.0', status: 'full' },
      { platform: 'langchain', version: '>=0.1.0', status: 'full' },
      { platform: 'haystack', version: '>=2.0.0', status: 'partial' },
    ],
    createdAt: '2025-10-11',
    updatedAt: '2026-02-14',
    featured: true,
    verified: true,
  },
  {
    id: '6',
    slug: 'sentiment-market-analyzer',
    name: 'Sentiment & Market Analyzer',
    tagline: 'Real-time sentiment analysis and market intelligence from social media',
    description: 'Monitors social media, news, and forums to gauge sentiment, detect trends, and provide market intelligence insights.',
    longDescription: `Sentiment & Market Analyzer gives agents the ability to understand public opinion and market dynamics in real-time. This skill monitors social media platforms, news sites, forums, and other public data sources to detect sentiment shifts, emerging trends, and market signals.

The skill uses advanced NLP to understand context, sarcasm, and nuance in social media posts. It can track specific topics, brands, or trends, and provides actionable insights with confidence scores and supporting evidence.

Valuable for trading agents, brand monitoring systems, and market research applications. Supports sentiment tracking across 40+ languages with cultural context awareness.`,
    category: 'business',
    tags: ['sentiment-analysis', 'social-media', 'market-intelligence', 'nlp', 'trends'],
    author: mockAuthors[2],
    stats: {
      downloads: 33876,
      stars: 2534,
      forks: 623,
      usedBy: 987,
      rating: 4.5,
      reviewCount: 289,
    },
    technical: {
      version: '1.9.2',
      language: ['Python'],
      frameworks: ['LangChain', 'AutoGPT'],
      dependencies: ['transformers', 'tweepy', 'praw', 'newspaper3k'],
      documentation: 'https://docs.openagentskill.com/skills/sentiment-analyzer',
      license: 'MIT',
      size: '6.7 MB',
      lastUpdated: '2026-02-12',
    },
    pricing: {
      type: 'paid',
      price: 79,
      currency: 'USD',
      pricingModel: 'subscription',
    },
    compatibility: [
      { platform: 'langchain', version: '>=0.1.0', status: 'full' },
      { platform: 'autogpt', version: '>=0.5.0', status: 'full' },
    ],
    createdAt: '2025-12-03',
    updatedAt: '2026-02-12',
    featured: false,
    verified: true,
  },
]

export function getSkillBySlug(slug: string): Skill | undefined {
  return mockSkills.find((skill) => skill.slug === slug)
}

export function getSkillsByCategory(category: string): Skill[] {
  return mockSkills.filter((skill) => skill.category === category)
}

export function getFeaturedSkills(): Skill[] {
  return mockSkills.filter((skill) => skill.featured)
}

export function searchSkills(query: string): Skill[] {
  const lowerQuery = query.toLowerCase()
  return mockSkills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}
