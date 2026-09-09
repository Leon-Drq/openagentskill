-- Recent activity is aggregated in the background, never on public page requests.
-- This read-only RPC is service-role-only; it changes no publication/review state.
create or replace function public.get_trending_activity_candidates(
  window_end date,
  page_offset integer default 0,
  page_size integer default 100
) returns setof jsonb
language sql stable security invoker
set search_path = ''
set statement_timeout = '12s'
as $$
  with recent as (
    select d.skill_slug,
      sum(greatest(0, d.views))::bigint as views,
      sum(greatest(0, d.install_copies))::bigint as install_copies,
      sum(greatest(0, d.compares))::bigint as compares,
      sum(greatest(0, d.saves))::bigint as saves,
      sum(greatest(0, d.outbound_clicks))::bigint as outbound_clicks,
      count(*) filter (where d.views + d.install_copies + d.compares + d.saves + d.outbound_clicks > 0)::integer as active_days,
      sum((
        least(30, greatest(0, d.views)) +
        least(12, greatest(0, d.install_copies)) * 8 +
        least(12, greatest(0, d.compares)) * 5 +
        least(10, greatest(0, d.saves)) * 4 +
        least(15, greatest(0, d.outbound_clicks)) * 4
      ) * (0.65 + (d.event_date - (window_end - 7) + 1)::numeric / 7 * 0.7)) as weighted_activity
    from public.skill_events_daily d
    where d.event_date >= window_end - 7 and d.event_date < window_end
      and window_end <= (now() at time zone 'UTC')::date
      and window_end >= (now() at time zone 'UTC')::date - 90
    group by d.skill_slug
  ), eligible as (
    select s.slug,
      jsonb_build_object(
        'slug', s.slug, 'name', s.name, 'description', s.description,
        'category', s.category, 'tags', s.tags, 'frameworks', s.frameworks,
        'github_repo', s.github_repo, 'github_stars', s.github_stars,
        'github_forks', s.github_forks, 'repository', s.repository,
        'author_name', s.author_name, 'quality_score', s.quality_score,
        'install_command', s.install_command, 'updated_at', s.updated_at
      ) as skill,
      jsonb_build_object(
        'total_events', r.views + r.install_copies + r.compares + r.saves + r.outbound_clicks,
        'views', r.views, 'install_copies', r.install_copies, 'compares', r.compares,
        'saves', r.saves, 'outbound_clicks', r.outbound_clicks, 'active_days', r.active_days
      ) as activity,
      ln(1 + r.weighted_activity) * 16 + r.active_days * 4 as score
    from recent r join public.skills s on s.slug = r.skill_slug
    where r.weighted_activity > 0
      and (s.ai_review_approved = true or s.listing_status in ('owner_published', 'static_checked'))
  )
  select jsonb_build_object('skill', skill, 'activity', activity, 'score', score, 'candidate_count', count(*) over ())
  from eligible
  order by score desc, slug collate "C" asc
  limit greatest(1, least(coalesce(page_size, 100), 200))
  offset greatest(0, least(coalesce(page_offset, 0), 20000));
$$;

revoke all on function public.get_trending_activity_candidates(date, integer, integer) from public, anon, authenticated;
grant execute on function public.get_trending_activity_candidates(date, integer, integer) to service_role;
comment on function public.get_trending_activity_candidates(date, integer, integer) is
  'Background-only recent activity leaderboard: seven completed UTC days, daily capped signals, no lifetime/quality candidate fallback, public listings only.';
