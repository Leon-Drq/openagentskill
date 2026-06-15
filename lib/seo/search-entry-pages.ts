export type SearchEntryPageSpec = {
  slug: string
  path: string
  metaTitle: string
  title: string
  eyebrow: string
  description: string
  openGraphDescription: string
  primaryCta: {
    href: string
    label: string
  }
  secondaryCta: {
    href: string
    label: string
  }
  proof: Array<{
    label: string
    value: string
  }>
  sections: Array<{
    eyebrow: string
    title: string
    body: string
    href?: string
    linkLabel?: string
  }>
  cards: Array<{
    title: string
    body: string
    href: string
    label: string
  }>
  faq: Array<{
    question: string
    answer: string
  }>
  related: Array<{
    label: string
    href: string
  }>
  comparison?: {
    otherName: string
    rows: Array<{
      feature: string
      openAgentSkill: string
      other: string
    }>
  }
}

export const SEARCH_ENTRY_PAGES = {
  'agent-skills': {
    slug: 'agent-skills',
    path: '/agent-skills',
    metaTitle: 'Agent Skills for AI Agents | OpenAgentSkill',
    title: 'Agent skills for reusable AI workflows.',
    eyebrow: 'Agent skills',
    description:
      'Find reusable agent skills for web scraping, coding, data analysis, finance, RAG, security, and automation. Compare trust, quality, adoption, and install readiness before an agent acts.',
    openGraphDescription:
      'A practical registry for finding, comparing, auditing, and installing reusable agent skills.',
    primaryCta: { href: '/skills', label: 'Browse agent skills' },
    secondaryCta: { href: '/agent-skill', label: 'What is an agent skill?' },
    proof: [
      { label: 'Indexed skills', value: '3,000+' },
      { label: 'Agent surfaces', value: '100+' },
      { label: 'Discovery model', value: 'Task first' },
      { label: 'Install handoff', value: 'Ready' },
    ],
    sections: [
      {
        eyebrow: 'Why it matters',
        title: 'Agents should not start from a random repository search.',
        body:
          'A reusable skill turns repeated agent work into something that can be discovered, evaluated, installed, and reused. OpenAgentSkill adds the missing decision layer: which skill is useful, maintained, trusted, and ready for the task.',
        href: '/agent-skills-registry',
        linkLabel: 'See the registry layer',
      },
      {
        eyebrow: 'How agents choose',
        title: 'Describe the task, then compare the shortlist.',
        body:
          'Search by workflow intent, inspect GitHub signals, freshness, trust checks, audit notes, platform fit, and install commands before adding a skill to Codex, Claude Code, Cursor, or another agent runtime.',
        href: '/api-docs',
        linkLabel: 'Open agent API docs',
      },
    ],
    cards: [
      {
        title: 'Web scraping',
        body: 'Reusable crawlers, extractors, browser automation, and structured data workflows.',
        href: '/ai-agent-skills/web-scraping',
        label: 'Skill cluster',
      },
      {
        title: 'Coding agents',
        body: 'Code review, repository search, test generation, migration, and developer workflow skills.',
        href: '/ai-agent-skills/coding-agents',
        label: 'Skill cluster',
      },
      {
        title: 'Finance and quant',
        body: 'Market data, stock analysis, portfolio research, backtesting, and financial report workflows.',
        href: '/ai-agent-skills/finance-quant',
        label: 'Skill cluster',
      },
      {
        title: 'Knowledge work',
        body: 'RAG, PDF parsing, document analysis, summarization, and retrieval workflows.',
        href: '/ai-agent-skills/rag-knowledge',
        label: 'Skill cluster',
      },
    ],
    faq: [
      {
        question: 'What are agent skills?',
        answer:
          'Agent skills are reusable capability packages that help AI agents perform specific tasks such as crawling websites, analyzing code, processing documents, or researching markets.',
      },
      {
        question: 'How does OpenAgentSkill rank skills?',
        answer:
          'OpenAgentSkill combines GitHub adoption, freshness, metadata quality, trust checks, audit signals, use-case fit, and install readiness.',
      },
      {
        question: 'Can agents use this directly?',
        answer:
          'Yes. Agents can use OpenAgentSkill API routes to search skills, request recommendations, and fetch install-ready metadata.',
      },
    ],
    related: [
      { label: 'AI Agent Skills', href: '/ai-agent-skills' },
      { label: 'Skills Registry', href: '/skills-registry' },
      { label: 'Agent Skill Definition', href: '/agent-skill' },
      { label: 'Best Skills', href: '/best' },
    ],
  },
  'ai-agent-skills': {
    slug: 'ai-agent-skills',
    path: '/ai-agent-skills',
    metaTitle: 'AI Agent Skills | Discover, Compare, and Install Reusable Skills',
    title: 'AI agent skills your agent can actually choose.',
    eyebrow: 'AI agent skills',
    description:
      'OpenAgentSkill helps AI agents discover, compare, and install the right reusable skill automatically across Codex, Claude Code, Cursor, and agent runtimes.',
    openGraphDescription:
      'Let your AI agent find, compare, and install the right reusable skill automatically.',
    primaryCta: { href: '/api-docs', label: 'Use the recommendation API' },
    secondaryCta: { href: '/skills', label: 'Browse all skills' },
    proof: [
      { label: 'For agents', value: 'API' },
      { label: 'For builders', value: 'Rankings' },
      { label: 'For authors', value: 'Submit' },
      { label: 'For trust', value: 'Audits' },
    ],
    sections: [
      {
        eyebrow: 'Agent native',
        title: 'The useful interface is not only a directory.',
        body:
          'Humans need browseable pages. Agents need structured metadata, rankings, trust signals, and install handoffs. OpenAgentSkill provides both surfaces so a workflow can move from task intent to skill selection.',
        href: '/agent',
        linkLabel: 'Open the agent entry',
      },
      {
        eyebrow: 'Coverage',
        title: 'From developer tools to vertical workflows.',
        body:
          'The catalog includes developer automation, web extraction, RAG, data analysis, security, DevOps, commerce, finance, quant research, documents, and other reusable workflows.',
        href: '/use-cases',
        linkLabel: 'Browse use cases',
      },
    ],
    cards: [
      {
        title: 'Web scraping skills',
        body: 'Find crawler, extractor, browser automation, and HTML-to-markdown skills for public web data.',
        href: '/ai-agent-skills/web-scraping',
        label: 'Cluster',
      },
      {
        title: 'Coding agent skills',
        body: 'Route PR review, CI debugging, issue triage, tests, and repository workflows to reusable skills.',
        href: '/ai-agent-skills/coding-agents',
        label: 'Cluster',
      },
      {
        title: 'Finance and quant skills',
        body: 'Compare market data, filings, portfolio, backtesting, and stock research workflows.',
        href: '/ai-agent-skills/finance-quant',
        label: 'Cluster',
      },
      {
        title: 'World Cup analytics skills',
        body: 'Use football data, xG, team comparison, prediction research, and dashboard workflows.',
        href: '/ai-agent-skills/world-cup-football',
        label: 'Cluster',
      },
      {
        title: 'RAG and knowledge skills',
        body: 'Build retrieval, document ingestion, citation, embedding, and knowledge-base workflows.',
        href: '/ai-agent-skills/rag-knowledge',
        label: 'Cluster',
      },
      {
        title: 'PDF extraction skills',
        body: 'Parse PDFs, extract tables, run OCR, and convert documents into agent-ready markdown.',
        href: '/ai-agent-skills/pdf-extraction',
        label: 'Cluster',
      },
      {
        title: 'Browser automation skills',
        body: 'Operate web apps through Playwright-style flows, screenshots, forms, and UI verification.',
        href: '/ai-agent-skills/browser-automation',
        label: 'Cluster',
      },
      {
        title: 'Security skills',
        body: 'Scan repositories, summarize risks, review dependencies, and prepare remediation steps.',
        href: '/ai-agent-skills/security-compliance',
        label: 'Cluster',
      },
    ],
    faq: [
      {
        question: 'What is an AI agent skill?',
        answer:
          'An AI agent skill is a reusable package of instructions, scripts, metadata, examples, or workflow logic that helps an agent complete a task.',
      },
      {
        question: 'Why not just search GitHub?',
        answer:
          'GitHub search finds repositories. OpenAgentSkill turns repositories into task-oriented skill choices with quality, trust, freshness, and install-readiness signals.',
      },
      {
        question: 'Is OpenAgentSkill tied to one agent?',
        answer:
          'No. The registry is designed for multiple agent surfaces including Codex, Claude Code, Cursor, and other runtimes.',
      },
    ],
    related: [
      { label: 'Agent Skills', href: '/agent-skills' },
      { label: 'Web Scraping Skills', href: '/ai-agent-skills/web-scraping' },
      { label: 'Finance Skills', href: '/ai-agent-skills/finance-quant' },
      { label: 'Agent Skills Registry', href: '/agent-skills-registry' },
      { label: 'API Docs', href: '/api-docs' },
      { label: 'Submit a Skill', href: '/submit' },
    ],
  },
  'skills-registry': {
    slug: 'skills-registry',
    path: '/skills-registry',
    metaTitle: 'AI Agent Skills Registry | OpenAgentSkill',
    title: 'A skills registry for agent discovery, trust, and install handoff.',
    eyebrow: 'Skills registry',
    description:
      'OpenAgentSkill is a registry and recommendation API for AI agent skills, built to help agents find, compare, audit, and install reusable capabilities automatically.',
    openGraphDescription:
      'A registry, trust layer, and recommendation API for reusable AI agent skills.',
    primaryCta: { href: '/agent-skills-registry', label: 'Open registry API' },
    secondaryCta: { href: '/skills', label: 'Browse the catalog' },
    proof: [
      { label: 'Search', value: 'Task' },
      { label: 'Evaluate', value: 'Trust' },
      { label: 'Install', value: 'Handoff' },
      { label: 'Automate', value: 'API' },
    ],
    sections: [
      {
        eyebrow: 'Registry vs directory',
        title: 'A directory is for browsing. A registry is for action.',
        body:
          'OpenAgentSkill keeps human pages for discovery, but the product direction is agent-native: structured endpoints, comparable signals, install commands, manifests, and audit notes that agents can use before acting.',
        href: '/api-docs',
        linkLabel: 'View API docs',
      },
      {
        eyebrow: 'Trust',
        title: 'Every recommendation needs evidence.',
        body:
          'Skill choices should include quality score, stars, freshness, repository health, audit status, risk notes, and platform fit. That makes agent installs more predictable and easier to review.',
        href: '/audits',
        linkLabel: 'View audits',
      },
    ],
    cards: [
      {
        title: 'Recommendation API',
        body: 'Convert a task description into a ranked, install-ready skill shortlist.',
        href: '/api-docs',
        label: 'API',
      },
      {
        title: 'Skill manifests',
        body: 'Expose structured metadata so agents know what a skill does and how to use it.',
        href: '/openapi.json',
        label: 'Metadata',
      },
      {
        title: 'Trust signals',
        body: 'Compare quality, maintenance, stars, freshness, and audit warnings before install.',
        href: '/rankings',
        label: 'Rankings',
      },
      {
        title: 'Install review',
        body: 'Move from discovery to a clear install command, repository URL, or workflow handoff.',
        href: '/cli',
        label: 'Install',
      },
    ],
    faq: [
      {
        question: 'What is a skills registry?',
        answer:
          'A skills registry is a structured catalog that agents and humans can query to discover, compare, audit, and install reusable skills.',
      },
      {
        question: 'How is this different from a marketplace?',
        answer:
          'A marketplace optimizes for browsing and listings. OpenAgentSkill is designed as the routing and trust layer that agents can call programmatically.',
      },
      {
        question: 'Does the registry include MCP servers?',
        answer:
          'Automated imports intentionally focus on skills and exclude MCP repositories from bulk collection.',
      },
    ],
    related: [
      { label: 'Agent Skills Registry', href: '/agent-skills-registry' },
      { label: 'Agent Skills Directory', href: '/agent-skills-directory' },
      { label: 'OpenAPI', href: '/openapi.json' },
      { label: 'Rankings', href: '/rankings' },
    ],
  },
  openagentskill: {
    slug: 'openagentskill',
    path: '/openagentskill',
    metaTitle: 'OpenAgentSkill | The Skill Layer for AI Agents',
    title: 'OpenAgentSkill is the skill layer for AI agents.',
    eyebrow: 'OpenAgentSkill',
    description:
      'OpenAgentSkill helps agents find, compare, and install the right reusable skill automatically. Think npm for AI Agent Skills: a registry, trust layer, and recommendation API for modern agent workflows.',
    openGraphDescription:
      'The skill layer for AI agents: discover, compare, audit, and install reusable skills automatically.',
    primaryCta: { href: '/agent-skills-registry', label: 'Explore the registry' },
    secondaryCta: { href: '/compare', label: 'Compare platforms' },
    proof: [
      { label: 'Positioning', value: 'Skill layer' },
      { label: 'Analogy', value: 'npm' },
      { label: 'Surface', value: 'API' },
      { label: 'Workflow', value: 'Install' },
    ],
    sections: [
      {
        eyebrow: 'What it is',
        title: 'A registry and recommendation layer for reusable agent capability.',
        body:
          'OpenAgentSkill indexes skills, enriches them with trust and quality signals, and exposes them through pages and APIs so builders and agents can choose reusable capabilities with more confidence.',
        href: '/skills',
        linkLabel: 'Browse skills',
      },
      {
        eyebrow: 'Where it goes',
        title: 'From human search to agent-driven installation.',
        body:
          'The long-term product is not only a catalog. It is the layer an agent calls when it needs to decide which reusable skill to use for a task, compare alternatives, and produce an install plan.',
        href: '/agent',
        linkLabel: 'See agent entry',
      },
    ],
    cards: [
      {
        title: 'Discover',
        body: 'Find reusable skills by task, agent, category, use case, or repository signal.',
        href: '/skills',
        label: 'Catalog',
      },
      {
        title: 'Compare',
        body: 'Use ranked pages and competitive comparisons to understand tradeoffs.',
        href: '/compare',
        label: 'Decision',
      },
      {
        title: 'Audit',
        body: 'Review trust, quality, maintenance, and security notes before install.',
        href: '/audits',
        label: 'Trust',
      },
      {
        title: 'Install',
        body: 'Use clear install handoffs for Codex, Claude Code, Cursor, and agent workflows.',
        href: '/cli',
        label: 'Action',
      },
    ],
    faq: [
      {
        question: 'What is OpenAgentSkill?',
        answer:
          'OpenAgentSkill is the skill layer for AI agents: a registry, trust layer, and recommendation API for reusable agent skills.',
      },
      {
        question: 'Why say npm for AI Agent Skills?',
        answer:
          'The phrase explains the product quickly: agents and builders need a trusted place to discover reusable capability, inspect signals, and install it into workflows.',
      },
      {
        question: 'Who is OpenAgentSkill for?',
        answer:
          'It is for agent builders, skill authors, and AI agents that need reliable reusable skills for real tasks.',
      },
    ],
    related: [
      { label: 'Agent Skills', href: '/agent-skills' },
      { label: 'AI Agent Skills', href: '/ai-agent-skills' },
      { label: 'Skills Registry', href: '/skills-registry' },
      { label: 'GitHub Repository', href: 'https://github.com/Leon-Drq/openagentskill' },
    ],
  },
  'agentskills-io-alternative': {
    slug: 'agentskills-io-alternative',
    path: '/alternatives/agentskills-io',
    metaTitle: 'Best AgentSkills.io Alternative for AI Agent Skill Discovery',
    title: 'An AgentSkills.io alternative built for agent-ready discovery.',
    eyebrow: 'AgentSkills.io alternative',
    description:
      'Compare AgentSkills.io and OpenAgentSkill. AgentSkills.io is useful for learning the Agent Skills concept; OpenAgentSkill adds registry APIs, rankings, trust signals, and install-ready skill discovery.',
    openGraphDescription:
      'OpenAgentSkill adds registry APIs, rankings, audits, and install handoffs for AI agent skills.',
    primaryCta: { href: '/compare/openagentskill-vs-agentskills-io', label: 'Read full comparison' },
    secondaryCta: { href: '/agent-skills', label: 'Browse agent skills' },
    proof: [
      { label: 'Agent API', value: 'Yes' },
      { label: 'Rankings', value: 'Yes' },
      { label: 'Audits', value: 'Yes' },
      { label: 'Install handoff', value: 'Yes' },
    ],
    sections: [
      {
        eyebrow: 'Position',
        title: 'Reference site vs registry layer.',
        body:
          'AgentSkills.io is strong as a conceptual and documentation hub. OpenAgentSkill focuses on the next step: helping agents and builders choose a skill for a task, compare alternatives, inspect trust, and install it.',
        href: '/compare/openagentskill-vs-agentskills-io',
        linkLabel: 'Compare side by side',
      },
      {
        eyebrow: 'Best fit',
        title: 'Use OpenAgentSkill when the task needs a decision.',
        body:
          'If an agent needs to pick a reusable skill for scraping, coding, documents, finance, RAG, browser automation, or security, it needs ranked metadata and install handoff instead of concept pages alone.',
        href: '/tasks',
        linkLabel: 'Browse task pages',
      },
    ],
    cards: [
      {
        title: 'Task-to-skill search',
        body: 'Start from what the agent needs to do, then return ranked skill candidates.',
        href: '/tasks',
        label: 'Search',
      },
      {
        title: 'Trust and quality signals',
        body: 'Compare freshness, GitHub adoption, metadata quality, audit notes, and risk.',
        href: '/rankings',
        label: 'Trust',
      },
      {
        title: 'Agent-readable APIs',
        body: 'Expose recommendation, search, audit, and manifest endpoints for agent workflows.',
        href: '/api-docs',
        label: 'API',
      },
      {
        title: 'Install handoff',
        body: 'Move from comparison to the command, repository, or prompt an agent can use.',
        href: '/cli',
        label: 'Install',
      },
    ],
    comparison: {
      otherName: 'AgentSkills.io',
      rows: [
        {
          feature: 'Core use',
          openAgentSkill: 'Task-to-skill discovery, ranking, trust signals, and install handoff.',
          other: 'Conceptual reference and documentation for the Agent Skills idea.',
        },
        {
          feature: 'Agent API',
          openAgentSkill: 'Search, recommend, audit, manifest, and ranking endpoints.',
          other: 'Documentation-first browsing.',
        },
        {
          feature: 'Decision support',
          openAgentSkill: 'Quality, trust, freshness, stars, use-case fit, and install readiness.',
          other: 'Useful concept context with less side-by-side scoring.',
        },
      ],
    },
    faq: [
      {
        question: 'Is OpenAgentSkill a replacement for AgentSkills.io?',
        answer:
          'It is better understood as a different layer. AgentSkills.io helps explain the concept; OpenAgentSkill helps agents choose and install skills.',
      },
      {
        question: 'Why create an alternative page?',
        answer:
          'Users searching for AgentSkills.io alternatives are usually comparing discovery, trust, API, and install workflows. This page makes that difference explicit.',
      },
      {
        question: 'Can I still use both?',
        answer:
          'Yes. Use AgentSkills.io for conceptual learning and OpenAgentSkill for task-oriented discovery, rankings, audits, and agent-readable metadata.',
      },
    ],
    related: [
      { label: 'OpenAgentSkill vs AgentSkills.io', href: '/compare/openagentskill-vs-agentskills-io' },
      { label: 'skills.sh Alternative', href: '/alternatives/skills-sh' },
      { label: 'Agent Skills Registry', href: '/agent-skills-registry' },
      { label: 'API Docs', href: '/api-docs' },
    ],
  },
} satisfies Record<string, SearchEntryPageSpec>
