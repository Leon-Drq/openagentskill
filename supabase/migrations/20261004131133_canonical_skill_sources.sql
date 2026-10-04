-- Source identity is repository + exact, case-sensitive Skill path, not slug or revision.
-- Keep all historical rows, submission links, review evidence and usage records.
create index if not exists skills_public_source_lookup_idx
  on public.skills (lower(github_repo), source_path, created_at, id)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');

-- Serialize competing publications. Same-slug upserts remain available for
-- normal source synchronization; a new slug cannot split an existing source.
create function public.guard_public_skill_source_identity() returns trigger
language plpgsql security invoker set search_path = pg_catalog
as $function$
begin
  if new.github_repo is null or new.source_path is null
    or not (coalesce(new.ai_review_approved, false) or coalesce(new.listing_status, '') in ('owner_published', 'static_checked')) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(lower(new.github_repo) || '#' || new.source_path, 0));
  if exists (
    select 1 from public.skills s
    where s.slug = new.slug and lower(s.github_repo) = lower(new.github_repo)
      and s.source_path = new.source_path
      and (s.ai_review_approved = true or s.listing_status in ('owner_published', 'static_checked'))
  ) then
    return new;
  end if;
  if exists (
    select 1 from public.skills s
    where lower(s.github_repo) = lower(new.github_repo) and s.source_path = new.source_path
      and s.slug <> new.slug
      and (s.ai_review_approved = true or s.listing_status in ('owner_published', 'static_checked'))
  ) then
    raise unique_violation using message = 'Public Skill source already has a canonical listing',
      constraint = 'skills_public_source_identity_key';
  end if;
  return new;
end;
$function$;
revoke all on function public.guard_public_skill_source_identity() from public, anon, authenticated;
grant execute on function public.guard_public_skill_source_identity() to service_role;
create trigger skills_guard_public_source_insert before insert on public.skills
  for each row execute function public.guard_public_skill_source_identity();

-- De-duplicate before counting and LIMIT/OFFSET, retaining the oldest public URL.
-- Invoker security preserves the skills RLS and the public column projection.
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
  primary_category, taxonomy_tags, output_types, taxonomy_version
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
