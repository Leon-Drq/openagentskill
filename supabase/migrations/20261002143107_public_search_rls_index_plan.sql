-- RLS prevents the non-leakproof full-text operator from using its GIN index
-- for anonymous callers. This read-only definer function enforces the identical
-- publication predicate explicitly and exposes only the directory projection.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
drop function public.search_public_skills(text,integer);
create function public.search_public_skills(p_query text,p_limit integer default 120)
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
language plpgsql stable security definer
set search_path = ''
set statement_timeout = '3s'
set plan_cache_mode = 'force_custom_plan'
as $$
begin
  return query
  with matches as materialized (
    select s.id,s.quality_score,s.slug from public.skills s
    where (s.ai_review_approved=true or s.listing_status in ('owner_published','static_checked'))
      and length(trim(coalesce(p_query,'')))>0
      and s.search_document@@websearch_to_tsquery('simple'::regconfig,left(p_query,512))
  ), ranked as (
    select m.id,m.quality_score,m.slug from matches m
    order by m.quality_score desc,m.slug asc
    limit least(200,greatest(1,coalesce(p_limit,120)))
  )
  select s.id,s.slug,s.name,s.description,s.tagline,s.author_name,s.author_url,s.repository,s.github_repo,s.github_stars,s.github_forks,s.category,s.tags,s.frameworks,s.version,s.license,s.install_command,s.npm_package,s.verified,s.publisher_verified,s.submission_source,s.submitted_by_agent,s.ai_review_score,s.ai_review_approved,s.listing_status,s.owner_publication,s.ai_review_issues,s.downloads,s.used_by,s.rating,s.review_count,s.quality_score,s.quality_signals,s.github_language,s.github_last_pushed_at,s.source_ref,s.source_path,s.source_commit_sha,s.source_content_hash,s.source_sync_status,s.created_at,s.updated_at
  from ranked r join public.skills s on s.id=r.id
  where (s.ai_review_approved=true or s.listing_status in ('owner_published','static_checked'))
  order by r.quality_score desc,r.slug asc;
end;
$$;
revoke all on function public.search_public_skills(text,integer) from public;
grant execute on function public.search_public_skills(text,integer) to anon,authenticated,service_role;
notify pgrst, 'reload schema';
