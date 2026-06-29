-- Agent Proven Score for OpenAgentSkill.
-- Extends aggregate-only outcome stats without exposing raw agent notes.

alter table public.agent_outcome_stats
  add column if not exists install_success_rate numeric,
  add column if not exists avg_output_quality numeric,
  add column if not exists avg_time_to_useful_ms numeric,
  add column if not exists production_outcomes integer not null default 0,
  add column if not exists human_review_required_outcomes integer not null default 0,
  add column if not exists low_quality_outcomes integer not null default 0,
  add column if not exists recent_outcomes_30d integer not null default 0,
  add column if not exists recent_successful_outcomes_30d integer not null default 0,
  add column if not exists recent_failed_outcomes_30d integer not null default 0,
  add column if not exists recent_success_rate numeric,
  add column if not exists recent_failure_rate numeric,
  add column if not exists unique_agents integer not null default 0,
  add column if not exists agent_proven_score numeric,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_failure_at timestamptz;

create index if not exists agent_outcome_stats_proven_score_idx
  on public.agent_outcome_stats (agent_proven_score desc nulls last, total_outcomes desc);

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
    install_success_rate,
    avg_output_quality,
    avg_time_to_useful_ms,
    production_outcomes,
    human_review_required_outcomes,
    low_quality_outcomes,
    recent_outcomes_30d,
    recent_successful_outcomes_30d,
    recent_failed_outcomes_30d,
    recent_success_rate,
    recent_failure_rate,
    unique_agents,
    agent_proven_score,
    last_success_at,
    last_failure_at,
    last_outcome_at,
    updated_at
  )
  with base as (
    select
      skill_slug,
      outcome,
      install_used,
      risk_blocked,
      setup_required,
      agent,
      time_to_useful_ms,
      created_at,
      metadata,
      case
        when metadata->>'output_quality' ~ '^[0-9]+(\.[0-9]+)?$'
          then (metadata->>'output_quality')::numeric
        else null
      end as output_quality,
      lower(coalesce(metadata->>'used_in_production', 'false')) = 'true' as used_in_production,
      lower(coalesce(metadata->>'human_review_required', 'false')) = 'true' as human_review_required
    from public.agent_outcomes
    where skill_slug = p_skill_slug
  ),
  aggregate as (
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
      round(
        (count(*) filter (where install_used and outcome = 'success')::numeric / nullif(count(*) filter (where install_used), 0)) * 100,
        1
      ) as install_success_rate,
      round(avg(output_quality), 2) as avg_output_quality,
      round(avg(time_to_useful_ms)::numeric, 0) as avg_time_to_useful_ms,
      count(*) filter (where used_in_production)::integer as production_outcomes,
      count(*) filter (where human_review_required)::integer as human_review_required_outcomes,
      count(*) filter (where output_quality is not null and output_quality <= 2)::integer as low_quality_outcomes,
      count(*) filter (where created_at >= now() - interval '30 days')::integer as recent_outcomes_30d,
      count(*) filter (where created_at >= now() - interval '30 days' and outcome = 'success')::integer as recent_successful_outcomes_30d,
      count(*) filter (where created_at >= now() - interval '30 days' and outcome in ('failed', 'not_relevant', 'blocked_by_risk', 'setup_required'))::integer as recent_failed_outcomes_30d,
      round(
        (count(*) filter (where created_at >= now() - interval '30 days' and outcome = 'success')::numeric /
          nullif(count(*) filter (where created_at >= now() - interval '30 days'), 0)) * 100,
        1
      ) as recent_success_rate,
      round(
        (count(*) filter (where created_at >= now() - interval '30 days' and outcome in ('failed', 'not_relevant', 'blocked_by_risk', 'setup_required'))::numeric /
          nullif(count(*) filter (where created_at >= now() - interval '30 days'), 0)) * 100,
        1
      ) as recent_failure_rate,
      count(distinct agent)::integer as unique_agents,
      max(created_at) filter (where outcome = 'success') as last_success_at,
      max(created_at) filter (where outcome <> 'success') as last_failure_at,
      max(created_at) as last_outcome_at
    from base
    group by skill_slug
  ),
  scored as (
    select
      aggregate.*,
      round(
        greatest(
          0,
          least(
            100,
            case
              when total_outcomes = 0 then 0
              else
                22
                + least(18, ln(total_outcomes + 1) * 7.9)
                + least(12, ln(install_attempts + 1) * 5.5)
                + (
                    (
                      (successful_outcomes + (0.68 * 5))::numeric /
                      nullif(total_outcomes + 5, 0)
                    ) * 100 - 55
                  ) * 0.52
                + coalesce((avg_output_quality - 3) * 5, 0)
                + least(7, production_outcomes * 1.5)
                + least(6, unique_agents * 1.5)
                - least(22, risk_blocked_outcomes * 4)
                - least(16, setup_required_outcomes * 2.4)
                - least(16, not_relevant_outcomes * 3)
                - least(12, failed_outcomes * 1.8)
                - least(10, low_quality_outcomes * 2.5)
                - least(8, human_review_required_outcomes * 1.5)
                - case when coalesce(recent_failure_rate, 0) >= 45 then 8 else 0 end
            end
          )
        )::numeric,
        1
      ) as computed_agent_proven_score
    from aggregate
  )
  select
    skill_slug,
    total_outcomes,
    successful_outcomes,
    failed_outcomes,
    not_relevant_outcomes,
    risk_blocked_outcomes,
    setup_required_outcomes,
    install_attempts,
    success_rate,
    install_success_rate,
    avg_output_quality,
    avg_time_to_useful_ms,
    production_outcomes,
    human_review_required_outcomes,
    low_quality_outcomes,
    recent_outcomes_30d,
    recent_successful_outcomes_30d,
    recent_failed_outcomes_30d,
    recent_success_rate,
    recent_failure_rate,
    unique_agents,
    computed_agent_proven_score,
    last_success_at,
    last_failure_at,
    last_outcome_at,
    now() as updated_at
  from scored
  on conflict (skill_slug) do update set
    total_outcomes = excluded.total_outcomes,
    successful_outcomes = excluded.successful_outcomes,
    failed_outcomes = excluded.failed_outcomes,
    not_relevant_outcomes = excluded.not_relevant_outcomes,
    risk_blocked_outcomes = excluded.risk_blocked_outcomes,
    setup_required_outcomes = excluded.setup_required_outcomes,
    install_attempts = excluded.install_attempts,
    success_rate = excluded.success_rate,
    install_success_rate = excluded.install_success_rate,
    avg_output_quality = excluded.avg_output_quality,
    avg_time_to_useful_ms = excluded.avg_time_to_useful_ms,
    production_outcomes = excluded.production_outcomes,
    human_review_required_outcomes = excluded.human_review_required_outcomes,
    low_quality_outcomes = excluded.low_quality_outcomes,
    recent_outcomes_30d = excluded.recent_outcomes_30d,
    recent_successful_outcomes_30d = excluded.recent_successful_outcomes_30d,
    recent_failed_outcomes_30d = excluded.recent_failed_outcomes_30d,
    recent_success_rate = excluded.recent_success_rate,
    recent_failure_rate = excluded.recent_failure_rate,
    unique_agents = excluded.unique_agents,
    agent_proven_score = excluded.agent_proven_score,
    last_success_at = excluded.last_success_at,
    last_failure_at = excluded.last_failure_at,
    last_outcome_at = excluded.last_outcome_at,
    updated_at = now();
end;
$$;

do $$
declare
  v_skill_slug text;
begin
  for v_skill_slug in select distinct skill_slug from public.agent_outcomes loop
    perform public.refresh_agent_outcome_stats_for_skill(v_skill_slug);
  end loop;
end;
$$;

revoke all on function public.refresh_agent_outcome_stats_for_skill(text) from public;
grant select on table public.agent_outcome_stats to anon, authenticated;
