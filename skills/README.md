# OpenAgentSkill Curated Skill Index

This directory keeps a small, GitHub-readable index of high-signal AI agent skills and skill-adjacent tools by domain.

It is intentionally not a vendored code mirror. Source code stays with the upstream author. OpenAgentSkill stores discovery metadata, install hints, trust signals, and links back to canonical repositories and public skill pages.

## Why This Lives On GitHub

- Developers can scan real examples before visiting the website.
- GitHub search can discover OpenAgentSkill by domain keywords.
- Skill authors can see what a good listing looks like.
- Agents can read a simple domain map before calling the live API.

## Selection Rules

- Prefer maintained, high-star, useful repositories.
- Prefer clear README or SKILL.md context.
- Prefer installable workflows with obvious agent use cases.
- Exclude MCP-only repositories from this curated skill index.
- Treat Trust Score as a shortlist signal, not a security guarantee.
- Review source code before running any third-party skill with secrets or private data.

## Domains

| Domain | GitHub index | Live discovery |
| --- | --- | --- |
| Application scenarios | [scenarios.md](./scenarios.md) | [Resolve API](https://www.openagentskill.com/resolve) |
| Coding agents | [coding.md](./coding.md) | [OpenAgentSkill coding agents](https://www.openagentskill.com/ai-agent-skills/coding-agents) |
| Web scraping | [web-scraping.md](./web-scraping.md) | [OpenAgentSkill web scraping](https://www.openagentskill.com/ai-agent-skills/web-scraping) |
| Browser automation | [browser-automation.md](./browser-automation.md) | [OpenAgentSkill browser automation](https://www.openagentskill.com/ai-agent-skills/browser-automation) |
| Finance and quant | [finance.md](./finance.md) | [OpenAgentSkill finance](https://www.openagentskill.com/ai-agent-skills/finance-quant) |
| Research | [research.md](./research.md) | [OpenAgentSkill research](https://www.openagentskill.com/use-cases/research-agents) |
| RAG and knowledge | [rag-knowledge.md](./rag-knowledge.md) | [OpenAgentSkill RAG](https://www.openagentskill.com/ai-agent-skills/rag-knowledge) |
| Document and PDF processing | [documents-pdf.md](./documents-pdf.md) | [OpenAgentSkill PDF parsing](https://www.openagentskill.com/best/pdf-parsing) |
| Data analysis | [data.md](./data.md) | [OpenAgentSkill data](https://www.openagentskill.com/ai-agent-skills/data-analysis) |
| Design and creative | [design.md](./design.md) | [OpenAgentSkill design](https://www.openagentskill.com/skill-packs/design-agent-pack) |
| Marketing and growth | [marketing.md](./marketing.md) | [OpenAgentSkill growth](https://www.openagentskill.com/skill-packs/seo-automation-agent-pack) |
| DevOps and infrastructure | [devops-infrastructure.md](./devops-infrastructure.md) | [OpenAgentSkill DevOps](https://www.openagentskill.com/skills?q=devops) |
| Security | [security.md](./security.md) | [OpenAgentSkill safety](https://www.openagentskill.com/safety) |
| Customer support | [customer-support.md](./customer-support.md) | [OpenAgentSkill support](https://www.openagentskill.com/skills?q=customer%20support) |
| Commerce | [commerce.md](./commerce.md) | [OpenAgentSkill commerce](https://www.openagentskill.com/skills?q=ecommerce) |
| Productivity | [productivity.md](./productivity.md) | [OpenAgentSkill productivity](https://www.openagentskill.com/skills?q=productivity) |
| Legal, privacy, and compliance | [legal-compliance.md](./legal-compliance.md) | [OpenAgentSkill safety](https://www.openagentskill.com/safety) |
| Education | [education.md](./education.md) | [OpenAgentSkill education](https://www.openagentskill.com/skills?q=education) |
| Web3 and crypto | [web3-crypto.md](./web3-crypto.md) | [OpenAgentSkill Web3](https://www.openagentskill.com/skills?q=web3) |
| ML and media | [ml-media.md](./ml-media.md) | [OpenAgentSkill ML](https://www.openagentskill.com/skills?q=machine%20learning) |
| Football and World Cup analytics | [football-world-cup.md](./football-world-cup.md) | [OpenAgentSkill football analytics](https://www.openagentskill.com/ai-agent-skills/world-cup-football) |

## Application Scenarios

If you know the job but not the domain, start here:

| Agent job | Scenario map |
| --- | --- |
| Scrape competitor pricing | [scenarios.md#scrape-competitor-pricing](./scenarios.md#scrape-competitor-pricing) |
| Analyze stock news | [scenarios.md#analyze-stock-news](./scenarios.md#analyze-stock-news) |
| Parse PDFs into markdown or JSON | [scenarios.md#parse-pdfs-into-markdown-or-json](./scenarios.md#parse-pdfs-into-markdown-or-json) |
| Build a RAG knowledge base | [scenarios.md#build-a-rag-knowledge-base](./scenarios.md#build-a-rag-knowledge-base) |
| Review a pull request or fix CI | [scenarios.md#review-a-pull-request-or-fix-ci](./scenarios.md#review-a-pull-request-or-fix-ci) |
| Automate a browser workflow | [scenarios.md#automate-a-browser-workflow](./scenarios.md#automate-a-browser-workflow) |
| Launch SEO and growth pages | [scenarios.md#launch-seo-and-growth-pages](./scenarios.md#launch-seo-and-growth-pages) |
| Build a World Cup dashboard | [scenarios.md#build-a-world-cup-dashboard](./scenarios.md#build-a-world-cup-dashboard) |

## Agent Flow

For live recommendations, call the API instead of relying only on this static index:

```bash
curl "https://www.openagentskill.com/api/agent/resolve?task=analyze+stock+news&agent=codex&max_risk=medium&format=text"
```

Search a domain:

```bash
curl "https://www.openagentskill.com/api/agent/skills?q=finance&limit=8&format=json"
```

Report whether a skill worked:

```bash
curl -X POST "https://www.openagentskill.com/api/agent/outcome" \
  -H "content-type: application/json" \
  -d '{"skill_slug":"openbb-finance-openbb","task":"analyze stock news","agent":"codex","outcome":"success","install_used":true}'
```

## Add Or Fix A Skill

- Submit a new skill: <https://www.openagentskill.com/submit>
- Open a GitHub issue: <https://github.com/Leon-Drq/openagentskill/issues/new?template=skill_submission.md>
- Add badges to your upstream README after a listing exists:

```md
[![OpenAgentSkill Trust](https://www.openagentskill.com/api/badge/YOUR-SLUG?metric=trust&label=Trust)](https://www.openagentskill.com/skills/YOUR-SLUG)
[![OpenAgentSkill Audit](https://www.openagentskill.com/api/badge/YOUR-SLUG?metric=audit&label=Audit)](https://www.openagentskill.com/skills/YOUR-SLUG/audit)
```
