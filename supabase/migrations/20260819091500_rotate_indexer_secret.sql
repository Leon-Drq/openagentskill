-- Rotate the protected indexer RPC secret after the previous Vercel values
-- became unreadable sensitive placeholders. Only the SHA-256 digest is stored
-- in source control and Postgres; the secret itself remains in Vercel.

create or replace function public.upsert_indexed_skill(
  p_server_secret text,
  p_skill jsonb,
  p_activity jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_secret_hash constant text := '54fc1b0e14aa657fd820a882974e4fc64ae055448646a1f073b6a98e5366f43e';
  v_skill public.skills%rowtype;
  v_existing_id uuid;
begin
  if p_server_secret is null
    or encode(extensions.digest(p_server_secret, 'sha256'), 'hex') <> v_expected_secret_hash
  then
    raise exception 'Invalid server secret' using errcode = '28000';
  end if;

  select id into v_existing_id
  from public.skills
  where slug = p_skill->>'slug';

  insert into public.skills (
    slug,
    name,
    description,
    long_description,
    tagline,
    author_name,
    author_url,
    repository,
    github_repo,
    github_stars,
    github_forks,
    github_language,
    github_last_pushed_at,
    category,
    tags,
    frameworks,
    version,
    license,
    install_command,
    verified,
    submission_source,
    submitted_by_agent,
    ai_review_score,
    ai_review_approved,
    ai_review_issues,
    ai_review_suggestions,
    last_synced_at
  )
  values (
    p_skill->>'slug',
    p_skill->>'name',
    p_skill->>'description',
    p_skill->>'long_description',
    p_skill->>'tagline',
    p_skill->>'author_name',
    p_skill->>'author_url',
    p_skill->>'repository',
    p_skill->>'github_repo',
    coalesce((p_skill->>'github_stars')::integer, 0),
    coalesce((p_skill->>'github_forks')::integer, 0),
    nullif(p_skill->>'github_language', ''),
    nullif(p_skill->>'github_last_pushed_at', '')::timestamptz,
    p_skill->>'category',
    coalesce(array(select jsonb_array_elements_text(coalesce(p_skill->'tags', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_skill->'frameworks', '[]'::jsonb))), '{}'::text[]),
    coalesce(p_skill->>'version', '1.0.0'),
    coalesce(p_skill->>'license', 'Unknown'),
    p_skill->>'install_command',
    coalesce((p_skill->>'verified')::boolean, false),
    coalesce(p_skill->>'submission_source', 'auto-indexer'),
    coalesce(p_skill->>'submitted_by_agent', 'open-agent-skill-indexer'),
    coalesce(p_skill->'ai_review_score', '{}'::jsonb),
    coalesce((p_skill->>'ai_review_approved')::boolean, true),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_skill->'ai_review_issues', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_skill->'ai_review_suggestions', '[]'::jsonb))), '{}'::text[]),
    now()
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    long_description = excluded.long_description,
    tagline = excluded.tagline,
    author_name = excluded.author_name,
    author_url = excluded.author_url,
    repository = excluded.repository,
    github_repo = excluded.github_repo,
    github_stars = excluded.github_stars,
    github_forks = excluded.github_forks,
    github_language = excluded.github_language,
    github_last_pushed_at = excluded.github_last_pushed_at,
    category = excluded.category,
    tags = excluded.tags,
    frameworks = excluded.frameworks,
    version = excluded.version,
    license = excluded.license,
    install_command = excluded.install_command,
    verified = excluded.verified,
    submission_source = excluded.submission_source,
    submitted_by_agent = excluded.submitted_by_agent,
    ai_review_score = excluded.ai_review_score,
    ai_review_approved = excluded.ai_review_approved,
    ai_review_issues = excluded.ai_review_issues,
    ai_review_suggestions = excluded.ai_review_suggestions,
    last_synced_at = now(),
    updated_at = now()
  returning * into v_skill;

  perform public.refresh_skill_quality_scores(v_skill.slug);

  if p_activity is not null and v_existing_id is null then
    insert into public.activity_feed (
      event_type,
      skill_id,
      actor_name,
      actor_type,
      description,
      metadata
    )
    values (
      coalesce(p_activity->>'event_type', 'skill_published'),
      v_skill.id,
      coalesce(p_activity->>'actor_name', 'Open Agent Skill Indexer'),
      coalesce(p_activity->>'actor_type', 'agent'),
      p_activity->>'description',
      coalesce(p_activity->'metadata', '{}'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'skill', to_jsonb(v_skill),
    'created', v_existing_id is null
  );
end;
$$;

revoke all on function public.upsert_indexed_skill(text, jsonb, jsonb) from public;
grant execute on function public.upsert_indexed_skill(text, jsonb, jsonb) to anon;
