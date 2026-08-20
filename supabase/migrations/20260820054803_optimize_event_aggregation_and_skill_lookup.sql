-- Keep engagement writes O(1) and give the hottest public skill lookups
-- indexes that match their filters and ordering.

create index if not exists idx_skills_approved_category_quality
  on public.skills (category, quality_score desc, github_stars desc)
  where ai_review_approved = true;

create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_skills_approved_name_trgm
  on public.skills using gin (name extensions.gin_trgm_ops)
  where ai_review_approved = true;

create or replace function private.rebuild_skill_event_stats(p_skill_slug text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.skill_event_stats (
    skill_slug,
    total_events,
    views,
    install_copies,
    saves,
    compares,
    outbound_clicks,
    claim_starts,
    claim_submits,
    last_event_at,
    updated_at
  )
  select
    skill_slug,
    count(*)::integer,
    count(*) filter (where event_type = 'view')::integer,
    count(*) filter (where event_type = 'install_copy')::integer,
    count(*) filter (where event_type = 'save')::integer,
    count(*) filter (where event_type = 'compare')::integer,
    count(*) filter (where event_type in ('outbound_github', 'outbound_docs'))::integer,
    count(*) filter (where event_type = 'claim_start')::integer,
    count(*) filter (where event_type = 'claim_submit')::integer,
    max(created_at),
    now()
  from public.skill_events
  where skill_slug = p_skill_slug
  group by skill_slug
  on conflict (skill_slug) do update set
    total_events = excluded.total_events,
    views = excluded.views,
    install_copies = excluded.install_copies,
    saves = excluded.saves,
    compares = excluded.compares,
    outbound_clicks = excluded.outbound_clicks,
    claim_starts = excluded.claim_starts,
    claim_submits = excluded.claim_submits,
    last_event_at = excluded.last_event_at,
    updated_at = now();

  delete from public.skill_event_stats
  where skill_slug = p_skill_slug
    and not exists (
      select 1
      from public.skill_events
      where skill_slug = p_skill_slug
    );
end;
$$;

revoke all on function private.rebuild_skill_event_stats(text) from public;
revoke all on function private.rebuild_skill_event_stats(text) from anon, authenticated;

create or replace function private.refresh_skill_event_stats_for_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.skill_event_stats (
      skill_slug,
      total_events,
      views,
      install_copies,
      saves,
      compares,
      outbound_clicks,
      claim_starts,
      claim_submits,
      last_event_at,
      updated_at
    ) values (
      new.skill_slug,
      1,
      (new.event_type = 'view')::integer,
      (new.event_type = 'install_copy')::integer,
      (new.event_type = 'save')::integer,
      (new.event_type = 'compare')::integer,
      (new.event_type in ('outbound_github', 'outbound_docs'))::integer,
      (new.event_type = 'claim_start')::integer,
      (new.event_type = 'claim_submit')::integer,
      new.created_at,
      now()
    )
    on conflict (skill_slug) do update set
      total_events = public.skill_event_stats.total_events + excluded.total_events,
      views = public.skill_event_stats.views + excluded.views,
      install_copies = public.skill_event_stats.install_copies + excluded.install_copies,
      saves = public.skill_event_stats.saves + excluded.saves,
      compares = public.skill_event_stats.compares + excluded.compares,
      outbound_clicks = public.skill_event_stats.outbound_clicks + excluded.outbound_clicks,
      claim_starts = public.skill_event_stats.claim_starts + excluded.claim_starts,
      claim_submits = public.skill_event_stats.claim_submits + excluded.claim_submits,
      last_event_at = greatest(public.skill_event_stats.last_event_at, excluded.last_event_at),
      updated_at = now();

    return new;
  end if;

  perform private.rebuild_skill_event_stats(old.skill_slug);

  if tg_op = 'UPDATE' and new.skill_slug is distinct from old.skill_slug then
    perform private.rebuild_skill_event_stats(new.skill_slug);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function private.refresh_skill_events_daily_for_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.skill_events_daily (
      skill_slug,
      event_date,
      total_events,
      views,
      install_copies,
      saves,
      compares,
      outbound_clicks,
      claim_starts,
      claim_submits,
      first_event_at,
      last_event_at,
      updated_at
    ) values (
      new.skill_slug,
      new.created_at::date,
      1,
      (new.event_type = 'view')::integer,
      (new.event_type = 'install_copy')::integer,
      (new.event_type = 'save')::integer,
      (new.event_type = 'compare')::integer,
      (new.event_type in ('outbound_github', 'outbound_docs'))::integer,
      (new.event_type = 'claim_start')::integer,
      (new.event_type = 'claim_submit')::integer,
      new.created_at,
      new.created_at,
      now()
    )
    on conflict (skill_slug, event_date) do update set
      total_events = public.skill_events_daily.total_events + excluded.total_events,
      views = public.skill_events_daily.views + excluded.views,
      install_copies = public.skill_events_daily.install_copies + excluded.install_copies,
      saves = public.skill_events_daily.saves + excluded.saves,
      compares = public.skill_events_daily.compares + excluded.compares,
      outbound_clicks = public.skill_events_daily.outbound_clicks + excluded.outbound_clicks,
      claim_starts = public.skill_events_daily.claim_starts + excluded.claim_starts,
      claim_submits = public.skill_events_daily.claim_submits + excluded.claim_submits,
      first_event_at = least(public.skill_events_daily.first_event_at, excluded.first_event_at),
      last_event_at = greatest(public.skill_events_daily.last_event_at, excluded.last_event_at),
      updated_at = now();

    return new;
  end if;

  perform private.refresh_skill_events_daily_for_date(old.skill_slug, old.created_at::date);

  if tg_op = 'UPDATE'
    and (new.skill_slug, new.created_at::date) is distinct from (old.skill_slug, old.created_at::date)
  then
    perform private.refresh_skill_events_daily_for_date(new.skill_slug, new.created_at::date);
  end if;

  return coalesce(new, old);
end;
$$;

comment on function private.refresh_skill_event_stats_for_event() is
  'Increment aggregate counters for inserts; rebuild only for rare update/delete corrections.';

comment on function private.refresh_skill_events_daily_for_event() is
  'Increment daily aggregate counters for inserts; rebuild only for rare update/delete corrections.';
