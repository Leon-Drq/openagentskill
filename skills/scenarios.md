# Application Scenario Map

Start here when you know what your agent needs to do, but not which skill or domain to search.

Each scenario lists a small shortlist plus the live Resolve API query to get a current recommendation.

## Scrape Competitor Pricing

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| Crawl4AI | LLM-friendly crawling and markdown extraction | [profile](https://www.openagentskill.com/skills/crawl4ai) |
| Firecrawl | Website-to-markdown or structured-data extraction | [profile](https://www.openagentskill.com/skills/firecrawl) |
| Scrapling | Adaptive scraping for changing pages | [profile](https://www.openagentskill.com/skills/d4vinci-scrapling) |
| changedetection.io | Repeated monitoring and alerting for page changes | [profile](https://www.openagentskill.com/skills/dgtlmoon-changedetection-io) |
| Crawlee | JS/TS crawler with browser automation options | [profile](https://www.openagentskill.com/skills/apify-crawlee) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=scrape+competitor+pricing&agent=codex&max_risk=medium&format=text"
```

## Analyze Stock News

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| OpenBB | Financial data and investment research workflows | [profile](https://www.openagentskill.com/skills/openbb-finance-openbb) |
| yfinance | Fast market-data download and analysis | [profile](https://www.openagentskill.com/skills/ranaroussi-yfinance) |
| FinGPT | Financial LLM research workflows | [profile](https://www.openagentskill.com/skills/ai4finance-foundation-fingpt) |
| Last30days Skill | Recent cross-source research before market decisions | [profile](https://www.openagentskill.com/skills/mvanhorn-last30days-skill) |
| TradingAgents | Multi-agent financial trading research | [profile](https://www.openagentskill.com/skills/tauricresearch-tradingagents) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=analyze+stock+news&agent=codex&max_risk=medium&format=text"
```

## Parse PDFs Into Markdown Or JSON

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| Docling | Prepare documents for gen AI workflows | [profile](https://www.openagentskill.com/skills/docling-project-docling) |
| PaddleOCR | OCR and document structure extraction | [profile](https://www.openagentskill.com/skills/paddlepaddle-paddleocr) |
| OCRmyPDF | Add searchable text layers to scanned PDFs | [profile](https://www.openagentskill.com/skills/ocrmypdf-ocrmypdf) |
| Stirling PDF | Broad PDF editing and transformation workflows | [profile](https://www.openagentskill.com/skills/stirling-tools-stirling-pdf) |
| OpenDataLoader PDF | AI-ready PDF parsing pipeline | [profile](https://www.openagentskill.com/skills/opendataloader-project-opendataloader-pdf) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=parse+PDFs+into+markdown+and+JSON&agent=codex&max_risk=medium&format=text"
```

## Build A RAG Knowledge Base

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| LightRAG | Retrieval-augmented generation framework | [profile](https://www.openagentskill.com/skills/hkuds-lightrag) |
| RAG Techniques | Advanced RAG patterns and examples | [profile](https://www.openagentskill.com/skills/nirdiamant-rag-techniques) |
| Graphify | Turn code, SQL, and docs into knowledge graphs | [profile](https://www.openagentskill.com/skills/safishamsi-graphify) |
| Understand Anything | Interactive knowledge graphs for code and documents | [profile](https://www.openagentskill.com/skills/egonex-ai-understand-anything) |
| Dgraph | Graph database for retrieval-heavy workflows | [profile](https://www.openagentskill.com/skills/dgraph-io-dgraph) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=build+a+RAG+knowledge+base&agent=codex&max_risk=medium&format=text"
```

## Review A Pull Request Or Fix CI

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| Agent Skills | Production-grade engineering workflows for coding agents | [profile](https://www.openagentskill.com/skills/addyosmani-agent-skills) |
| David Ondrej Skills | Agent orchestration, skill authoring, research, docs, and ops workflows for practical coding agents | [profile](https://www.openagentskill.com/skills/davidondrej-skills) |
| Planning With Files | Durable planning for long-running code work | [profile](https://www.openagentskill.com/skills/othmanadi-planning-with-files) |
| Agentmemory | Persistent coding-agent memory | [profile](https://www.openagentskill.com/skills/rohitg00-agentmemory) |
| Beads | Memory and operating context for coding agents | [profile](https://www.openagentskill.com/skills/gastownhall-beads) |
| Cmux | Multi-tab terminal workspace for coding agents | [profile](https://www.openagentskill.com/skills/manaflow-ai-cmux) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=review+a+pull+request+and+fix+CI&agent=codex&max_risk=medium&format=text"
```

## Automate A Browser Workflow

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| Browser Use | Natural-language browser interaction for agents | [profile](https://www.openagentskill.com/skills/browser-use) |
| Stagehand | Browser agents with natural-language actions | [profile](https://www.openagentskill.com/skills/browserbase-stagehand) |
| Skyvern | Automate browser workflows with AI agents | [profile](https://www.openagentskill.com/skills/skyvern-ai-skyvern) |
| Crawlee | Browser automation and crawling for JS/TS agents | [profile](https://www.openagentskill.com/skills/apify-crawlee) |
| Lightpanda Browser | Headless browser designed for automation | [profile](https://www.openagentskill.com/skills/lightpanda-io-browser) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=automate+a+browser+workflow&agent=codex&max_risk=medium&format=text"
```

## Launch SEO And Growth Pages

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| Aaron Marketing Skills | Full-stack marketing skill library for SEO/GEO, influencer, ads, email, launch, social, and brand narrative workflows | [profile](https://www.openagentskill.com/skills/aaron-he-zhu-aaron-marketing-skills) |
| MarketingSkills | CRO, copywriting, SEO, analytics, and growth engineering | [profile](https://www.openagentskill.com/skills/coreyhaines31-marketingskills) |
| PostHog | Product analytics and growth experimentation | [profile](https://www.openagentskill.com/skills/posthog-posthog) |
| Umami | Privacy-focused analytics | [profile](https://www.openagentskill.com/skills/umami-software-umami) |
| Plausible Analytics | Lightweight privacy-first analytics | [profile](https://www.openagentskill.com/skills/plausible-analytics) |
| HEAD | HTML head and metadata reference | [profile](https://www.openagentskill.com/skills/joshbuchea-head) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=launch+SEO+and+growth+pages&agent=codex&max_risk=medium&format=text"
```

## Build A Customer Support Agent

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| Chatwoot | Open-source omnichannel support desk | [profile](https://www.openagentskill.com/skills/chatwoot-chatwoot) |
| Twenty | CRM workflows designed for AI | [profile](https://www.openagentskill.com/skills/twentyhq-twenty) |
| Python Telegram Bot | Telegram support and bot workflows | [profile](https://www.openagentskill.com/skills/python-telegram-bot-python-telegram-bot) |
| PHPMailer | Email sending workflows | [profile](https://www.openagentskill.com/skills/phpmailer-phpmailer) |
| CosyVoice | Voice generation for support experiences | [profile](https://www.openagentskill.com/skills/funaudiollm-cosyvoice) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=build+a+customer+support+agent&agent=codex&max_risk=medium&format=text"
```

## Create A Design Prototype

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| Open Design | Local-first design workflows and skill packs | [profile](https://www.openagentskill.com/skills/nexu-io-open-design) |
| Huashu Design | HTML-native prototype and slide skill | [profile](https://www.openagentskill.com/skills/alchaincyf-huashu-design) |
| Onlook | Visual React app editing with AI | [profile](https://www.openagentskill.com/skills/onlook-dev-onlook) |
| Material UI | Production React component system | [profile](https://www.openagentskill.com/skills/mui-material-ui) |
| Graphite | 2D graphics and procedural visuals | [profile](https://www.openagentskill.com/skills/graphiteeditor-graphite) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=create+a+design+prototype&agent=codex&max_risk=medium&format=text"
```

## Build A World Cup Dashboard

| Recommended skill | Why it fits | Link |
| --- | --- | --- |
| StatsBomb Open Data | Public football event data for xG and match analysis | [profile](https://www.openagentskill.com/skills/statsbomb-open-data) |
| mplsoccer | Football pitch plotting and match visuals | [profile](https://www.openagentskill.com/skills/mplsoccer) |
| soccerdata | Scrape FBref, Club Elo, ESPN, Sofascore, Understat, and more | [search](https://www.openagentskill.com/skills?q=soccerdata) |
| socceraction | Value player actions from event streams | [search](https://www.openagentskill.com/skills?q=socceraction) |
| D3 | Web visualizations for public dashboards | [profile](https://www.openagentskill.com/skills/d3-d3) |
| Grafana | Operational dashboards over time-series data | [profile](https://www.openagentskill.com/skills/grafana-grafana) |

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=build+a+World+Cup+football+analytics+dashboard&agent=codex&max_risk=medium&format=text"
```
