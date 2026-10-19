-- Keep publication gates, RLS, columns and oldest-source canonical URLs unchanged.
-- Under RLS, lower(repo) can remain a join filter instead of an index condition.
-- The ordered LIMIT plan then compares every page row to the whole directory.
-- Materialize only public source identity keys and the small set of duplicate IDs.
-- This is a query-local CTE, NOT a persisted snapshot or a security-definer view.
set local lock_timeout = '3s';
set local statement_timeout = '30s';

create or replace view public.skill_directory_entries with (security_invoker = true) as
with directory_sources as materialized (
select id,created_at,lower(github_repo) as normalized_repo,source_path from public.skills
where (ai_review_approved=true or listing_status in ('owner_published','static_checked'))
and public.is_directory_skill(name,github_repo,category,tags,frameworks)
and github_repo is not null and source_path is not null
), duplicate_ids as materialized (
select s.id from directory_sources s where exists (
 select 1 from directory_sources older where older.normalized_repo=s.normalized_repo
 and older.source_path=s.source_path and (older.created_at,older.id)<(s.created_at,s.id)
))
select id, slug, name, description, tagline, author_name, author_url, repository,
  github_repo, github_stars, github_forks, category, tags, frameworks, version,
  license, install_command, npm_package, verified, publisher_verified,
  submission_source, submitted_by_agent, ai_review_score, ai_review_approved,
  listing_status, owner_publication, ai_review_issues, downloads, used_by,
  rating, review_count, quality_score, quality_signals, github_language,
  github_last_pushed_at, source_ref, source_path, source_commit_sha,
  source_content_hash, source_sync_status, created_at, updated_at,
  primary_category, taxonomy_tags, output_types, taxonomy_version, site_downloads,
  product_metadata from public.skills s
where (s.ai_review_approved=true or s.listing_status in ('owner_published','static_checked'))
and public.is_directory_skill(name,github_repo,category,tags,frameworks)
and not exists(select 1 from duplicate_ids duplicate where duplicate.id=s.id);

NOTIFY pgrst, 'reload schema';
