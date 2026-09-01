-- Durable, server-only candidate intake for high-volume GitHub discovery.
-- Candidates are deliberately separated from public.skills so discovery can
-- scale without creating public/SEO pages before validation.

create table if not exists public.skill_candidates (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  github_repository_id bigint,
  github_full_name text not null,
  github_owner text not null,
  github_repo text not null,
  source_ref text,
  source_path text not null default '',
  canonical_source_url text not null,
  source_content_hash text,
  skill_name text,
  skill_description text,
  github_stars integer not null default 0 check (github_stars >= 0),
  github_updated_at timestamptz,
  license text,
  license_status text not null default 'unknown'
    check (license_status in ('unknown', 'missing', 'restricted', 'detected')),
  status text not null default 'discovered'
    check (status in (
      'discovered', 'validating', 'expanded', 'fast_track',
      'review_required', 'publishing', 'published', 'rejected',
      'duplicate', 'validation_error', 'publication_error'
    )),
  risk_level text not null default 'unknown'
    check (risk_level in ('unknown', 'low', 'medium', 'high', 'critical')),
  risk_reasons text[] not null default '{}',
  has_executable_files boolean not null default false,
  fast_track_eligible boolean not null default false,
  requires_ai_review boolean not null default true,
  duplicate_of uuid references public.skill_candidates(id) on delete set null,
  published_skill_slug text references public.skills(slug) on delete set null,
  discovery_source text not null default 'github-search',
  discovery_payload jsonb not null default '{}'::jsonb,
  validation_payload jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_error text,
  discovered_at timestamptz not null default now(),
  validated_at timestamptz,
  published_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.skill_candidates is
  'Server-only GitHub discovery queue. Rows are not public listings and must never enter SEO surfaces before publication.';

create unique index if not exists skill_candidates_repo_path_unique
  on public.skill_candidates (github_repository_id, source_path)
  where github_repository_id is not null;

create unique index if not exists skill_candidates_canonical_source_unique
  on public.skill_candidates (lower(canonical_source_url));

create index if not exists skill_candidates_claim_idx
  on public.skill_candidates (status, next_attempt_at, github_stars desc, discovered_at)
  where status in (
    'discovered', 'fast_track', 'review_required',
    'validation_error', 'publication_error'
  );

create index if not exists skill_candidates_content_hash_idx
  on public.skill_candidates (source_content_hash)
  where source_content_hash is not null;

-- Prevent concurrent workers from promoting the same exact package content.
-- Rejected/duplicate rows are deliberately excluded so they remain auditable.
create unique index if not exists skill_candidates_active_content_unique
  on public.skill_candidates (source_content_hash)
  where source_content_hash is not null
    and status in ('fast_track', 'review_required', 'publishing', 'published', 'publication_error');

create index if not exists skill_candidates_lease_idx
  on public.skill_candidates (lease_expires_at)
  where lease_expires_at is not null;

alter table public.skill_candidates enable row level security;

-- This queue is internal. It is intentionally invisible to browser clients.
revoke all on table public.skill_candidates from public, anon, authenticated;
grant select, insert, update, delete on table public.skill_candidates to service_role;

create or replace function public.claim_skill_candidates(
  p_statuses text[],
  p_limit integer,
  p_worker_id text,
  p_lease_seconds integer default 240
)
returns setof public.skill_candidates
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_worker_id is null or length(trim(p_worker_id)) < 8 then
    raise exception 'A stable worker id is required';
  end if;

  return query
  with available as (
    select candidate.id
    from public.skill_candidates candidate
    where candidate.status = any(p_statuses)
      and candidate.next_attempt_at <= now()
      and (candidate.lease_expires_at is null or candidate.lease_expires_at <= now())
    order by candidate.github_stars desc, candidate.discovered_at asc
    for update skip locked
    limit least(greatest(coalesce(p_limit, 1), 1), 250)
  )
  update public.skill_candidates candidate
  set
    lease_owner = trim(p_worker_id),
    lease_expires_at = now() + make_interval(secs => least(greatest(coalesce(p_lease_seconds, 240), 60), 900)),
    attempt_count = candidate.attempt_count + 1,
    updated_at = now()
  from available
  where candidate.id = available.id
  returning candidate.*;
end;
$$;

revoke all on function public.claim_skill_candidates(text[], integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_skill_candidates(text[], integer, text, integer)
  to service_role;

create or replace function public.touch_skill_candidates_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_skill_candidates_updated_at()
  from public, anon, authenticated;
grant execute on function public.touch_skill_candidates_updated_at()
  to service_role;

drop trigger if exists touch_skill_candidates_updated_at on public.skill_candidates;
create trigger touch_skill_candidates_updated_at
before update on public.skill_candidates
for each row execute function public.touch_skill_candidates_updated_at();
