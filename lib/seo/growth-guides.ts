export type GrowthGuideIntent = 'best' | 'install' | 'compare' | 'standard'

export interface GrowthGuideStep {
  title: string
  description: string
}

export interface GrowthGuideSection {
  title: string
  body: string
  bullets: string[]
}

export interface GrowthGuideFAQ {
  question: string
  answer: string
}

export interface GrowthGuideDefinition {
  slug: string
  shortTitle: string
  title: string
  eyebrow: string
  description: string
  intent: GrowthGuideIntent
  heroPrompt: string
  useCaseSlug?: string
  platformLabel?: string
  platformKeywords?: string[]
  skillKeywords: string[]
  primarySkillSlugs?: string[]
  compareTargetNames?: string[]
  sections: GrowthGuideSection[]
  steps: GrowthGuideStep[]
  faq: GrowthGuideFAQ[]
  relatedGuideSlugs: string[]
}

export const GROWTH_GUIDES: GrowthGuideDefinition[] = [
  {
    slug: 'best-agent-skills-for-claude-code',
    shortTitle: 'Claude Code skills',
    title: 'Best Agent Skills for Claude Code',
    eyebrow: 'Platform shortlist',
    description:
      'A practical shortlist of skills for Claude Code users who want stronger repository analysis, repeatable coding workflows, browser checks, and agent-ready implementation plans.',
    intent: 'best',
    heroPrompt:
      'I need Claude Code skills that help with repository analysis, code review, browser checks, and repeatable engineering workflows.',
    useCaseSlug: 'coding-agents',
    platformLabel: 'Claude Code',
    platformKeywords: ['claude', 'anthropic', 'code', 'skill', 'skills', 'repository', 'review'],
    skillKeywords: ['claude', 'anthropic', 'code', 'github', 'review', 'test', 'repository', 'browser', 'playwright'],
    sections: [
      {
        title: 'What makes a Claude Code skill worth installing',
        body:
          'Start with skills that turn fuzzy coding tasks into repeatable actions. The best candidates have clear install paths, recent repository activity, and a narrow workflow you can test in one session.',
        bullets: [
          'Prefer skills with explicit repository, testing, review, or browser-verification behavior.',
          'Use GitHub adoption and freshness as screening signals, not as the final decision.',
          'Run one task end to end before adding multiple companion skills.',
        ],
      },
      {
        title: 'How to use this guide',
        body:
          'Treat the shortlist as a starting point. Open each decision page, copy the install command, and compare the implementation path against your actual Claude Code workflow.',
        bullets: [
          'Pick one primary skill for the job-to-be-done.',
          'Add a companion only when it removes a real manual step.',
          'Review permissions and license before production use.',
        ],
      },
    ],
    steps: [
      {
        title: 'Describe the engineering task',
        description: 'Write the task as a workflow, such as reviewing a PR, debugging a route, or verifying a web UI.',
      },
      {
        title: 'Install one primary skill',
        description: 'Start with the highest-readiness match and run it in a sandbox repository or branch.',
      },
      {
        title: 'Compare output and failure modes',
        description: 'Check whether the skill produces useful edits, explains tradeoffs, and handles missing context cleanly.',
      },
    ],
    faq: [
      {
        question: 'Are these skills only for Claude Code?',
        answer:
          'No. The shortlist is tuned for Claude Code search intent, but many skills can also fit Codex, OpenAI Agents, Cursor, or other agent workflows after manual validation.',
      },
      {
        question: 'What should I install first?',
        answer:
          'Install one skill that matches your current workflow, then add companion skills only after you have verified the first one end to end.',
      },
    ],
    relatedGuideSlugs: ['install-agent-skills-in-claude-code', 'best-agent-skills-for-codex', 'best-agent-skills-for-web-scraping'],
  },
  {
    slug: 'best-agent-skills-for-codex',
    shortTitle: 'Codex skills',
    title: 'Best Agent Skills for Codex',
    eyebrow: 'Platform shortlist',
    description:
      'A focused guide for builders using Codex-style coding agents: repository inspection, issue triage, implementation planning, testing, and browser verification skills.',
    intent: 'best',
    heroPrompt:
      'I need Codex skills for repository analysis, patching code, reviewing pull requests, and verifying changes before shipping.',
    useCaseSlug: 'coding-agents',
    platformLabel: 'Codex',
    platformKeywords: ['codex', 'openai', 'gpt', 'agent', 'agents sdk', 'code', 'repository'],
    skillKeywords: ['codex', 'openai', 'github', 'code', 'repository', 'pull request', 'review', 'debug', 'test'],
    sections: [
      {
        title: 'The Codex buying criterion',
        body:
          'A useful Codex skill should compress a real engineering loop: understand context, make a scoped change, verify behavior, and explain the result.',
        bullets: [
          'Look for skills that include verification, not just generation.',
          'Favor installable workflows over vague prompt packs.',
          'Use the readiness score to decide whether to adopt, shortlist, or prototype.',
        ],
      },
      {
        title: 'Where Codex skills create leverage',
        body:
          'The highest-value use cases are repetitive engineering chores: PR review, test generation, repo summaries, bug triage, and release note drafting.',
        bullets: [
          'Use repository-aware skills for codebase onboarding.',
          'Use browser and testing skills to verify product behavior.',
          'Use GitHub automation skills for recurring team workflows.',
        ],
      },
    ],
    steps: [
      {
        title: 'Choose a narrow job',
        description: 'Start with one workflow such as PR review, route debugging, or UI smoke testing.',
      },
      {
        title: 'Ask the recommendation API',
        description: 'Use the task prompt on this page to generate a ranked plan from the current marketplace.',
      },
      {
        title: 'Validate before adding to your default agent setup',
        description: 'Compare the top skill against at least one fallback and inspect repository permissions.',
      },
    ],
    faq: [
      {
        question: 'Can Codex use the same skills as Claude Code?',
        answer:
          'Often yes, but the right choice depends on the workflow, install path, and permissions. Use the decision page to validate each skill before adoption.',
      },
      {
        question: 'Why does the guide include browser and GitHub skills?',
        answer:
          'Coding agents become more useful when they can verify UI behavior and inspect repository context, not only write code.',
      },
    ],
    relatedGuideSlugs: ['install-agent-skills-in-codex', 'best-agent-skills-for-claude-code', 'best-agent-skills-for-rag'],
  },
  {
    slug: 'best-agent-skills-for-web-scraping',
    shortTitle: 'Web scraping skills',
    title: 'Best Agent Skills for Web Scraping',
    eyebrow: 'Use-case shortlist',
    description:
      'Compare skills for crawling sites, extracting structured data, converting pages to markdown, and feeding reliable web context into agent workflows.',
    intent: 'best',
    heroPrompt: 'I need my agent to scrape websites, extract structured data, and turn web pages into clean markdown.',
    useCaseSlug: 'web-scraping',
    skillKeywords: ['crawl4ai', 'firecrawl', 'scrapy', 'crawler', 'scrape', 'scraper', 'extract', 'markdown', 'browser'],
    primarySkillSlugs: ['crawl4ai'],
    compareTargetNames: ['Crawl4AI', 'Firecrawl'],
    sections: [
      {
        title: 'What to evaluate in a scraping skill',
        body:
          'Scraping quality is about reliability, output shape, and maintainability. A high-star crawler still needs to prove it can return clean data for your target pages.',
        bullets: [
          'Check whether the skill returns structured fields, markdown, screenshots, or raw HTML.',
          'Prototype against one easy site and one messy real-world site.',
          'Review rate limits, robots policies, and data handling before production use.',
        ],
      },
      {
        title: 'Where the shortlist fits',
        body:
          'Use crawling skills for research agents, RAG ingestion, monitoring workflows, lead enrichment, and any agent that needs fresh web context.',
        bullets: [
          'Use crawler-first skills for multi-page collection.',
          'Use browser automation companions when the site requires interaction.',
          'Use document or RAG companions after extraction when you need indexing.',
        ],
      },
    ],
    steps: [
      {
        title: 'Define the output contract',
        description: 'Decide whether the agent needs markdown, JSON fields, tables, screenshots, or source citations.',
      },
      {
        title: 'Run a messy-page test',
        description: 'Try a real target page with navigation, dynamic content, and imperfect markup.',
      },
      {
        title: 'Add a downstream skill',
        description: 'Pair extraction with RAG, document processing, or data analysis only after the crawler is stable.',
      },
    ],
    faq: [
      {
        question: 'Should I pick Crawl4AI or Firecrawl first?',
        answer:
          'Start with the one that matches your output contract and install constraints. The comparison guide on OpenAgentSkill shows readiness signals and alternatives side by side.',
      },
      {
        question: 'Can these skills feed a RAG system?',
        answer:
          'Yes, but validate the extracted text and metadata before indexing. Clean source content matters more than crawler popularity.',
      },
    ],
    relatedGuideSlugs: ['crawl4ai-vs-firecrawl-for-agents', 'best-agent-skills-for-rag', 'best-agent-skills-for-codex'],
  },
  {
    slug: 'best-agent-skills-for-rag',
    shortTitle: 'RAG skills',
    title: 'Best Agent Skills for RAG and Knowledge Workflows',
    eyebrow: 'Use-case shortlist',
    description:
      'Find skills for document ingestion, retrieval, embeddings, source-grounded answers, and agent workflows that need reliable private knowledge.',
    intent: 'best',
    heroPrompt:
      'I need my agent to build a RAG workflow over documents, retrieve reliable context, and answer with grounded sources.',
    useCaseSlug: 'rag-knowledge',
    skillKeywords: ['rag', 'retrieval', 'embedding', 'vector', 'document', 'pdf', 'knowledge', 'llamaindex', 'langchain'],
    sections: [
      {
        title: 'RAG skills should reduce answer risk',
        body:
          'The point of a RAG skill is not only retrieval. It should help an agent ingest clean material, retrieve relevant context, and keep answers grounded in sources.',
        bullets: [
          'Look for clear ingestion and retrieval behavior.',
          'Prefer skills that make source provenance visible.',
          'Validate chunking and retrieval quality against real documents.',
        ],
      },
      {
        title: 'Pair RAG with upstream preparation',
        body:
          'Many failures happen before retrieval. Web scraping, PDF parsing, OCR, and document cleanup skills often matter as much as the RAG layer.',
        bullets: [
          'Use document processing for messy PDFs and tables.',
          'Use web extraction for public-source knowledge bases.',
          'Use data analysis skills when retrieved context becomes structured metrics.',
        ],
      },
    ],
    steps: [
      {
        title: 'Choose a source corpus',
        description: 'Pick a small but representative set of documents before scaling ingestion.',
      },
      {
        title: 'Measure retrieval quality',
        description: 'Ask known-answer questions and inspect whether the right source material appears.',
      },
      {
        title: 'Add citations or proof points',
        description: 'Require the agent to show the evidence behind each answer before shipping.',
      },
    ],
    faq: [
      {
        question: 'Do I need a separate scraping skill for RAG?',
        answer:
          'If the source material lives on the web, a scraping skill can be the upstream ingestion layer. For private files, document processing may be more important.',
      },
      {
        question: 'What is the first RAG skill to install?',
        answer:
          'Start with a skill that can ingest and retrieve from your actual source format, then add companions for parsing, crawling, or evaluation.',
      },
    ],
    relatedGuideSlugs: ['best-agent-skills-for-web-scraping', 'best-agent-skills-for-codex', 'install-agent-skills-in-codex'],
  },
  {
    slug: 'crawl4ai-vs-firecrawl-for-agents',
    shortTitle: 'Crawl4AI vs Firecrawl',
    title: 'Crawl4AI vs Firecrawl for AI Agents',
    eyebrow: 'Comparison',
    description:
      'A decision-oriented comparison for agent builders choosing between Crawl4AI, Firecrawl, and related web extraction skills.',
    intent: 'compare',
    heroPrompt:
      'Compare Crawl4AI and Firecrawl for an agent that crawls web pages, extracts clean markdown, and feeds a downstream workflow.',
    useCaseSlug: 'web-scraping',
    skillKeywords: ['crawl4ai', 'firecrawl', 'crawler', 'scrape', 'extract', 'markdown', 'web scraping'],
    primarySkillSlugs: ['crawl4ai'],
    compareTargetNames: ['Crawl4AI', 'Firecrawl'],
    sections: [
      {
        title: 'The practical difference to test',
        body:
          'Do not choose by name alone. Test each option against your target pages and score output cleanliness, install friction, latency, and failure recovery.',
        bullets: [
          'Use Crawl4AI-style workflows when you want crawler-oriented agent extraction.',
          'Use Firecrawl-style workflows when the extraction API and output contract fit your stack.',
          'Keep a browser automation fallback for pages that require interaction.',
        ],
      },
      {
        title: 'How to decide',
        body:
          'Pick the tool that produces the best usable downstream context, not the tool with the flashiest demo.',
        bullets: [
          'Run both tools on the same target URLs.',
          'Compare markdown, JSON, metadata, and error handling.',
          'Choose the one your agent can operate repeatably with the least glue code.',
        ],
      },
    ],
    steps: [
      {
        title: 'Test the same URL set',
        description: 'Use a static page, a content-heavy page, and a dynamic page that resembles production.',
      },
      {
        title: 'Score the downstream result',
        description: 'Look at whether the extracted content can be searched, summarized, or indexed without manual cleanup.',
      },
      {
        title: 'Keep one fallback',
        description: 'When web extraction matters, keep a browser automation or alternate crawler skill ready.',
      },
    ],
    faq: [
      {
        question: 'Is Crawl4AI always better for agents?',
        answer:
          'No. It can be a strong candidate, but the right choice depends on your target pages, output format, and integration constraints.',
      },
      {
        question: 'Should I install both Crawl4AI and Firecrawl?',
        answer:
          'Prototype both only if web extraction is a core workflow. For smaller workflows, pick one primary skill and keep the other as a fallback.',
      },
    ],
    relatedGuideSlugs: ['best-agent-skills-for-web-scraping', 'best-agent-skills-for-rag', 'best-agent-skills-for-claude-code'],
  },
  {
    slug: 'install-agent-skills-in-claude-code',
    shortTitle: 'Install in Claude Code',
    title: 'How to Install Agent Skills in Claude Code',
    eyebrow: 'Installation guide',
    description:
      'A practical installation workflow for Claude Code users: choose one skill, copy the install command, run a sandbox task, and review permissions before adopting it.',
    intent: 'install',
    heroPrompt:
      'I want to install one Agent Skill in Claude Code and validate it safely before using it in my default workflow.',
    useCaseSlug: 'coding-agents',
    platformLabel: 'Claude Code',
    platformKeywords: ['claude', 'anthropic', 'code', 'skill', 'skills'],
    skillKeywords: ['claude', 'code', 'repository', 'github', 'review', 'testing', 'browser'],
    sections: [
      {
        title: 'Install one skill at a time',
        body:
          'The safest installation path is narrow: pick one skill, run one task, inspect the output, and only then add it to your normal agent workflow.',
        bullets: [
          'Copy the install command from a skill decision page.',
          'Run the first task in a sandbox repo or low-risk branch.',
          'Review what files, tools, and external services the skill may touch.',
        ],
      },
      {
        title: 'Use installability as a quality signal',
        body:
          'A skill with a clear install path is easier to evaluate. Missing install commands are not automatic dealbreakers, but they add review work.',
        bullets: [
          'Prefer skills with a repository and clear docs.',
          'Check license and maintenance freshness.',
          'Keep notes on what the skill did well and where it failed.',
        ],
      },
    ],
    steps: [
      {
        title: 'Pick the current task',
        description: 'Choose a concrete Claude Code workflow such as PR review, bug triage, or browser verification.',
      },
      {
        title: 'Open the skill decision page',
        description: 'Use the readiness score, risks, proof points, and install command before copying anything.',
      },
      {
        title: 'Run a sandbox validation',
        description: 'Ask the agent to complete one real task, then inspect diffs and logs manually.',
      },
    ],
    faq: [
      {
        question: 'Can I bulk-install many skills at once?',
        answer:
          'You can, but it is harder to debug. For production workflows, install and validate one skill at a time.',
      },
      {
        question: 'What if a skill has no install command?',
        answer:
          'Treat it as a manual-review candidate. Open the repository, inspect the instructions, and avoid production use until the install path is clear.',
      },
    ],
    relatedGuideSlugs: ['best-agent-skills-for-claude-code', 'best-agent-skills-for-codex', 'install-agent-skills-in-codex'],
  },
  {
    slug: 'install-agent-skills-in-codex',
    shortTitle: 'Install in Codex',
    title: 'How to Install Agent Skills in Codex',
    eyebrow: 'Installation guide',
    description:
      'A step-by-step workflow for adding install-ready skills to a Codex-style agent setup while keeping validation, permissions, and rollback in mind.',
    intent: 'install',
    heroPrompt:
      'I want to install an Agent Skill in Codex, test it on a real repository task, and decide whether it belongs in my workflow.',
    useCaseSlug: 'coding-agents',
    platformLabel: 'Codex',
    platformKeywords: ['codex', 'openai', 'gpt', 'agent', 'repository', 'code'],
    skillKeywords: ['codex', 'openai', 'github', 'repository', 'review', 'testing', 'debug', 'browser'],
    sections: [
      {
        title: 'Install with a rollback mindset',
        body:
          'Codex skills should be treated like workflow dependencies. Install them in a branch or sandbox, run a task, and keep a fallback path if the result is not reliable.',
        bullets: [
          'Start from the OpenAgentSkill decision page.',
          'Use a narrow task with a clear expected result.',
          'Compare against manual work or one alternative skill.',
        ],
      },
      {
        title: 'What to verify',
        body:
          'A skill is ready when it improves a repeatable loop without adding unclear permissions, brittle setup, or noisy output.',
        bullets: [
          'Check repository freshness and quality score.',
          'Inspect generated code, tests, and browser checks.',
          'Document when the skill should and should not be used.',
        ],
      },
    ],
    steps: [
      {
        title: 'Generate a shortlist',
        description: 'Use the recommendation API with the task prompt from this guide.',
      },
      {
        title: 'Copy the install command',
        description: 'Install the top candidate only after reading the risks and proof points.',
      },
      {
        title: 'Run one complete task',
        description: 'Ask Codex to implement, verify, and explain the change before adding the skill to defaults.',
      },
    ],
    faq: [
      {
        question: 'Do Codex skills need to be code-only?',
        answer:
          'No. Browser automation, GitHub workflow, document, and data-analysis skills can all help a coding agent complete work end to end.',
      },
      {
        question: 'How do I know a skill is safe enough?',
        answer:
          'There is no automatic guarantee. Use readiness signals as a filter, then review permissions, repository health, and output quality yourself.',
      },
    ],
    relatedGuideSlugs: ['best-agent-skills-for-codex', 'best-agent-skills-for-claude-code', 'install-agent-skills-in-claude-code'],
  },
  {
    slug: 'best-codex-skills-for-finance-analysis',
    shortTitle: 'Codex finance skills',
    title: 'Best Codex Skills for Finance Analysis',
    eyebrow: 'Finance shortlist',
    description:
      'A real-skill shortlist for Codex users who want market research, stock news analysis, filings review, portfolio checks, and quant workflows with audit and trust signals.',
    intent: 'best',
    heroPrompt:
      'I need Codex skills to analyze stock news, market data, SEC filings, portfolio risk, and finance research sources.',
    useCaseSlug: 'finance-quant',
    platformLabel: 'Codex',
    platformKeywords: ['codex', 'openai', 'agent', 'finance', 'stock', 'market', 'analysis'],
    skillKeywords: ['finance', 'stock', 'market', 'news', 'sec', 'filings', 'portfolio', 'quant', 'risk', 'trading', 'codex'],
    sections: [
      {
        title: 'Finance skills need source discipline',
        body:
          'A useful finance skill should help a coding agent gather evidence, separate facts from interpretation, and make assumptions visible before producing analysis.',
        bullets: [
          'Prefer skills that cite public sources, filings, market data, or input datasets.',
          'Treat outputs as research support, not financial advice.',
          'Use audit notes to check network access, dependency risk, and maintenance freshness.',
        ],
      },
      {
        title: 'Where Codex creates leverage',
        body:
          'Codex can pair finance analysis with reproducible code: scrape source data, clean CSVs, build notebooks, compare tickers, and generate a reviewed summary.',
        bullets: [
          'Use data and research skills for stock news workflows.',
          'Use document skills for filings and PDFs.',
          'Use security and dependency checks before installing data-fetching tools.',
        ],
      },
    ],
    steps: [
      {
        title: 'Start with the finance task',
        description: 'Use a concrete task such as analyze stock news, summarize an earnings release, or compare portfolio risk.',
      },
      {
        title: 'Inspect trust and audit first',
        description: 'Check license, recent maintenance, README/SKILL.md completeness, dependency risk, and installability.',
      },
      {
        title: 'Run one reproducible analysis',
        description: 'Ask Codex to show sources, assumptions, data transformations, and a concise risk summary.',
      },
    ],
    faq: [
      {
        question: 'Can Codex finance skills give investment advice?',
        answer:
          'No. Treat these as research and workflow automation skills. Human review is required before any financial decision.',
      },
      {
        question: 'What should I install first?',
        answer:
          'Start with a research or data-analysis skill that can cite sources and produce reproducible outputs, then add filing or portfolio-specific skills as needed.',
      },
    ],
    relatedGuideSlugs: ['best-agent-skills-for-codex', 'best-agent-skills-for-rag', 'install-agent-skills-in-codex'],
  },
  {
    slug: 'claude-code-skills-for-pdf-parsing',
    shortTitle: 'Claude Code PDF skills',
    title: 'Claude Code Skills for PDF Parsing',
    eyebrow: 'Document shortlist',
    description:
      'A practical guide to PDF parsing skills for Claude Code users: extract tables, convert PDFs to markdown, prepare documents for RAG, and review audit risk before installing.',
    intent: 'best',
    heroPrompt:
      'I need Claude Code skills to parse PDFs, extract tables, convert documents to markdown, and prepare files for RAG.',
    useCaseSlug: 'document-processing',
    platformLabel: 'Claude Code',
    platformKeywords: ['claude', 'anthropic', 'code', 'pdf', 'document', 'markdown'],
    skillKeywords: ['pdf', 'document', 'ocr', 'table extraction', 'markdown', 'rag', 'parse', 'parser', 'claude'],
    sections: [
      {
        title: 'PDF parsing is an accuracy problem',
        body:
          'The best PDF skills do not just extract text. They preserve layout, headings, tables, metadata, and uncertainty so an agent can reason over the document safely.',
        bullets: [
          'Check whether tables, scanned pages, and headings survive conversion.',
          'Prefer skills that surface OCR or layout uncertainty.',
          'Use source-preserving output when the next step is RAG or legal/finance review.',
        ],
      },
      {
        title: 'How Claude Code should use these skills',
        body:
          'Install one document skill, run it against a representative PDF, inspect output quality, then pair it with RAG or data-analysis only after extraction works.',
        bullets: [
          'Use a sandbox folder with non-sensitive sample files first.',
          'Review dependency risk for OCR, native binaries, or external services.',
          'Keep human review for legal, medical, finance, or compliance documents.',
        ],
      },
    ],
    steps: [
      {
        title: 'Choose a representative PDF',
        description: 'Test one simple PDF and one messy real document with tables, scans, or long sections.',
      },
      {
        title: 'Compare extraction output',
        description: 'Look for table quality, markdown structure, source traceability, and visible failure modes.',
      },
      {
        title: 'Add a downstream skill only after parsing works',
        description: 'RAG, data analysis, or legal review skills should consume clean extracted content, not raw broken text.',
      },
    ],
    faq: [
      {
        question: 'Can Claude Code parse PDFs by itself?',
        answer:
          'It can reason over provided context, but a dedicated skill can make extraction, table handling, OCR, and repeatable conversion more reliable.',
      },
      {
        question: 'What is the biggest PDF skill risk?',
        answer:
          'Silent extraction errors. Good workflows expose missing text, OCR uncertainty, table failures, and document privacy boundaries.',
      },
    ],
    relatedGuideSlugs: ['best-agent-skills-for-claude-code', 'best-agent-skills-for-rag', 'install-agent-skills-in-claude-code'],
  },
  {
    slug: 'agentskills-io-compatible-skills-marketplace',
    shortTitle: 'AgentSkills.io alternative',
    title: 'AgentSkills.io-Compatible Agent Skills Marketplace',
    eyebrow: 'Ecosystem guide',
    description:
      'Use OpenAgentSkill as a practical discovery layer for the Agent Skills ecosystem: compare install-ready skills, review quality signals, and find alternatives for Claude Code, Codex, and agent workflows.',
    intent: 'standard',
    heroPrompt:
      'I need an Agent Skills marketplace that helps me discover, compare, and install practical skills across Claude Code, Codex, and open agent workflows.',
    skillKeywords: ['agent skill', 'skills', 'claude', 'codex', 'openai', 'automation', 'workflow', 'github', 'marketplace'],
    sections: [
      {
        title: 'What OpenAgentSkill adds',
        body:
          'OpenAgentSkill is designed as an application layer around discovery and decisions. It helps builders move from a task to a ranked shortlist instead of browsing a flat list.',
        bullets: [
          'Search by job-to-be-done, not only by skill name.',
          'Use quality, freshness, GitHub stars, and installability as decision signals.',
          'Open decision pages that show risks, implementation paths, and alternatives.',
        ],
      },
      {
        title: 'How to compare marketplaces',
        body:
          'A skills marketplace is useful when it helps users install the right thing faster. Traffic matters, but decision quality, SEO coverage, and repeatable workflows create durable value.',
        bullets: [
          'Check whether searchers can land on use-case, install, and comparison pages.',
          'Check whether each skill has enough context to make an adoption decision.',
          'Check whether agents can consume the marketplace through an API.',
        ],
      },
    ],
    steps: [
      {
        title: 'Start with a use case',
        description: 'Search for the workflow you need, such as web scraping, RAG, coding agents, or browser automation.',
      },
      {
        title: 'Open the decision page',
        description: 'Review readiness, proof points, risks, install command, and alternatives.',
      },
      {
        title: 'Install and validate',
        description: 'Use one skill first, then build a small stack only after the primary workflow works.',
      },
    ],
    faq: [
      {
        question: 'Is OpenAgentSkill an official AgentSkills.io integration?',
        answer:
          'No. OpenAgentSkill is an independent discovery and decision layer for the broader Agent Skills ecosystem.',
      },
      {
        question: 'Why include AgentSkills.io in this guide?',
        answer:
          'Many users search for Agent Skills through that phrase. This page helps those users find practical, install-ready alternatives and comparisons.',
      },
    ],
    relatedGuideSlugs: ['best-agent-skills-for-claude-code', 'best-agent-skills-for-codex', 'best-agent-skills-for-web-scraping'],
  },
]

export const FEATURED_GROWTH_GUIDES = [
  GROWTH_GUIDES.find((guide) => guide.slug === 'best-agent-skills-for-web-scraping'),
  GROWTH_GUIDES.find((guide) => guide.slug === 'best-agent-skills-for-claude-code'),
  GROWTH_GUIDES.find((guide) => guide.slug === 'crawl4ai-vs-firecrawl-for-agents'),
].filter((guide): guide is GrowthGuideDefinition => Boolean(guide))

export function getGrowthGuideBySlug(slug: string) {
  return GROWTH_GUIDES.find((guide) => guide.slug === slug)
}

export function getRelatedGrowthGuides(guide: GrowthGuideDefinition) {
  return guide.relatedGuideSlugs
    .map((slug) => getGrowthGuideBySlug(slug))
    .filter((related): related is GrowthGuideDefinition => Boolean(related))
}
