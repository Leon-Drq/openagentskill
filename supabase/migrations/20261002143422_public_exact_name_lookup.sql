-- Case-insensitive exact name lookup under the same public publication gate.
-- Keep non-leakproof name matching away from the RLS full-catalog scan.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create index if not exists skills_public_lower_name_idx
on public.skills (lower(name))
where ai_review_approved=true or listing_status in ('owner_published','static_checked');
create or replace function public.lookup_public_skill_name(p_name text)
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  tagline text,
  author_name text,
  author_url text,
  repository text,
  github_repo text,
  github_stars integer,
  github_forks integer,
  category text,
  tags text[],
  frameworks text[],
  version text,
  license text,
  install_command text,
  npm_package text,
  verified boolean,
  publisher_verified boolean,
  submission_source text,
  submitted_by_agent text,
  ai_review_score jsonb,
  ai_review_approved boolean,
  listing_status text,
  owner_publication jsonb,
  ai_review_issues text[],
  downloads integer,
  used_by integer,
  rating numeric(2,1),
  review_count integer,
  quality_score numeric(5,2),
  quality_signals jsonb,
  github_language text,
  github_last_pushed_at timestamp with time zone,
  source_ref text,
  source_path text,
  source_commit_sha text,
  source_content_hash text,
  source_sync_status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language sql stable security definer
set search_path = ''
set statement_timeout = '3s'
as $$
  select s.id,s.slug,s.name,s.description,s.tagline,s.author_name,s.author_url,s.repository,s.github_repo,s.github_stars,s.github_forks,s.category,s.tags,s.frameworks,s.version,s.license,s.install_command,s.npm_package,s.verified,s.publisher_verified,s.submission_source,s.submitted_by_agent,s.ai_review_score,s.ai_review_approved,s.listing_status,s.owner_publication,s.ai_review_issues,s.downloads,s.used_by,s.rating,s.review_count,s.quality_score,s.quality_signals,s.github_language,s.github_last_pushed_at,s.source_ref,s.source_path,s.source_commit_sha,s.source_content_hash,s.source_sync_status,s.created_at,s.updated_at
  from public.skills s
  where (s.ai_review_approved=true or s.listing_status in ('owner_published','static_checked'))
    and length(trim(coalesce(p_name,'')))>0
    and lower(s.name)=lower(left(trim(p_name),180))
  order by s.slug asc
  limit 8;
$$;
revoke all on function public.lookup_public_skill_name(text) from public;
grant execute on function public.lookup_public_skill_name(text) to anon,authenticated,service_role;
notify pgrst, 'reload schema';
