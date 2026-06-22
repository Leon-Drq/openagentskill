-- Agent outcome loop for OpenAgentSkill Resolve.
-- Raw outcome rows stay locked behind RLS; public clients write through
-- record_agent_outcome and read only aggregate adoption signals.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.agent_outcomes (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  skill_slug text not null references public.skills(slug) on delete cascade,
  task text not null,
  agent text not null default 'auto',
  outcome text not null check (
    outcome in ('success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required')
  ),
  install_used boolean not null default false,
  risk_blocked boolean not null default false,
  setup_required boolean not null default false,
  time_to_useful_ms integer check (time_to_useful_ms is null or time_to_useful_ms >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_outcomes_skill_created_idx
  on public.agent_outcomes (skill_slug, created_at desc);
create index if not exists agent_outcomes_event_id_idx
  on public.agent_outcomes (event_id);
create unique index if not exists agent_outcomes_event_id_unique_idx
  on public.agent_outcomes (event_id);
create index if not exists agent_outcomes_outcome_idx
  on public.agent_outcomes (outcome);
create index if not exists agent_outcomes_agent_idx
  on public.agent_outcomes (agent);

alter table public.agent_outcomes enable row level security;

revoke all on table public.agent_outcomes from anon, authenticated;

create table if not exists public.agent_outcome_stats (
  skill_slug text primary key references public.skills(slug) on delete cascade,
  total_outcomes integer not null default 0,
  successful_outcomes integer not null default 0,
  failed_outcomes integer not null default 0,
  not_relevant_outcomes integer not null default 0,
  risk_blocked_outcomes integer not null default 0,
  setup_required_outcomes integer not null default 0,
  install_attempts integer not null default 0,
  success_rate numeric,
  last_outcome_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.agent_outcome_stats enable row level security;

drop policy if exists "Agent outcome stats are public" on public.agent_outcome_stats;
create policy "Agent outcome stats are public"
on public.agent_outcome_stats
for select
to anon, authenticated
using (true);

grant select on table public.agent_outcome_stats to anon, authenticated;

create or replace function public.refresh_agent_outcome_stats_for_skill(p_skill_slug text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_skill_slug is null or length(trim(p_skill_slug)) = 0 then
    return;
  end if;

  if not exists (select 1 from public.agent_outcomes where skill_slug = p_skill_slug) then
    delete from public.agent_outcome_stats where skill_slug = p_skill_slug;
    return;
  end if;

  insert into public.agent_outcome_stats (
    skill_slug,
    total_outcomes,
    successful_outcomes,
    failed_outcomes,
    not_relevant_outcomes,
    risk_blocked_outcomes,
    setup_required_outcomes,
    install_attempts,
    success_rate,
    last_outcome_at,
    updated_at
  )
  select
    skill_slug,
    count(*)::integer as total_outcomes,
    count(*) filter (where outcome = 'success')::integer as successful_outcomes,
    count(*) filter (where outcome = 'failed')::integer as failed_outcomes,
    count(*) filter (where outcome = 'not_relevant')::integer as not_relevant_outcomes,
    count(*) filter (where outcome = 'blocked_by_risk' or risk_blocked)::integer as risk_blocked_outcomes,
    count(*) filter (where outcome = 'setup_required' or setup_required)::integer as setup_required_outcomes,
    count(*) filter (where install_used)::integer as install_attempts,
    round(
      (count(*) filter (where outcome = 'success')::numeric / nullif(count(*), 0)) * 100,
      1
    ) as success_rate,
    max(created_at) as last_outcome_at,
    now() as updated_at
  from public.agent_outcomes
  where skill_slug = p_skill_slug
  group by skill_slug
  on conflict (skill_slug) do update set
    total_outcomes = excluded.total_outcomes,
    successful_outcomes = excluded.successful_outcomes,
    failed_outcomes = excluded.failed_outcomes,
    not_relevant_outcomes = excluded.not_relevant_outcomes,
    risk_blocked_outcomes = excluded.risk_blocked_outcomes,
    setup_required_outcomes = excluded.setup_required_outcomes,
    install_attempts = excluded.install_attempts,
    success_rate = excluded.success_rate,
    last_outcome_at = excluded.last_outcome_at,
    updated_at = now();
end;
$$;

create or replace function public.refresh_agent_outcome_stats_for_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_slug text;
  v_new_slug text;
begin
  v_old_slug := case when tg_op in ('UPDATE', 'DELETE') then old.skill_slug else null end;
  v_new_slug := case when tg_op in ('INSERT', 'UPDATE') then new.skill_slug else null end;

  if v_old_slug is not null then
    perform public.refresh_agent_outcome_stats_for_skill(v_old_slug);
  end if;

  if v_new_slug is not null and (v_old_slug is null or v_new_slug <> v_old_slug) then
    perform public.refresh_agent_outcome_stats_for_skill(v_new_slug);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_agent_outcome_stats_after_change on public.agent_outcomes;
create trigger refresh_agent_outcome_stats_after_change
after insert or update or delete on public.agent_outcomes
for each row execute function public.refresh_agent_outcome_stats_for_event();

create or replace function public.record_agent_outcome(
  p_event_id text,
  p_skill_slug text,
  p_task text,
  p_agent text default 'auto',
  p_outcome text default 'success',
  p_install_used boolean default false,
  p_risk_blocked boolean default false,
  p_setup_required boolean default false,
  p_time_to_useful_ms integer default null,
  p_notes text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_skill record;
  v_id uuid;
  v_success boolean;
begin
  if p_outcome not in ('success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required') then
    return jsonb_build_object('error', 'invalid_outcome');
  end if;

  select id, slug
  into v_skill
  from public.skills
  where slug = p_skill_slug
    and coalesce(ai_review_approved, false) = true
  limit 1;

  if not found then
    return jsonb_build_object('error', 'skill_not_found');
  end if;

  v_success := p_outcome = 'success';

  insert into public.agent_outcomes (
    event_id,
    skill_slug,
    task,
    agent,
    outcome,
    install_used,
    risk_blocked,
    setup_required,
    time_to_useful_ms,
    notes,
    metadata
  )
  values (
    left(coalesce(nullif(trim(p_event_id), ''), 'manual'), 200),
    p_skill_slug,
    left(coalesce(nullif(trim(p_task), ''), 'Unspecified task'), 2000),
    left(coalesce(nullif(trim(p_agent), ''), 'auto'), 120),
    p_outcome,
    coalesce(p_install_used, false),
    coalesce(p_risk_blocked, p_outcome = 'blocked_by_risk', false),
    coalesce(p_setup_required, p_outcome = 'setup_required', false),
    p_time_to_useful_ms,
    left(p_notes, 3000),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', 'agent_outcome',
      'resolve_event_id', left(coalesce(nullif(trim(p_event_id), ''), 'manual'), 200),
      'outcome', p_outcome,
      'install_used', coalesce(p_install_used, false),
      'risk_blocked', coalesce(p_risk_blocked, p_outcome = 'blocked_by_risk', false),
      'setup_required', coalesce(p_setup_required, p_outcome = 'setup_required', false)
    )
  )
  on conflict (event_id) do update set
    skill_slug = excluded.skill_slug,
    task = excluded.task,
    agent = excluded.agent,
    outcome = excluded.outcome,
    install_used = excluded.install_used,
    risk_blocked = excluded.risk_blocked,
    setup_required = excluded.setup_required,
    time_to_useful_ms = excluded.time_to_useful_ms,
    notes = excluded.notes,
    metadata = excluded.metadata
  returning id into v_id;

  delete from public.skill_feedback
  where metadata->>'source' = 'agent_outcome'
    and metadata->>'resolve_event_id' = left(coalesce(nullif(trim(p_event_id), ''), 'manual'), 200);

  insert into public.skill_feedback (
    skill_slug,
    agent_id,
    success,
    latency_ms,
    error_message,
    metadata
  )
  values (
    p_skill_slug,
    left(coalesce(nullif(trim(p_agent), ''), 'auto'), 120),
    v_success,
    p_time_to_useful_ms,
    case when v_success then null else left(p_notes, 2000) end,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', 'agent_outcome',
      'agent_outcome_id', v_id,
      'resolve_event_id', left(coalesce(nullif(trim(p_event_id), ''), 'manual'), 200),
      'outcome', p_outcome
    )
  );

  return jsonb_build_object(
    'id', v_id,
    'event_id', left(coalesce(nullif(trim(p_event_id), ''), 'manual'), 200),
    'skill_slug', p_skill_slug,
    'agent', left(coalesce(nullif(trim(p_agent), ''), 'auto'), 120),
    'outcome', p_outcome,
    'success', v_success,
    'install_used', coalesce(p_install_used, false),
    'risk_blocked', coalesce(p_risk_blocked, p_outcome = 'blocked_by_risk', false),
    'setup_required', coalesce(p_setup_required, p_outcome = 'setup_required', false)
  );
end;
$$;

revoke all on function public.refresh_agent_outcome_stats_for_skill(text) from public;
revoke all on function public.refresh_agent_outcome_stats_for_event() from public;
revoke all on function public.record_agent_outcome(text, text, text, text, text, boolean, boolean, boolean, integer, text, jsonb) from public;
grant execute on function public.record_agent_outcome(text, text, text, text, text, boolean, boolean, boolean, integer, text, jsonb) to anon;
