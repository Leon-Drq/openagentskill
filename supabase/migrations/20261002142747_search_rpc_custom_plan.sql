-- SQL-language functions use a generic internal plan: parameterized full-text
-- terms can select a full public-catalog scan even when literal EXPLAIN uses GIN.
-- PL/pgSQL's SPI planner honors force_custom_plan for each bounded search.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create or replace function public.search_public_skills(p_query text, p_limit integer default 120)
returns setof public.skills
language plpgsql stable security invoker
set search_path = ''
set statement_timeout = '3s'
set plan_cache_mode = 'force_custom_plan'
as $$
begin
  return query
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
end;
$$;
revoke all on function public.search_public_skills(text,integer) from public;
grant execute on function public.search_public_skills(text,integer) to anon,authenticated,service_role;
notify pgrst, 'reload schema';
