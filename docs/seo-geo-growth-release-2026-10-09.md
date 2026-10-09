# Search growth release — 2026-10-09

This release improves existing search destinations and measures whether visitors
begin using a skill. The `/skills` directory renderer, card layout, filters,
navigation and styles are unchanged. No publication, review or index eligibility
is upgraded by editorial copy.

## Changes

- Source-bound English overviews and task-specific search metadata for 17 existing
  skill destinations: Archify, Holo Card Studio, Vox Director, seven presentation
  workflows and seven design/implementation/video workflows. Each overview links
  its source revision and explains requirements and limits. Other languages retain
  their existing content. Source text, examples and install safeguards remain.
- Two existing PPT guides gain practical briefs, sample-slide checks and export
  troubleshooting. Editorial modification dates are separate from source-check dates.
- The design/creative ranking explains output selection and evidence types.
  Tracking parameters retain the canonical ranking's indexing behavior.
- Published submission receipts explain the distinction between a public listing
  and indexing by Google or AI search, in all eight supported languages.
- A `partner_outbound` event measures existing homepage Skillry referrals without
  changing the placement or interpreting clicks as sales.

## Measurement contract

Events are sent after analytics consent. Declining or withdrawing consent clears
the new attribution record and stops application analytics events. A session keeps
bounded channel labels and a public landing path in sessionStorage for 30 minutes
of inactivity. Blocked storage falls back to memory. There is no new user ID or
fingerprinting. Queries, fragments, receipt tokens and raw referrer URLs are not
stored in the new attribution record or application page-view payload.

Register these event-scoped GA4 dimensions for reporting:

| Dimension | Meaning |
| --- | --- |
| `acquisition_source` | Recognized search/AI source, campaign, referral or direct |
| `acquisition_channel` | ai_search, organic_search, campaign, referral or direct |
| `landing_path` | Public entry pathname, without query or fragment |
| `page_type` | home, directory, skill_detail, topic, guide, example or other |
| `activation_action` | Action that produced the first activation in a tab session |
| `partner`, `placement` | Partner referral context |

`growth_activation` is emitted once per tab session after an install-copy/start
or successful example task/handoff copy. A localized install copy is recorded only
after clipboard success. Copying a resolver API URL or receipt does not activate.
This event represents usage intent, never successful installation or task execution.
Use GA4 user counts for deduplicated people; tab-session event counts are not UV.

Create a channel → landing page → activation exploration and mark
`growth_activation` as a key event if it is the chosen acquisition KPI. GA4 account
configuration is separate from deployed instrumentation. This release does not
claim historical attribution backfill, revenue, new runtime certifications or
future search growth. AI referrer attribution is best effort; a missing referrer
does not prove the visitor came directly.

## GEO observation protocol

Track Google Search Console network-search clicks separately from the account's
AI-feature report and identifiable AI referrals. Their impression totals may
overlap. Reuse fixed task prompts, record engine/model, language, region and date,
and distinguish a brand mention from a clickable citation. A sample citation rate
is not market share and does not guarantee traffic.

Initial question groups: editable PPTX versus image slides; Codex slide setup;
PowerPoint export differences; reference-image reconstruction; architecture versus
sequence diagrams; Mermaid conversion; holographic cards; Figma implementation;
React performance review; narrated collage videos. Use three concrete questions
per group and preserve the wording between rounds.

## Release checks

Run the regression suite, `typecheck`, `lint` and production build. The additional
growth regression exercises channel parsing, private URL redaction, consent,
session expiry, activation deduplication, unavailable storage and source identity.
Run `node --experimental-strip-types scripts/check-growth-pages.mjs <origin>`
against the release to check the 20 upgraded destinations, visible source citations,
canonical URLs and structured data. Keep existing crawl-policy HTTP checks.

Browser acceptance covers widths 320, 390, 768 and 1440: no document overflow;
mobile directory filters and pagination; detail overview and source disclosure;
PPT comparison scrolling within its own region; consent and activation events.
