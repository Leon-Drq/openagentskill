-- Creator ownership foundation: verifiable identities, repository claims,
-- source provenance, version history, and explicit license evidence.

alter table public.profiles
  add column if not exists github_user_id bigint,
  add column if not exists github_verified_at timestamptz,
  add column if not exists x_user_id text,
  add column if not exists x_verified_at timestamptz;

create unique index if not exists profiles_github_user_id_unique
  on public.profiles (github_user_id) where github_user_id is not null;
create unique index if not exists profiles_x_user_id_unique
  on public.profiles (x_user_id) where x_user_id is not null;

alter table public.skill_claims
  add column if not exists verified_at timestamptz,
  add column if not exists verification_tier text not null default 'maintainer',
  add column if not exists challenge_token_hash text,
  add column if not exists challenge_expires_at timestamptz;

alter table public.skill_claims
  drop constraint if exists skill_claims_verification_method_check,
  add constraint skill_claims_verification_method_check check (
    verification_method = any (array[
      'github_profile', 'github_oauth', 'repository_file',
      'repository_issue', 'website_link', 'manual'
    ])
  ),
  drop constraint if exists skill_claims_verification_tier_check,
  add constraint skill_claims_verification_tier_check check (
    verification_tier = any (array['maintainer', 'official'])
  ),
  drop constraint if exists skill_claims_verified_state_check,
  add constraint skill_claims_verified_state_check check (
    (status <> 'approved') or verified_at is not null
  );

alter table public.skills
  add column if not exists source_commit_sha text,
  add column if not exists source_content_hash text,
  add column if not exists source_sync_status text not null default 'untracked',
  add column if not exists license_source text not null default 'unknown',
  add column if not exists license_status text not null default 'unknown';

alter table public.skills
  drop constraint if exists skills_source_sync_status_check,
  add constraint skills_source_sync_status_check check (
    source_sync_status = any (array['untracked', 'current', 'changed', 'error'])
  ),
  drop constraint if exists skills_license_source_check,
  add constraint skills_license_source_check check (
    license_source = any (array['skill_frontmatter', 'github_repository', 'manual', 'unknown'])
  ),
  drop constraint if exists skills_license_status_check,
  add constraint skills_license_status_check check (
    license_status = any (array['detected', 'missing', 'unknown', 'restricted'])
  );

update public.skills set
  license_source = case
    when coalesce(trim(license), '') = '' or lower(trim(license)) in ('unknown', 'noassertion', 'other') then 'unknown'
    else 'github_repository'
  end,
  license_status = case
    when coalesce(trim(license), '') = '' or lower(trim(license)) in ('unknown', 'noassertion', 'other') then 'missing'
    when lower(license) like '%non-commercial%' or lower(license) like '%cc-by-nc%' then 'restricted'
    else 'detected'
  end;

create table if not exists public.skill_versions (
  id uuid primary key default gen_random_uuid(),
  skill_slug text not null references public.skills(slug) on delete cascade,
  version text not null default '1.0.0',
  source_commit_sha text,
  source_content_hash text not null,
  source_ref text,
  source_path text,
  license text not null default 'Unknown',
  license_source text not null default 'unknown',
  detected_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (skill_slug, source_content_hash)
);

create index if not exists skill_versions_skill_detected_idx
  on public.skill_versions (skill_slug, detected_at desc);

alter table public.skill_versions enable row level security;
drop policy if exists skill_versions_select_approved on public.skill_versions;
create policy skill_versions_select_approved
  on public.skill_versions for select to anon, authenticated
  using (exists (
    select 1 from public.skills
    where skills.slug = skill_versions.skill_slug
      and skills.ai_review_approved = true
  ));

-- A one-time challenge is sensitive until it is consumed. Keep it out of
-- public SELECT grants even though approved claims themselves are public.
revoke all on public.skill_claims from anon, authenticated;
grant select (
  id, skill_slug, user_id, github_username, x_username, repo_url,
  verification_method, evidence_url, evidence_note, status, reviewer_note,
  metadata, created_at, updated_at, verified_at, verification_tier,
  challenge_expires_at
) on public.skill_claims to anon, authenticated;

-- Claim mutations go through authenticated server routes so callers cannot
-- promote their own status, verification tier, or challenge lifecycle.
drop policy if exists skill_claims_insert_own_pending on public.skill_claims;
drop policy if exists skill_claims_update_own_pending on public.skill_claims;

revoke all on public.skill_versions from anon, authenticated;
grant select on public.skill_versions to anon, authenticated;

create or replace function public.record_skill_source_version(
  p_server_secret text,
  p_skill_slug text,
  p_source_commit_sha text,
  p_source_content_hash text,
  p_source_ref text,
  p_source_path text,
  p_version text,
  p_license text,
  p_license_source text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous_hash text;
  v_changed boolean;
  v_license_status text;
begin
  perform public.assert_indexer_secret(p_server_secret);

  if p_source_content_hash is null or p_source_content_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid source content hash';
  end if;

  select source_content_hash into v_previous_hash
  from public.skills where slug = p_skill_slug for update;

  if not found then
    raise exception 'Skill not found';
  end if;

  v_changed := v_previous_hash is not null and v_previous_hash is distinct from p_source_content_hash;
  v_license_status := case
    when coalesce(trim(p_license), '') = '' or lower(trim(p_license)) in ('unknown', 'noassertion', 'other') then 'missing'
    when lower(p_license) like '%non-commercial%' or lower(p_license) like '%cc-by-nc%' then 'restricted'
    else 'detected'
  end;

  update public.skills set
    source_commit_sha = nullif(p_source_commit_sha, ''),
    source_content_hash = p_source_content_hash,
    source_sync_status = case when v_changed then 'changed' else 'current' end,
    source_ref = coalesce(nullif(p_source_ref, ''), source_ref),
    source_path = coalesce(nullif(p_source_path, ''), source_path),
    license_source = case
      when p_license_source in ('skill_frontmatter', 'github_repository', 'manual') then p_license_source
      else 'unknown'
    end,
    license_status = v_license_status,
    last_synced_at = now(),
    updated_at = now()
  where slug = p_skill_slug;

  insert into public.skill_versions (
    skill_slug, version, source_commit_sha, source_content_hash,
    source_ref, source_path, license, license_source, metadata
  ) values (
    p_skill_slug, coalesce(nullif(p_version, ''), '1.0.0'),
    nullif(p_source_commit_sha, ''), p_source_content_hash,
    nullif(p_source_ref, ''), nullif(p_source_path, ''),
    coalesce(nullif(p_license, ''), 'Unknown'),
    case when p_license_source in ('skill_frontmatter', 'github_repository', 'manual')
      then p_license_source else 'unknown' end,
    coalesce(p_metadata, '{}'::jsonb)
  ) on conflict (skill_slug, source_content_hash) do update set
    source_commit_sha = excluded.source_commit_sha,
    version = excluded.version,
    license = excluded.license,
    license_source = excluded.license_source,
    metadata = public.skill_versions.metadata || excluded.metadata;

  return jsonb_build_object(
    'changed', v_changed,
    'previous_hash', v_previous_hash,
    'current_hash', p_source_content_hash,
    'license_status', v_license_status
  );
end;
$$;

revoke all on function public.record_skill_source_version(
  text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_skill_source_version(
  text, text, text, text, text, text, text, text, text, jsonb
) to service_role;

comment on column public.profiles.github_verified_at is
  'Set only after a GitHub OAuth identity is linked to this Supabase user.';
comment on column public.skill_claims.verified_at is
  'Time repository control or equivalent maintainer evidence was verified.';
comment on column public.skill_claims.verification_tier is
  'Maintainer is verified repository control; official requires separate organization review.';
comment on table public.skill_versions is
  'Immutable-by-content source snapshots recorded by the authenticated source sync.';
