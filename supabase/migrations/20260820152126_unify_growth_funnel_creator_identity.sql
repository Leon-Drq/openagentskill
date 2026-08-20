-- Unify public discovery signals, verified agent outcomes, and creator identity.
-- Public/browser events remain explicitly marked as unverified. Trusted server
-- integrations write install/outcome events through the service role.

alter table public.profiles
  add column if not exists github_username text,
  add column if not exists x_username text;

alter table public.profiles
  drop constraint if exists profiles_github_username_check,
  add constraint profiles_github_username_check check (
    github_username is null or github_username ~* '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$'
  ),
  drop constraint if exists profiles_x_username_check,
  add constraint profiles_x_username_check check (
    x_username is null or x_username ~* '^[a-z0-9_]{1,15}$'
  );

create unique index if not exists profiles_github_username_unique
  on public.profiles (lower(github_username)) where github_username is not null;
create unique index if not exists profiles_x_username_unique
  on public.profiles (lower(x_username)) where x_username is not null;

alter table public.skill_claims
  alter column github_username drop not null,
  add column if not exists x_username text;

alter table public.skill_claims
  drop constraint if exists skill_claims_github_username_check,
  add constraint skill_claims_github_username_check check (
    github_username is null or github_username ~* '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$'
  ),
  drop constraint if exists skill_claims_x_username_check,
  add constraint skill_claims_x_username_check check (
    x_username is null or x_username ~* '^[a-z0-9_]{1,15}$'
  ),
  drop constraint if exists skill_claims_identity_evidence_check,
  add constraint skill_claims_identity_evidence_check check (
    github_username is not null or x_username is not null or evidence_url is not null
  );

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_select_public
  on public.profiles for select to anon, authenticated using (true);
create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy profiles_delete_own
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

drop policy if exists skill_claims_insert_own_pending on public.skill_claims;
create policy skill_claims_insert_own_pending
  on public.skill_claims for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and (github_username is not null or x_username is not null or evidence_url is not null)
  );

alter table public.skill_events
  add column if not exists event_key text,
  add column if not exists source text not null default 'web',
  add column if not exists is_verified boolean not null default false;

create unique index if not exists skill_events_event_key_unique
  on public.skill_events (event_key) where event_key is not null;
create index if not exists skill_events_funnel_lookup
  on public.skill_events (skill_slug, event_type, created_at desc);

alter table public.skill_events drop constraint if exists skill_events_event_type_check;
alter table public.skill_events add constraint skill_events_event_type_check check (
  event_type = any (array[
    'view', 'resolve_request', 'install_copy', 'install_start', 'install_success',
    'install_failure', 'agent_call', 'outcome_success', 'outcome_failure',
    'save', 'compare', 'outbound_github', 'outbound_docs', 'claim_start',
    'claim_submit', 'share_copy'
  ])
);

drop policy if exists skill_events_insert_public_events on public.skill_events;
create policy skill_events_insert_public_events
  on public.skill_events for insert to anon, authenticated
  with check (
    event_type = any (array[
      'view', 'resolve_request', 'install_copy', 'install_start', 'save',
      'compare', 'outbound_github', 'outbound_docs', 'claim_start',
      'claim_submit', 'share_copy'
    ])
    and is_verified = false
    and (user_id is null or user_id = (select auth.uid()))
    and exists (
      select 1 from public.skills
      where skills.slug = skill_events.skill_slug
        and skills.ai_review_approved = true
    )
  );

alter table public.skill_event_stats
  add column if not exists resolve_requests integer not null default 0,
  add column if not exists install_starts integer not null default 0,
  add column if not exists install_successes integer not null default 0,
  add column if not exists install_failures integer not null default 0,
  add column if not exists agent_calls integer not null default 0,
  add column if not exists outcome_successes integer not null default 0,
  add column if not exists outcome_failures integer not null default 0,
  add column if not exists share_copies integer not null default 0;

alter table public.skill_events_daily
  add column if not exists resolve_requests integer not null default 0,
  add column if not exists install_starts integer not null default 0,
  add column if not exists install_successes integer not null default 0,
  add column if not exists install_failures integer not null default 0,
  add column if not exists agent_calls integer not null default 0,
  add column if not exists outcome_successes integer not null default 0,
  add column if not exists outcome_failures integer not null default 0,
  add column if not exists share_copies integer not null default 0;

create or replace function private.rebuild_skill_event_stats(p_skill_slug text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.skill_event_stats (
    skill_slug, total_events, views, install_copies, saves, compares,
    outbound_clicks, claim_starts, claim_submits, resolve_requests,
    install_starts, install_successes, install_failures, agent_calls,
    outcome_successes, outcome_failures, share_copies, last_event_at, updated_at
  )
  select skill_slug, count(*)::integer,
    count(*) filter (where event_type='view')::integer,
    count(*) filter (where event_type='install_copy')::integer,
    count(*) filter (where event_type='save')::integer,
    count(*) filter (where event_type='compare')::integer,
    count(*) filter (where event_type in ('outbound_github','outbound_docs'))::integer,
    count(*) filter (where event_type='claim_start')::integer,
    count(*) filter (where event_type='claim_submit')::integer,
    count(*) filter (where event_type='resolve_request')::integer,
    count(*) filter (where event_type='install_start')::integer,
    count(*) filter (where event_type='install_success')::integer,
    count(*) filter (where event_type='install_failure')::integer,
    count(*) filter (where event_type='agent_call')::integer,
    count(*) filter (where event_type='outcome_success')::integer,
    count(*) filter (where event_type='outcome_failure')::integer,
    count(*) filter (where event_type='share_copy')::integer,
    max(created_at), now()
  from public.skill_events where skill_slug=p_skill_slug group by skill_slug
  on conflict (skill_slug) do update set
    total_events=excluded.total_events, views=excluded.views,
    install_copies=excluded.install_copies, saves=excluded.saves,
    compares=excluded.compares, outbound_clicks=excluded.outbound_clicks,
    claim_starts=excluded.claim_starts, claim_submits=excluded.claim_submits,
    resolve_requests=excluded.resolve_requests, install_starts=excluded.install_starts,
    install_successes=excluded.install_successes, install_failures=excluded.install_failures,
    agent_calls=excluded.agent_calls, outcome_successes=excluded.outcome_successes,
    outcome_failures=excluded.outcome_failures, share_copies=excluded.share_copies,
    last_event_at=excluded.last_event_at, updated_at=now();
  delete from public.skill_event_stats where skill_slug=p_skill_slug
    and not exists (select 1 from public.skill_events where skill_slug=p_skill_slug);
end; $$;

create or replace function private.refresh_skill_event_stats_for_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op='INSERT' then
    insert into public.skill_event_stats (
      skill_slug,total_events,views,install_copies,saves,compares,outbound_clicks,
      claim_starts,claim_submits,resolve_requests,install_starts,install_successes,
      install_failures,agent_calls,outcome_successes,outcome_failures,share_copies,
      last_event_at,updated_at
    ) values (
      new.skill_slug,1,(new.event_type='view')::integer,
      (new.event_type='install_copy')::integer,(new.event_type='save')::integer,
      (new.event_type='compare')::integer,
      (new.event_type in ('outbound_github','outbound_docs'))::integer,
      (new.event_type='claim_start')::integer,(new.event_type='claim_submit')::integer,
      (new.event_type='resolve_request')::integer,(new.event_type='install_start')::integer,
      (new.event_type='install_success')::integer,(new.event_type='install_failure')::integer,
      (new.event_type='agent_call')::integer,(new.event_type='outcome_success')::integer,
      (new.event_type='outcome_failure')::integer,(new.event_type='share_copy')::integer,
      new.created_at,now()
    ) on conflict(skill_slug) do update set
      total_events=public.skill_event_stats.total_events+excluded.total_events,
      views=public.skill_event_stats.views+excluded.views,
      install_copies=public.skill_event_stats.install_copies+excluded.install_copies,
      saves=public.skill_event_stats.saves+excluded.saves,
      compares=public.skill_event_stats.compares+excluded.compares,
      outbound_clicks=public.skill_event_stats.outbound_clicks+excluded.outbound_clicks,
      claim_starts=public.skill_event_stats.claim_starts+excluded.claim_starts,
      claim_submits=public.skill_event_stats.claim_submits+excluded.claim_submits,
      resolve_requests=public.skill_event_stats.resolve_requests+excluded.resolve_requests,
      install_starts=public.skill_event_stats.install_starts+excluded.install_starts,
      install_successes=public.skill_event_stats.install_successes+excluded.install_successes,
      install_failures=public.skill_event_stats.install_failures+excluded.install_failures,
      agent_calls=public.skill_event_stats.agent_calls+excluded.agent_calls,
      outcome_successes=public.skill_event_stats.outcome_successes+excluded.outcome_successes,
      outcome_failures=public.skill_event_stats.outcome_failures+excluded.outcome_failures,
      share_copies=public.skill_event_stats.share_copies+excluded.share_copies,
      last_event_at=greatest(public.skill_event_stats.last_event_at,excluded.last_event_at),updated_at=now();
    return new;
  end if;
  perform private.rebuild_skill_event_stats(old.skill_slug);
  if tg_op='UPDATE' and new.skill_slug is distinct from old.skill_slug then
    perform private.rebuild_skill_event_stats(new.skill_slug);
  end if;
  return coalesce(new, old);
end; $$;

create or replace function private.refresh_skill_events_daily_for_date(p_skill_slug text, p_event_date date)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.skill_events_daily (
    skill_slug,event_date,total_events,views,install_copies,saves,compares,
    outbound_clicks,claim_starts,claim_submits,resolve_requests,install_starts,
    install_successes,install_failures,agent_calls,outcome_successes,
    outcome_failures,share_copies,first_event_at,last_event_at,updated_at
  )
  select skill_slug,p_event_date,count(*)::integer,
    count(*) filter(where event_type='view')::integer,
    count(*) filter(where event_type='install_copy')::integer,
    count(*) filter(where event_type='save')::integer,
    count(*) filter(where event_type='compare')::integer,
    count(*) filter(where event_type in ('outbound_github','outbound_docs'))::integer,
    count(*) filter(where event_type='claim_start')::integer,
    count(*) filter(where event_type='claim_submit')::integer,
    count(*) filter(where event_type='resolve_request')::integer,
    count(*) filter(where event_type='install_start')::integer,
    count(*) filter(where event_type='install_success')::integer,
    count(*) filter(where event_type='install_failure')::integer,
    count(*) filter(where event_type='agent_call')::integer,
    count(*) filter(where event_type='outcome_success')::integer,
    count(*) filter(where event_type='outcome_failure')::integer,
    count(*) filter(where event_type='share_copy')::integer,
    min(created_at),max(created_at),now()
  from public.skill_events
  where skill_slug=p_skill_slug and created_at>=p_event_date::timestamptz
    and created_at<(p_event_date+1)::timestamptz group by skill_slug
  on conflict(skill_slug,event_date) do update set
    total_events=excluded.total_events,views=excluded.views,
    install_copies=excluded.install_copies,saves=excluded.saves,compares=excluded.compares,
    outbound_clicks=excluded.outbound_clicks,claim_starts=excluded.claim_starts,
    claim_submits=excluded.claim_submits,resolve_requests=excluded.resolve_requests,
    install_starts=excluded.install_starts,install_successes=excluded.install_successes,
    install_failures=excluded.install_failures,agent_calls=excluded.agent_calls,
    outcome_successes=excluded.outcome_successes,outcome_failures=excluded.outcome_failures,
    share_copies=excluded.share_copies,first_event_at=excluded.first_event_at,
    last_event_at=excluded.last_event_at,updated_at=now();
  delete from public.skill_events_daily where skill_slug=p_skill_slug and event_date=p_event_date
    and not exists(select 1 from public.skill_events where skill_slug=p_skill_slug
      and created_at>=p_event_date::timestamptz and created_at<(p_event_date+1)::timestamptz);
end; $$;

create or replace function private.refresh_skill_events_daily_for_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op='INSERT' then
    insert into public.skill_events_daily (
      skill_slug,event_date,total_events,views,install_copies,saves,compares,
      outbound_clicks,claim_starts,claim_submits,resolve_requests,install_starts,
      install_successes,install_failures,agent_calls,outcome_successes,outcome_failures,
      share_copies,first_event_at,last_event_at,updated_at
    ) values (
      new.skill_slug,new.created_at::date,1,(new.event_type='view')::integer,
      (new.event_type='install_copy')::integer,(new.event_type='save')::integer,
      (new.event_type='compare')::integer,
      (new.event_type in ('outbound_github','outbound_docs'))::integer,
      (new.event_type='claim_start')::integer,(new.event_type='claim_submit')::integer,
      (new.event_type='resolve_request')::integer,(new.event_type='install_start')::integer,
      (new.event_type='install_success')::integer,(new.event_type='install_failure')::integer,
      (new.event_type='agent_call')::integer,(new.event_type='outcome_success')::integer,
      (new.event_type='outcome_failure')::integer,(new.event_type='share_copy')::integer,
      new.created_at,new.created_at,now()
    ) on conflict(skill_slug,event_date) do update set
      total_events=public.skill_events_daily.total_events+excluded.total_events,
      views=public.skill_events_daily.views+excluded.views,
      install_copies=public.skill_events_daily.install_copies+excluded.install_copies,
      saves=public.skill_events_daily.saves+excluded.saves,
      compares=public.skill_events_daily.compares+excluded.compares,
      outbound_clicks=public.skill_events_daily.outbound_clicks+excluded.outbound_clicks,
      claim_starts=public.skill_events_daily.claim_starts+excluded.claim_starts,
      claim_submits=public.skill_events_daily.claim_submits+excluded.claim_submits,
      resolve_requests=public.skill_events_daily.resolve_requests+excluded.resolve_requests,
      install_starts=public.skill_events_daily.install_starts+excluded.install_starts,
      install_successes=public.skill_events_daily.install_successes+excluded.install_successes,
      install_failures=public.skill_events_daily.install_failures+excluded.install_failures,
      agent_calls=public.skill_events_daily.agent_calls+excluded.agent_calls,
      outcome_successes=public.skill_events_daily.outcome_successes+excluded.outcome_successes,
      outcome_failures=public.skill_events_daily.outcome_failures+excluded.outcome_failures,
      share_copies=public.skill_events_daily.share_copies+excluded.share_copies,
      first_event_at=least(public.skill_events_daily.first_event_at,excluded.first_event_at),
      last_event_at=greatest(public.skill_events_daily.last_event_at,excluded.last_event_at),updated_at=now();
    return new;
  end if;
  perform private.refresh_skill_events_daily_for_date(old.skill_slug,old.created_at::date);
  if tg_op='UPDATE' and (new.skill_slug,new.created_at::date) is distinct from (old.skill_slug,old.created_at::date) then
    perform private.refresh_skill_events_daily_for_date(new.skill_slug,new.created_at::date);
  end if;
  return coalesce(new,old);
end; $$;

grant select on public.profiles, public.skill_claims, public.skill_event_stats,
  public.skill_events_daily to anon, authenticated;
grant insert on public.skill_events to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
grant insert, update on public.skill_claims to authenticated;

comment on column public.skill_events.is_verified is
  'True only for server-side events backed by an install or outcome receipt.';
