-- Add the new aggregate to the existing invoker view; preserve publication,
-- source deduplication, columns and grants. The slug RPC returns this view type.
create or replace view public.skill_directory_entries with (security_invoker = true) as
select
  id, slug, name, description, tagline, author_name, author_url, repository,
  github_repo, github_stars, github_forks, category, tags, frameworks, version,
  license, install_command, npm_package, verified, publisher_verified,
  submission_source, submitted_by_agent, ai_review_score, ai_review_approved,
  listing_status, owner_publication, ai_review_issues, downloads, used_by,
  rating, review_count, quality_score, quality_signals, github_language,
  github_last_pushed_at, source_ref, source_path, source_commit_sha,
  source_content_hash, source_sync_status, created_at, updated_at,
  primary_category, taxonomy_tags, output_types, taxonomy_version, site_downloads
from public.skills s
where (ai_review_approved = true or listing_status in ('owner_published', 'static_checked'))
  and public.is_directory_skill(name, github_repo, category, tags, frameworks)
  and not exists (
    select 1 from public.skills older
    where s.github_repo is not null and s.source_path is not null
      and lower(older.github_repo) = lower(s.github_repo) and older.source_path = s.source_path
      and (older.ai_review_approved = true or older.listing_status in ('owner_published', 'static_checked'))
      and public.is_directory_skill(older.name, older.github_repo, older.category, older.tags, older.frameworks)
      and (older.created_at, older.id) < (s.created_at, s.id)
  );

NOTIFY pgrst, 'reload schema';
