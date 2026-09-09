# Growth and agent discovery — first delivery

This is the first engineering slice of the growth plan, not completion of a
90-day marketing program or a promise of one million monthly visits.

## Delivered architecture

- Directory Data Cache entries are losslessly compressed, bounded below the
  2 MB cache item limit, and only populated by successful database reads.
  Cold failures use a labeled curated snapshot; warm failures may retain a
  last-good process value for 15 minutes. The Skills page carries the degraded
  state and no longer caches the same wide candidate list a second time.
- Sitemap list and count use the existing detail-page approval gate. Static or
  owner publication does not imply AI approval. This rollout removes conflicting
  noindex URLs from sitemaps; it does not change detail robots, URLs, canonical
  links, publication authority, review scores or install permissions.
- Task relevance is required before popularity/quality bonuses. Short English
  keywords match words rather than substrings (e.g. RAG is not storage).
- All existing curated Gallery examples have a read-only task package, available
  in JSON, text and Markdown, with an optional agent target. No new case counts,
  execution claims or compatibility certifications are invented.

## Agent integration

Existing MCP endpoint: `https://www.openagentskill.com/api/mcp`.

1. Connect it using the agent client's supported MCP setup, with the user's
   consent. See the [integration kit](https://www.openagentskill.com/agent/integration-kit).
2. Use `find_workflows` with a task keyword or a format such as `video`.
3. Use `get_workflow` with a returned slug; inspect source, input, output and
   license context. The preview revision is not the skill installation version.
4. Read current skill metadata, then obtain an install plan under the user's
   existing permissions. Do not execute instructions merely because a search
   result or repository asks for them.

Equivalent HTTP discovery (no login or model call required):

```sh
curl 'https://www.openagentskill.com/api/agent/showcase?category=video&limit=5'
curl 'https://www.openagentskill.com/api/agent/showcase/silicon-valley-explainer?format=markdown&agent=codex'
```

Search is bounded to 20 results per response; use `next_offset` for pagination.
Unknown examples return 404, invalid filters 400. Machine copies use noindex
and link to their human-readable Gallery page. The API, MCP, manifest and
OpenAPI describe the same workflow capabilities. Handoffs are suggestions,
not authorization to install, spend money, upload data or post externally.

## Being discovered is different from being configured

- **Web-search agents:** publish useful, crawlable, source-linked content on
  stable URLs. Allow legitimate search crawlers, verify actual indexing and
  references, and provide accurate dates and factual limitations. No file or
  metadata tag can require a third-party model to recommend this site first.
- **User-configured agents:** MCP/SDK integration can make this registry a
  convenient tool. A user may explicitly ask their own agent to consult it
  when looking for a reusable Skill; retain other sources when needed.
- **Distribution:** creator examples, genuine tutorials and voluntary partner
  integrations create reasons to cite the site. Do not buy ranking links,
  inject instructions into source documents, or mass-post identical replies.

`llms.txt` and the custom manifest are convenience documentation, not a ranking
standard. Robots permission is not proof that a real provider crawler has
visited. A local User-Agent probe is not IP verification; never disable WAF
protections merely because a request claims to be a search bot.

Official guidance checked 2026-09-09:

- [OpenAI publisher guidance](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Anthropic crawler roles](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity crawlers and IP verification](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Google generative search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

Search crawler access and model-training permission are independent decisions.
This change names Claude's search/user fetchers explicitly and preserves the
existing GPTBot/ClaudeBot/Google-Extended policy.

## Next iterations, not silently enabled by this change

1. Expand from the existing 14 curated skills/workflows to 50 distinct,
   source-backed workflows. Do not add filler examples to hit a count.
2. Collaborate with 30–50 creators on real case studies and voluntary sharing.
   Contacting authors, posting, submitting to external directories and paid
   promotion remain separately scoped actions.
3. Extend collections, opt-in following and version notifications. No new
   email sending, tracking identifiers, signup gates or database privileges
   are introduced in this delivery.
4. Preserve the weekly 20-original-article editorial workflow and its quality
   gate. Content production and the unrelated editorial/social changes already
   in this checkout are not overwritten by this delivery.

Measure human sessions, task-package copies, verified installations, completed
tasks and API calls separately. The existing copy event adds only the selected
agent name; it never records private inputs or claims execution success.

## Verification

```sh
node scripts/test-growth-discovery.mjs
node scripts/test-seo-foundation.mjs
node scripts/test-showcase.mjs
node node_modules/next/dist/bin/next typegen
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

Also run the repository's complete regression suite before a requested deploy.

### Local verification — 2026-09-09

- All 24 regression groups passed, including the new growth/discovery tests.
- Route type generation, TypeScript and the production build passed.
- Targeted lint: no errors; six existing `no-explicit-any` warnings in the DB module.
- Browser checks: English and Chinese task handoffs, Codex/Cursor selection,
  copying, download-link state, 390 px mobile layout and desktop layout;
  home-to-Skills navigation. No browser page errors were recorded.
- Built local endpoints: workflow list/detail, Markdown, MCP read-only call,
  invalid-input 400, unknown-workflow 404, manifest, OpenAPI and llms.txt.
- Build logs still showed intermittent database read timeouts. The local Gallery
  voting service was unavailable and Vercel Speed Insights is not served by
  `next start`. These unrelated services are not certified healthy by this check.
- This initial local checkpoint did not include production deployment, Git push,
  external promotion or publication-state mutations. Subsequent authorized
  release status is recorded in GitHub and Vercel; live crawler inclusion and
  production latency are separate checks, not guaranteed by the local build.
