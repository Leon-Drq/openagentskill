# SEO growth rollout — September 2026

## Release scope

This release preserves existing URLs, canonical policies, language routing and
Skill publication/index eligibility. It does not remove listings, fabricate
runtime evidence, submit search-engine requests, change database schema, or post
on behalf of creators.

- Sitemap database reads cache successes only. Failed revalidation must retain
  the last successful Next Data Cache entry. A cold-cache outage returns 503,
  `Retry-After: 300`, and `Cache-Control: no-store`, never an empty/small substitute
  sitemap or a false 404. Cache keys were bumped to discard old fallback entries.
- Request-time dates were removed at the source. Known editorial/Gallery dates
  are emitted; unknown dates are omitted. Previous static routes suppressed all
  dates, so this restores truthful dates rather than claiming a live false-date bug.
- Guide selections require an approved, relevant candidate. Stars do not establish
  relevance, comparison headings require actual named targets, and an empty
  shortlist is explicit. These changes do not certify any new skill.
- The product-video guide connects source listings, examples, preparation,
  permissions, costs and an export acceptance checklist. It is not a runtime test.
- Guide authorship, breadcrumbs, source scope and a task-specific Finder link
  make the discovery-to-use journey clearer. Old URLs remain intact.

## Release checks

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm check:seo https://www.openagentskill.com
```

`check:seo` is read-only and bounded: representative pages, canonical/robots/H1,
JSON-LD, language alternates, and the first/last advertised skill shards. It does
not claim to measure actual Google indexing, rankings, or Core Web Vitals.

## Next stage: establish a first-party baseline

Obtain authorized Search Console exports before choosing pages to consolidate or
markets to expand. No Search Console/GA4 results have been assumed in this release.

Compare the latest complete 28 days against the previous 28 days; retain a 90-day
view for seasonality. Export queries, pages, country and device, separating brand
terms (OpenAgentSkill and spelling variants) from non-brand discovery. Google can
omit low-volume queries, so query totals are not expected to equal all clicks.

Group landing pages by skills, use cases, guides, Gallery, creators and rankings.
Prioritize high-impression relevant pages with improvement potential; inspect the
actual search results and query intent before rewriting. Do not select topics
based only on third-party estimated visits or arbitrary page counts.

In analytics, distinguish a detail visit, install-command copy, install attempt,
reported install, and reported successful task. Never relabel clicks as installs.
Measure organic acquisition and repeat use in consistent windows. Respect consent
and avoid collecting prompt content, code, API keys or private task material.

## Intent ownership (validate with query data)

| Intent | Preferred existing destination | Editorial constraint |
| --- | --- | --- |
| Browse/filter skills | `/skills` | Directory, not a second definition article |
| What is a skill? | `/agent-skill` | Concepts and a concrete example |
| Registry integration | `/agent-skills-registry` | Protocol, API, source and installation |
| Choose for a task | `/use-cases/...` | Relevant options and decision criteria |
| Learn a procedure | `/guides/...` | Inputs, steps, limitations, verification |
| See a result | `/showcase/...` | Real preview, attribution and reproduction scope |
| Find an author | `/creators/...` | Public attribution versus verified ownership |

Other overlapping URLs are not deleted or redirected until their queries,
backlinks and content are compared. If consolidation is justified, use one-to-one
redirects and update internal links/sitemaps; do not redirect everything home.

## International expansion gate

Keep existing query-based language UI and its conservative indexing unchanged.
For a market supported by demand, publish complete translated high-value pages
with stable language URLs, self-canonical and reciprocal hreflang. Translate the
body, instructions and limitations, not just navigation. Verify English and all
existing language routes before any migration. No mass language-URL generation.

## Content and distribution experiments

Improve a small cohort of existing pages before scaling. Attach actual source
versions, input/output examples, costs/permissions and known limitations. Label
author claims separately from platform tests. Publish original data only with a
reproducible method and honest denominators. Creator sharing is voluntary; never
exchange review approval or listing eligibility for backlinks.

Review non-brand clicks and task activation by cohort after 2, 4 and 8 weeks.
Search results can fluctuate; deploy success is not proof of SEO growth. Do not
promise specific ranks or traffic multipliers.
