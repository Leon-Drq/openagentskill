set local lock_timeout = '3s';
set local statement_timeout = '30s';

-- The approved-only trigram index forced public name lookups to also scan
-- thousands of owner/static listings. Match the entire public RLS predicate.
create index if not exists skills_public_name_trgm_idx
  on public.skills using gin (name gin_trgm_ops)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');

-- Preserve the existing quality/star tie-break used by recommendation pools.
create index if not exists skills_public_quality_stars_idx
  on public.skills (quality_score desc, github_stars desc)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');

-- Materialize narrow matches before top-N ranking. An ordered LIMIT must not
-- make the planner scan quality-ranked rows and repeatedly detoast tsvectors.
create or replace function public.search_public_skills(p_query text, p_limit integer default 120)
returns setof public.skills
language sql
stable
security invoker
set search_path = ''
set statement_timeout = '3s'
as $$
  with matches as materialized (
    select id, quality_score, slug
    from public.skills
    where (ai_review_approved = true or listing_status in ('owner_published', 'static_checked'))
      and length(trim(coalesce(p_query, ''))) > 0
      and search_document @@ websearch_to_tsquery('simple'::regconfig, left(p_query, 512))
  ), ranked as (
    select id, quality_score, slug from matches
    order by quality_score desc, slug asc
    limit least(200, greatest(1, coalesce(p_limit, 120)))
  )
  select s.* from ranked r join public.skills s using (id)
  order by r.quality_score desc, r.slug asc;
$$;

revoke all on function public.search_public_skills(text, integer) from public;
grant execute on function public.search_public_skills(text, integer) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
