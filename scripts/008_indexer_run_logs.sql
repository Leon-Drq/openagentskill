-- Private indexer run logs.
-- Automation writes and reads through INDEXER_SECRET-guarded RPCs.

create table if not exists public.indexer_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'bulk',
  status text not null default 'completed',
  filter_mode text not null default 'skills-only',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  target_new integer not null default 0,
  min_stars integer not null default 0,
  max_search_requests integer not null default 0,
  search_requests integer not null default 0,
  candidates_found integer not null default 0,
  skipped_existing integer not null default 0,
  skipped_mcp integer not null default 0,
  skipped_low_relevance integer not null default 0,
  imported integer not null default 0,
  updated integer not null default 0,
  errors integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.indexer_runs enable row level security;

drop policy if exists "indexer_runs_no_public_access" on public.indexer_runs;
create policy "indexer_runs_no_public_access"
  on public.indexer_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.indexer_runs from anon, authenticated;

create index if not exists idx_indexer_runs_started_at
  on public.indexer_runs (started_at desc);

create or replace function public.record_indexer_run(
  p_server_secret text,
  p_run jsonb
)
returns public.indexer_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_secret_hash constant text := '074705db488fc272fdd4913f06b11cf5ca05b79ceb8af005ecdb6e2479a0af01';
  v_run public.indexer_runs%rowtype;
begin
  if p_server_secret is null
    or encode(extensions.digest(p_server_secret, 'sha256'), 'hex') <> v_expected_secret_hash
  then
    raise exception 'Invalid server secret' using errcode = '28000';
  end if;

  insert into public.indexer_runs (
    mode,
    status,
    filter_mode,
    started_at,
    completed_at,
    target_new,
    min_stars,
    max_search_requests,
    search_requests,
    candidates_found,
    skipped_existing,
    skipped_mcp,
    skipped_low_relevance,
    imported,
    updated,
    errors,
    metadata
  )
  values (
    coalesce(nullif(p_run->>'mode', ''), 'bulk'),
    coalesce(nullif(p_run->>'status', ''), 'completed'),
    coalesce(nullif(p_run->>'filter_mode', ''), 'skills-only'),
    coalesce(nullif(p_run->>'started_at', '')::timestamptz, now()),
    nullif(p_run->>'completed_at', '')::timestamptz,
    coalesce((p_run->>'target_new')::integer, 0),
    coalesce((p_run->>'min_stars')::integer, 0),
    coalesce((p_run->>'max_search_requests')::integer, 0),
    coalesce((p_run->>'search_requests')::integer, 0),
    coalesce((p_run->>'candidates_found')::integer, 0),
    coalesce((p_run->>'skipped_existing')::integer, 0),
    coalesce((p_run->>'skipped_mcp')::integer, 0),
    coalesce((p_run->>'skipped_low_relevance')::integer, 0),
    coalesce((p_run->>'imported')::integer, 0),
    coalesce((p_run->>'updated')::integer, 0),
    coalesce((p_run->>'errors')::integer, 0),
    coalesce(p_run->'metadata', '{}'::jsonb)
  )
  returning * into v_run;

  return v_run;
end;
$$;

revoke all on function public.record_indexer_run(text, jsonb) from public;
grant execute on function public.record_indexer_run(text, jsonb) to anon;

create or replace function public.list_indexer_runs(
  p_server_secret text,
  p_limit integer default 20
)
returns setof public.indexer_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_secret_hash constant text := '074705db488fc272fdd4913f06b11cf5ca05b79ceb8af005ecdb6e2479a0af01';
begin
  if p_server_secret is null
    or encode(extensions.digest(p_server_secret, 'sha256'), 'hex') <> v_expected_secret_hash
  then
    raise exception 'Invalid server secret' using errcode = '28000';
  end if;

  return query
    select *
    from public.indexer_runs
    order by started_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

revoke all on function public.list_indexer_runs(text, integer) from public;
grant execute on function public.list_indexer_runs(text, integer) to anon;
