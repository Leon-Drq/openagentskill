# Weekly original editorial: 20 articles

The owner requests 20 original English articles per UTC Monday–Sunday week. This is an editorial target, not permission to publish filler. Drafts that fail fact-checking stay queued. Existing articles and URLs are retained.

## Preparation and publication

`GET /api/editorial` (INDEXER_SECRET or CRON_SECRET authorization) idempotently prepares 20 weekly slots. The legacy SEO cron now only prepares these briefs, once daily, with zero model calls.

The Codex editorial automation uses its existing Supabase connector for project `rtuodkczrlkxwwtaxwrr`, or the authenticated API. No production key may be included in content or URLs. It must read this document before each run.

1. Read current `seo_editorial_queue` slots and recent `blog_posts` titles/content. Target a distinct user problem for each slot. Do not repeat last week's article with new wording or dates.
2. Research the actual primary repositories/docs and current public registry records. Cite at least three primary source URLs inline. Do not execute third-party skills. No fabricated benchmarks, test outcomes, growth rates or endorsements. A source snapshot is not a runtime test.
3. Write 600–3000 English words, a specific title (20–100 chars), summary (50–200 chars), at least four H2s, selection methodology, concrete comparisons/workflow steps, limitations, and real internal links. Include `uniqueValue` (100+ chars) explaining new editorial value and `factCheckedBy` identifying the actual reviewing agent/editor. Counts are minimum structure checks, not evidence of quality.
4. Fact-check every material claim and check semantic overlap against previous articles. Keep revision notes. If evidence is insufficient, set `needs_revision`, do not fill the quota with generic prose.
5. Save JSON `{slug,title,summary,content,sources,uniqueValue,factCheckedBy}` as `draft` with status `draft` and actual `review_notes`. API alternative: `POST /api/editorial` with `{id,draft}`.
6. Publish only after these checks with `select public.publish_seo_editorial('<id>'::uuid)`, or `POST /api/editorial` with `{action:'publish',id}`. The database validates minimum content/source requirements, duplicate content/title, and an atomic 20-per-week cap. Never insert straight into blog_posts or override the gate.
7. Open the published URL, check metadata and source links, report published URLs and any shortfall. Never claim 20 were published because 20 briefs exist.

## Cadence and costs

Daily Codex follow-up: aim for 3 articles Monday–Saturday and 2 Sunday (20/week). Catch up within the weekly cap when quality permits. This consumes Codex quota; it does not call the website's text-generation API. No automated X posting is added by this workflow.

## Review cost controls

All website model analysis uses `controlledGeneration`: a shared Postgres reservation, a rolling 24-hour limit of 100 calls and $2 of conservative reserved cost, 2048 output tokens, no SDK retry, 24-hour error cooldown, 7-day exact version+policy+model cache. Reservations are not supplier invoices; actual token counts are retained when available. Supplier-side budgets must be verified separately in AI Gateway. Unpriced model overrides fail closed.

Static checks do not invent model scores. High-risk or incompletely scanned packages require manual review. A reproducible 2% sample of low-risk packages is escalated. New source versions are not silently assigned a previous review. Automatic discovery keeps its 20-star floor; user submissions keep zero-star eligibility.
