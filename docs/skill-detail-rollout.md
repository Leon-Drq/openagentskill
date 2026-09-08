# Skill detail experience v2

## Scope

- Preserve every detail URL, alias redirect, canonical, index eligibility function and current search title/description. No database migrations or review-state edits.
- Replace repeated decision/audit/score panels with a source-led hero, attributed Gallery examples, the original full description, a single usage section, source/trust summary, Agent endpoints, relevant alternatives and creator tools.
- Keep important review warnings visible beside the usage control; only supplementary machine JSON and creator badges use native disclosure controls. Core content remains server-rendered.
- Reuse existing brand typography (Georgia display, Inter body, Geist Mono utility), background #F8F7F3, ink #1d1b18, green #006b4f, border #e4e0d8 and amber warnings. No new animation, font or media service dependencies.
- Eight-language UI copy; repository prose and executable agent prompts retain their original language. Prompts are suggested handoffs, not compatibility certificates.

## Evidence and API compatibility

`getSkillSourceEvidence` is shared by page, targets, handoff, registry, supply, trust and safety presentation. It recognizes a recorded SKILL.md path from source provenance or the existing discovery review metadata. This is recorded evidence, not a fresh GitHub check and not a security or execution certificate.

Missing evidence does not prove the repository is not a skill. Legacy entries remain accessible and retain SEO policy. They now get read-only source-review prompts instead of automatic commands. Changed/error synchronization states also require review. A stored command alone, stars, the default version or a README hash cannot establish source eligibility.

API routes and response shapes remain available. `source_evidence` is additive. `recommended_command`/`install.command` may now be an empty string, `ready` false and automatic-install permission false when source evidence is missing. Consumers must follow these flags rather than blindly execute a fallback. Review prompts never request install-success receipts and copies of those prompts are not install-copy events. Existing review and owner-publication gates cannot be bypassed by source discovery.

Historical database scores are not rewritten. Existing audit formulas are unchanged; computed trust policy/readiness can become more conservative when source evidence is absent. Full audit and eval reports remain at existing routes.

## Structured data

One detail entity plus breadcrumbs: SoftwareSourceCode for recorded instructions, CreativeWork for an unverified listing. No invented free Offer, operating system, default software version or user rating. Dates refer to registry publication/update, clearly separated from the repository push date in visible UI. JSON embedded in HTML escapes `<` and line separators.

## Verification and rollout

1. `pnpm test:skill-detail` covers evidence, owner review, API/page gates, absent commands, source changes, JSON escaping, schema, relevance, 8 locales and retained SEO contracts.
2. `pnpm test`, typecheck, lint, repository link check and production build.
3. `pnpm check:skill-detail <origin> [baseline.json]` compares five representative detail pages and API source states; checks all eight language preferences. Baseline snapshots capture title, canonical, robots and HTML bytes before deploying.
4. Browser checks at 320/390/768/1440 px: long title, visual example, unverified source, section navigation, target switching and review-copy behavior. No repository code is executed or verification outcome fabricated.
5. GitHub PR checks, merge to main via the existing Vercel integration, then repeat production smoke and browser checks.

No claim of zero SEO volatility: there is no first-party Search Console baseline in this task. Keep URL/index policy unchanged; observe 28-day non-brand clicks, impressions and affected-page cohorts before further title changes. HTML size reductions are not a measured Core Web Vitals improvement. Persistent source-data backfill and GSC measurement are follow-up work, not a claim of completed runtime verification.
