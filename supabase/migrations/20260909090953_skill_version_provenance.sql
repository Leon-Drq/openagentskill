-- Version defaults are absence markers, not invented upstream releases.
alter table public.skills alter column version set default 'Unknown';
alter table public.skill_versions alter column version set default 'Unknown';

-- Keep the existing source-sync authorization and audit semantics; only fix
-- absent-version fallback and the noncommercial license spelling variant.
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
set search_path = ''
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
    when lower(p_license) ~ 'non[- ]?commercial' or lower(p_license) like '%cc-by-nc%' then 'restricted'
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
    p_skill_slug, coalesce(nullif(p_version, ''), 'Unknown'),
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

-- #111: correct only the already-recorded immutable snapshot. Do not replace
-- source content, alter submission state, approve a review, or change scores.
-- The matching plugin manifest declares 0.1.0; SKILL.md has no version field.
do $$
declare
  s public.skills;
  evidence jsonb := jsonb_build_object(
    'value', '0.1.0', 'source', 'plugin_manifest',
    'path', '.claude-plugin/plugin.json',
    'ref', '5f40a60426a2ced36c6331bcb3bf47dbd1333398');
begin
  select * into s from public.skills
  where slug = 'beepboop2025-market-brief-market-brief'
    and github_repo = 'beepboop2025/market-brief'
    and source_path = 'skills/market-brief/SKILL.md'
    and source_commit_sha = '5f40a60426a2ced36c6331bcb3bf47dbd1333398'
    and source_content_hash = '91f2be4e2035579e03d9744083e5bb5f0a8f9a7277a0cf6c3a2740518b1b4461'
    and version = '1.0.0'
  for update;
  if not found then return; end if;

  insert into public.skill_versions (skill_slug,version,source_commit_sha,source_content_hash,source_ref,source_path,license,license_source,metadata)
  values (s.slug,'0.1.0',s.source_commit_sha,s.source_content_hash,s.source_ref,s.source_path,s.license,coalesce(s.license_source,'unknown'),
    jsonb_build_object('version_evidence',evidence,'version_correction',jsonb_build_object(
      'previous_version',s.version,'corrected_version','0.1.0','recorded_at',now(),
      'issue','https://github.com/Leon-Drq/openagentskill/issues/111',
      'reason','Replace registry fallback with the same-revision matching plugin manifest declaration; review decisions unchanged.')))
  on conflict (skill_slug,source_content_hash) do update
    set version=excluded.version,metadata=public.skill_versions.metadata || excluded.metadata;

  update public.skills set version='0.1.0',
    ai_review_score=coalesce(ai_review_score,'{}'::jsonb) || jsonb_build_object('version_evidence',evidence)
  where id=s.id;
end;
$$;
