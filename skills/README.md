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
| Coding agents | [coding.md](./coding.md) | [OpenAgentSkill coding agents](https://www.openagentskill.com/ai-agent-skills/coding-agents) |
| Web scraping | [web-scraping.md](./web-scraping.md) | [OpenAgentSkill web scraping](https://www.openagentskill.com/ai-agent-skills/web-scraping) |
| Finance and quant | [finance.md](./finance.md) | [OpenAgentSkill finance](https://www.openagentskill.com/ai-agent-skills/finance-quant) |
| Research | [research.md](./research.md) | [OpenAgentSkill research](https://www.openagentskill.com/use-cases/research-agents) |
| Data analysis | [data.md](./data.md) | [OpenAgentSkill data](https://www.openagentskill.com/ai-agent-skills/data-analysis) |
| Design and creative | [design.md](./design.md) | [OpenAgentSkill design](https://www.openagentskill.com/skill-packs/design-agent-pack) |
| Marketing and growth | [marketing.md](./marketing.md) | [OpenAgentSkill growth](https://www.openagentskill.com/skill-packs/seo-automation-agent-pack) |
| Legal, privacy, and compliance | [legal-compliance.md](./legal-compliance.md) | [OpenAgentSkill safety](https://www.openagentskill.com/safety) |
| Education | [education.md](./education.md) | [OpenAgentSkill education](https://www.openagentskill.com/skills?q=education) |
| Football and World Cup analytics | [football-world-cup.md](./football-world-cup.md) | [OpenAgentSkill football analytics](https://www.openagentskill.com/ai-agent-skills/world-cup-football) |

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
