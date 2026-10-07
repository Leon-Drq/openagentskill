# Skill task taxonomy

`lib/skills/taxonomy.ts` defines 19 primary categories, task tags and seven output types. The directory shows 15 common categories and offers all categories in the select. The categories menu uses the same vocabulary. Agent/platform, price and examples remain separate filters.

Classification uses each Skill's name, source path, description, source category and tags. It does not use repository stars or marketplace ratings. Source categories and tags remain intact. A trigger recalculates derived fields on source metadata changes; directory reads use indexed `primary_category`, `taxonomy_tags` and `output_types`. No AI call runs during navigation. Rules are deterministic task hints, not compatibility/security verification.

The generated SQL and JS use the same rules. Run `pnpm taxonomy:migration` after vocabulary changes and create a new versioned migration for future rule revisions. Do not overwrite an applied migration. Deployment order is additive migration, bounded backfill, query verification, then application release.

For an exact-package correction, create an empty migration with `supabase migration new <name>` and generate only that follow-up file:

```sh
node --experimental-strip-types scripts/build-skill-taxonomy-migration.mjs \
  --exact-source-output supabase/migrations/<created-file>.sql \
  --source chengyi-ai/native-subtitle-quote-image:skills/native-subtitle-quote-image/SKILL.md
```

Native Subtitle Quote Image consumes video frames and delivers JPG quote cards. Its exact package is therefore classified as `image-generation`, with the `image-editing` task tag and `image` output. Other packages in that repository use the common rules. The follow-up generator preserves applied migration files, updates only the selected package's derived fields, and rolls back if any original source, review, publication or timestamp field changes.

For a fresh database, backfill records in batches using `classify_skill_taxonomy(name,description,tagline,source_path,category,tags,github_repo)` and assign only `primary_category`, `taxonomy_tags`, `output_types`, `taxonomy_version`. Limit each batch to 3,000 rows with version zero. Existing publication and timestamp functions are preserved and ignore derived-only updates. Check source/review/slug/timestamp equality per batch. The 2026-10-02 production backfill updated 34,115 records with zero source/review changes. The second migration adds three verified exceptions keyed by repository and exact Skill path, leaving other Skills in those repositories to the common rules.

Old category query links continue to normalize; browser automation and scraping links additionally retain the corresponding task tag. Skill/showcase URLs, existing topic pages, canonical URLs, localization alternates and sitemap publication gates remain unchanged. Filter combinations stay noindex. Curated task pages remain linked from the directory and preserve their editorial content; new thin category pages are not generated.

# LobeHub discovery

`/api/cron/lobehub-discovery` uses existing automation authorization and the global pipeline pause flag. A daily job reads one public directory page (1.5 MB/12-second bound), rotates across up to 20 public GitHub source references and checks at most five sources. GitHub repository metadata comes from GitHub, including renamed repositories. Rate-limit errors stop lookup. Missing sources are skipped. No source scripts or Skill packages are installed/executed by discovery.

Only GitHub tree references or exact SKILL.md file references are accepted. The job records original marketplace/source provenance and enqueues internal candidates, subject to the existing star floor, repository/path deduplication, license evidence, content hashes, static scanning and review gates. It never creates public Skill pages directly or copies marketplace descriptions, scores, downloads or verification badges. Package contents are fetched from the original repository by the existing validator.

Expanded document candidates use exact GitHub blob URLs, distinct from their directory discovery parent. An exact-document discovery is validated in place because it already owns the document source key. Both paths use the same license, duplicate-content and review decisions; source identity handling never overrides a review state.

This is bounded public source discovery, not an authenticated catalog mirror. LobeHub's official API requires client registration. If the public page blocks access or changes format, the job reports failure and enqueues nothing; it does not bypass authentication or rate limits. Scaling requires confirming the supported interface and content permissions first. Missing/restricted licenses keep their existing review treatment.
