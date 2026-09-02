# Growth execution system

OpenAgentSkill's growth loop is **discover → claim → synchronize → share → install → outcome**. Catalog size is an input, not the north-star metric. The product should optimize for verified successful installs and creator-generated distribution.

## Production readiness

`GET /api/agent/growth-readiness` reports boolean configuration health without exposing credentials. `ready` covers the core measurement and fallback-sync path; `full_ready` also covers optional GitHub App and X distribution integrations. A fully configured production environment needs:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 web stream ID.
- `NEXT_PUBLIC_GITHUB_OAUTH_ENABLED=true` — Supabase GitHub OAuth is also enabled.
- `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL` — repository-scoped GitHub App installation page.
- `GITHUB_WEBHOOK_SECRET` — dedicated push webhook signing secret.
- `CRON_SECRET` and `INDEXER_SECRET` — six-hour source-sync fallback.
- `X_CLIENT_ID` and `X_CLIENT_SECRET` — optional distribution automation.

Never commit the corresponding secrets. Configure them in Vercel and the external provider dashboards.

## GA4 funnel

The client emits these events after analytics consent:

| Stage | Event |
| --- | --- |
| Creator intent | `skill_claim_start` |
| Identity | `creator_github_connect_start`, `creator_github_connected` |
| Ownership | `skill_claim_submit`, `skill_claim_verified` |
| Activation | `creator_profile_published` |
| Distribution | `creator_badge_copy`, `creator_share_open`, `skill_share_copy` |
| Product value | `skill_install_start`, `install_success`, `outcome_success` |

Mark `skill_claim_verified`, `creator_badge_copy`, `install_success`, and `outcome_success` as GA4 key events. Register `skill_slug`, `placement`, `platform`, `kind`, and `verification_method` as event-scoped custom dimensions when reporting needs them.

## Ownership and indexing policy

A verified repository claim sets `publisher_verified=true`. Verified ownership may replace the three-star popularity floor, but never the AI approval or quality-score floor. This lets legitimate new creators become discoverable without turning Claim into a quality bypass.

GitHub is the ownership identity. X is optional public attribution and distribution identity; a self-reported X handle never verifies repository ownership.

## GitHub App and source synchronization

Configure the GitHub App or repository webhook with:

- Payload URL: `https://www.openagentskill.com/api/webhooks/github`
- Content type: `application/json`
- Event: push
- Secret: the same value as `GITHUB_WEBHOOK_SECRET`
- Repository permissions: metadata read and contents read only

Pushes that touch `SKILL.md` are signature-verified and scheduled for source synchronization after the webhook response. Other file changes are ignored. The existing six-hour claimed-repository scan remains the recovery path for missed webhooks.

## 30-day operating targets

1. Invite the top 100 unclaimed, recently active creators as a manually reviewed cohort.
2. Reach at least 40% completion from Claim start to verified ownership.
3. Reach at least 30% share-kit use and 20% README badge adoption among verified creators.
4. Keep candidate publication near 1,000/day until the ready backlog is below three days.
5. Index only pages with original platform value: provenance, audit, license, compatibility, version history, install evidence, or outcomes.

Review the funnel weekly by acquisition source, landing page, skill, and creator cohort. Scale outreach only after the first cohort proves that Claim and sharing convert.

The authenticated `GET /api/creator-outreach/batch?limit=100` route produces a recent, high-quality, unclaimed creator cohort with draft-only messages. It never sends mail, opens repository issues, or publishes X replies. Review the cohort manually before contact.
