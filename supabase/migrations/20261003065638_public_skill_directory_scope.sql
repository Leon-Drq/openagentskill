-- Apply the same MCP-only exclusion as lib/skills/registry-scope.ts before
-- counting and LIMIT/OFFSET. This does not change publication or review states.
create function public.is_directory_skill(
  skill_name text, github_repository text, skill_category text,
  skill_tags text[], skill_frameworks text[]
) returns boolean
language sql immutable parallel safe security invoker
set search_path = pg_catalog
as $function$
  select not (
    regexp_replace(coalesce(skill_category, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g')
      ~* '^(mcp|mcp[-_[:space:]]?(server|servers|registry)|model[-_[:space:]]?context[-_[:space:]]?protocol)$'
    or exists (
      select 1 from unnest(coalesce(skill_tags, '{}') || coalesce(skill_frameworks, '{}')) marker
      where regexp_replace(marker, '^[[:space:]]+|[[:space:]]+$', '', 'g')
        ~* '^(mcp[-_[:space:]]?(server|servers|client|host|gateway|proxy|registry)|model[-_[:space:]]?context[-_[:space:]]?protocol)$'
    )
    or (coalesce(skill_name, '') || ' ' || coalesce(github_repository, ''))
      ~* '(^|[^a-z0-9_])(mcp[-_[:space:]]?(server|servers|client|host|gateway|proxy|registry)|model context protocol)($|[^a-z0-9_])'
    or (
      (coalesce(skill_name, '') || ' ' || coalesce(github_repository, '')) ~* '(^|[^a-z0-9])mcp([^a-z0-9]|$)'
      and not (
        coalesce(skill_name, '') || ' ' || coalesce(github_repository, '') || ' ' ||
        coalesce(array_to_string(coalesce(skill_tags, '{}') || coalesce(skill_frameworks, '{}'), ' '), '')
      ) ~* '(^|[^a-z0-9])skills?([^a-z0-9]|$)'
    )
  );
$function$;

revoke all on function public.is_directory_skill(text, text, text, text[], text[]) from public;
grant execute on function public.is_directory_skill(text, text, text, text[], text[]) to anon, authenticated, service_role;

-- Invoker security preserves the underlying skills RLS policies. Only the
-- existing public directory projection is exposed, excluding contact fields.
create view public.skill_directory_entries with (security_invoker = true) as
select
  id, slug, name, description, tagline, author_name, author_url, repository,
  github_repo, github_stars, github_forks, category, tags, frameworks, version,
  license, install_command, npm_package, verified, publisher_verified,
  submission_source, submitted_by_agent, ai_review_score, ai_review_approved,
  listing_status, owner_publication, ai_review_issues, downloads, used_by,
  rating, review_count, quality_score, quality_signals, github_language,
  github_last_pushed_at, source_ref, source_path, source_commit_sha,
  source_content_hash, source_sync_status, created_at, updated_at,
  primary_category, taxonomy_tags, output_types, taxonomy_version
from public.skills
where (ai_review_approved = true or listing_status in ('owner_published', 'static_checked'))
  and public.is_directory_skill(name, github_repo, category, tags, frameworks);

revoke all on public.skill_directory_entries from public, anon, authenticated, service_role;
grant select on public.skill_directory_entries to anon, authenticated, service_role;
