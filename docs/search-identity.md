# Skill identity search

Name lookup and task recommendation share retrieval, but not selection policy.

- Exact name, slug and repository identities rank before near names and task relevance. Spaces, underscores and hyphens normalize for name comparison; repository owner/name comparisons remain literal.
- Missing exact names receive bounded name-only probes (at most four cached queries, 24 rows each) against the existing public-name index. Candidates must pass identity comparison, including a single edit/transposition; a shared description word is not a name match.
- Direct name lookups skip the quality candidate pool. Successful empty reads are empty results; failed/degraded name reads without definitive exact evidence are retryable failures, not unrelated fallback recommendations.
- `lookup_matches` in Resolve is discovery, including public entries requiring source verification or blocked by the selected installation policy. It carries `match_type`, source evidence and unchanged safety decisions. The web UI labels it as name matching, not installation approval.
- `selected`, recommendations, install receipts and agent handoff still require existing installation eligibility. An exact blocked match cannot be replaced by an installable near name as the primary recommendation. No stored approvals, reviews or scores are changed.
- Ordinary task descriptions retain the recommendation path. Existing API fields, detail URLs, canonical URLs, robots and sitemap rules are preserved. `lookup_matches` and `meta.lookup_intent` / `meta.exact_match_found` are additive.

Regression: `pnpm test:submission-discovery` runs real ranker/resolver/safety code with isolated transport. It covers exact/near names, case and separators, missing letters, transpositions, repository identity, empty/outage states, source verification, blocked installation, minimum-star constraints, and task recommendations.
