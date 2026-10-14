-- Count operations, not unique visitors/days. Preserve existing file/action RPCs.
-- Lock the evidence sources during the one-time backfill so live Agent reports
-- cannot race with the aggregate rebuild. No source/review records are modified.
lock table public.agent_outcomes, public.skill_feedback in share row exclusive mode;
alter table public.skill_download_receipts drop constraint skill_download_receipts_pkey;
alter table public.skill_download_receipts
  alter column actor_key drop not null,
  add column id uuid not null default gen_random_uuid() primary key,
  add column source_event_key text unique,
  drop constraint download_receipt_actor,
  drop constraint download_receipt_kind,
  drop constraint download_receipt_artifact;
alter table public.skill_download_receipts
  add constraint download_receipt_kind check (artifact_kind in ('skill-document','paid-file','command-copy','external-open','agent-use')),
  add constraint download_receipt_actor check (
    (source_event_key is null and ((user_id is not null) <> (visitor_key is not null))) or
    (source_event_key is not null and user_id is null and visitor_key is null
      and artifact_kind in ('command-copy','external-open','agent-use'))),
  add constraint download_receipt_artifact check (
    (artifact_kind in ('skill-document','paid-file') and artifact_sha256 is not null) or
    (artifact_kind in ('command-copy','external-open','agent-use') and artifact_sha256 is null));

-- Used by both backfill and live triggers. Exclude explicit QA/dry-run records,
-- browser feedback widgets and the duplicate feedback mirror of an outcome.
create function private.is_download_agent_usage(p_agent text, p_event text, p_metadata jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(p_agent, '') !~* '(^|[-_ :])(test|smoke|fixture|eval)([-_ :]|$)'
    and coalesce(p_event, '') !~* '(^|[-_ :])(test|smoke|fixture|eval)([-_ :]|$)'
    and coalesce(p_metadata->>'source', '') !~* '(^|[-_ :])(test|smoke|fixture|eval)([-_ :]|$)'
    and coalesce(p_metadata->>'dry_run', 'false') <> 'true'
    and coalesce(p_metadata->>'test', 'false') <> 'true';
$$;

create function private.record_download_agent_usage()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare evidence_key text; total bigint;
begin
  if tg_table_name = 'agent_outcomes' then
    if new.outcome not in ('success','failed') or new.risk_blocked or new.setup_required
      or not private.is_download_agent_usage(new.agent, new.event_id, new.metadata) then return new; end if;
    evidence_key := 'outcome:' || new.id::text;
  else
    if coalesce(new.metadata->>'source', '') in ('agent_outcome','skill_detail_page','web-widget')
      or new.agent_id like 'web-user-%'
      or not private.is_download_agent_usage(new.agent_id, null, new.metadata) then return new; end if;
    evidence_key := 'feedback:' || new.id::text;
  end if;
  insert into public.skill_download_receipts(skill_slug, artifact_kind, source_event_key, created_at)
  values(new.skill_slug, 'agent-use', evidence_key, new.created_at)
  on conflict (source_event_key) do nothing;
  -- A network retry/correction of the SAME outcome is still one execution.
  -- Separate executions by the same Agent, account or day always count again.
  if not found then return new; end if;
  insert into public.skill_download_totals(skill_slug, downloads) values(new.skill_slug, 1)
  on conflict(skill_slug) do update set downloads = public.skill_download_totals.downloads + 1, updated_at = now()
  returning downloads into total;
  update public.skills set site_downloads = total where slug = new.skill_slug;
  return new;
end $$;
revoke all on function private.is_download_agent_usage(text,text,jsonb), private.record_download_agent_usage() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.is_download_agent_usage(text,text,jsonb), private.record_download_agent_usage() to service_role;
create trigger record_outcome_site_download after insert or update on public.agent_outcomes
  for each row execute function private.record_download_agent_usage();
create trigger record_feedback_site_download after insert on public.skill_feedback
  for each row execute function private.record_download_agent_usage();

-- Historical web actions predate the separate download ledger. Stop at its
-- first interaction receipt, conservatively avoiding overlap with dual telemetry
-- during rollout. Do not import prompt copies, views, legacy estimates or tests.
with cutoff as (
  select coalesce(min(created_at), now()) as started_at from public.skill_download_receipts
  where artifact_kind in ('command-copy','external-open') and source_event_key is null
)
insert into public.skill_download_receipts(skill_slug, artifact_kind, source_event_key, created_at, download_day)
select e.skill_slug, case when e.event_type = 'install_copy' then 'command-copy' else 'external-open' end,
  'web:' || e.id::text, e.created_at, (e.created_at at time zone 'UTC')::date
from public.skill_events e cross join cutoff
where e.created_at < cutoff.started_at and e.source = 'web'
  and (e.event_type in ('outbound_github','outbound_docs') or
    (e.event_type = 'install_copy' and coalesce(e.metadata->>'kind','command') = 'command'))
  and e.skill_slug ~ '^[a-z0-9][a-z0-9-]{0,199}$'
  and private.is_download_agent_usage(null, e.event_key, e.metadata)
on conflict (source_event_key) do nothing;

insert into public.skill_download_receipts(skill_slug, artifact_kind, source_event_key, created_at, download_day)
select skill_slug, 'agent-use', 'outcome:' || id::text, created_at, (created_at at time zone 'UTC')::date
from public.agent_outcomes
where outcome in ('success','failed') and not risk_blocked and not setup_required
  and skill_slug ~ '^[a-z0-9][a-z0-9-]{0,199}$'
  and private.is_download_agent_usage(agent, event_id, metadata)
on conflict (source_event_key) do nothing;
insert into public.skill_download_receipts(skill_slug, artifact_kind, source_event_key, created_at, download_day)
select skill_slug, 'agent-use', 'feedback:' || id::text, created_at, (created_at at time zone 'UTC')::date
from public.skill_feedback
where coalesce(metadata->>'source','') not in ('agent_outcome','skill_detail_page','web-widget')
  and agent_id not like 'web-user-%' and skill_slug ~ '^[a-z0-9][a-z0-9-]{0,199}$'
  and private.is_download_agent_usage(agent_id, null, metadata)
on conflict (source_event_key) do nothing;

-- Add only receipts imported above: aggregate totals can legitimately retain
-- deleted-account downloads after the account's private receipts are removed.
insert into public.skill_download_totals(skill_slug, downloads)
select skill_slug, count(*) from public.skill_download_receipts
where source_event_key is not null group by skill_slug
on conflict(skill_slug) do update set downloads = public.skill_download_totals.downloads + excluded.downloads, updated_at = now();
update public.skills s set site_downloads = t.downloads
from public.skill_download_totals t where s.slug = t.skill_slug and s.site_downloads <> t.downloads;
comment on column public.skills.site_downloads is 'Recorded site file downloads, command copies, source exits and reported Agent executions. Each operation counts; not unique users or verified installations. Includes historical event evidence; excludes legacy estimates and explicit QA reports.';
notify pgrst, 'reload schema';
