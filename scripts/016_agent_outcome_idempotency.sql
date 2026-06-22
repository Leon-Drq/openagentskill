-- Make agent outcome reporting idempotent for retrying agents.

create unique index if not exists agent_outcomes_event_id_unique_idx
  on public.agent_outcomes (event_id);

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
  v_event_id text;
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
  v_event_id := left(coalesce(nullif(trim(p_event_id), ''), 'manual'), 200);

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
    v_event_id,
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
      'resolve_event_id', v_event_id,
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
    and metadata->>'resolve_event_id' = v_event_id;

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
      'resolve_event_id', v_event_id,
      'outcome', p_outcome
    )
  );

  return jsonb_build_object(
    'id', v_id,
    'event_id', v_event_id,
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

revoke all on function public.record_agent_outcome(text, text, text, text, text, boolean, boolean, boolean, integer, text, jsonb) from public;
grant execute on function public.record_agent_outcome(text, text, text, text, text, boolean, boolean, boolean, integer, text, jsonb) to anon;
