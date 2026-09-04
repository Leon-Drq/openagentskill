-- Public, low-cost coverage counters for the three registry layers.
-- Candidate rows stay private; only aggregate counts are exposed.

create table if not exists public.registry_coverage_stats (
  id boolean primary key default true check (id),
  discovered_projects bigint not null default 0 check (discovered_projects >= 0),
  validated_skills bigint not null default 0 check (validated_skills >= 0),
  installable_skills bigint not null default 0 check (installable_skills >= 0),
  agent_proven_skills bigint not null default 0 check (agent_proven_skills >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.registry_coverage_stats is
  'Aggregate registry coverage only. Discovered candidates remain private and never create SEO pages.';

alter table public.registry_coverage_stats enable row level security;

drop policy if exists registry_coverage_stats_select_public on public.registry_coverage_stats;
create policy registry_coverage_stats_select_public
  on public.registry_coverage_stats
  for select
  to anon, authenticated
  using (true);

revoke all on table public.registry_coverage_stats from public, anon, authenticated;
grant select on table public.registry_coverage_stats to anon, authenticated;
grant select, insert, update on table public.registry_coverage_stats to service_role;

-- These indexes match the two expensive parts of the hourly aggregate refresh:
-- distinct repository identities and validated, non-terminal candidates.
create index if not exists skill_candidates_repository_identity_idx
  on public.skill_candidates (
    (coalesce(github_repository_id::text, lower(github_full_name)))
  );

create index if not exists skill_candidates_validated_coverage_idx
  on public.skill_candidates (status, validated_at)
  where source_content_hash is not null
    and skill_name is not null;

create or replace function public.refresh_registry_coverage_stats()
returns public.registry_coverage_stats
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.registry_coverage_stats;
begin
  insert into public.registry_coverage_stats (
    id,
    discovered_projects,
    validated_skills,
    installable_skills,
    agent_proven_skills,
    updated_at
  )
  select
    true,
    (
      select count(*)
      from (
        select coalesce(github_repository_id::text, lower(github_full_name)) as repository_identity
        from public.skill_candidates
        union
        select lower(github_repo) as repository_identity
        from public.skills
        where ai_review_approved = true
          and github_repo is not null
          and length(trim(github_repo)) > 0
      ) repositories
      where repository_identity is not null
    ),
    (
      select
        count(*) filter (where ai_review_approved = true)
        + (
          select count(*)
          from public.skill_candidates
          where source_content_hash is not null
            and skill_name is not null
            and published_skill_slug is null
            and status in ('fast_track', 'review_required', 'publishing', 'publication_error')
        )
      from public.skills
    ),
    (select count(*) from public.skills where ai_review_approved = true),
    (select count(*) from public.agent_outcome_stats where total_outcomes > 0),
    now()
  on conflict (id) do update set
    discovered_projects = excluded.discovered_projects,
    validated_skills = excluded.validated_skills,
    installable_skills = excluded.installable_skills,
    agent_proven_skills = excluded.agent_proven_skills,
    updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.refresh_registry_coverage_stats()
  from public, anon, authenticated;
grant execute on function public.refresh_registry_coverage_stats()
  to service_role;

-- Seed the counter during migration. Subsequent refreshes are performed by the
-- discovery worker once per hour, keeping request-time reads O(1).
select public.refresh_registry_coverage_stats();
