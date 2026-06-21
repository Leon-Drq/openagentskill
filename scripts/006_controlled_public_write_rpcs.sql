-- Controlled write RPCs for routes that are publicly reachable from the app.
-- These keep table-level RLS locked down while allowing narrowly-scoped writes.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.record_agent_feedback(
  p_skill_slug text,
  p_agent_id text,
  p_success boolean,
  p_latency_ms integer default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_skill record;
  v_points_awarded integer := 0;
begin
  select id, slug, author_user_id
  into v_skill
  from public.skills
  where slug = p_skill_slug
  limit 1;

  if not found then
    return jsonb_build_object('error', 'skill_not_found');
  end if;

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
    left(p_agent_id, 200),
    p_success,
    p_latency_ms,
    left(p_error_message, 2000),
    coalesce(p_metadata, '{}'::jsonb)
  );

  if p_success and v_skill.author_user_id is not null then
    insert into public.point_events (
      user_id,
      amount,
      event_type,
      description,
      ref_id
    )
    values (
      v_skill.author_user_id,
      1,
      'skill_called',
      'Skill "' || p_skill_slug || '" called by ' || left(p_agent_id, 200),
      p_skill_slug
    );

    v_points_awarded := 1;
  end if;

  if p_success then
    insert into public.activity_feed (
      event_type,
      skill_id,
      actor_name,
      actor_type,
      description,
      metadata
    )
    values (
      'skill_called',
      v_skill.id,
      left(p_agent_id, 200),
      'agent',
      'Called ' || p_skill_slug,
      jsonb_build_object(
        'latency_ms', p_latency_ms,
        'success', true,
        'points_awarded', v_points_awarded
      )
    );
  end if;

  return jsonb_build_object(
    'skill_slug', p_skill_slug,
    'agent_id', left(p_agent_id, 200),
    'success', p_success,
    'points_awarded', v_points_awarded
  );
end;
$$;

revoke all on function public.record_agent_feedback(text, text, boolean, integer, text, jsonb) from public;
grant execute on function public.record_agent_feedback(text, text, boolean, integer, text, jsonb) to anon;

create or replace function public.submit_reviewed_skill(
  p_server_secret text,
  p_skill jsonb,
  p_submission jsonb,
  p_activity jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_secret_hash constant text := '074705db488fc272fdd4913f06b11cf5ca05b79ceb8af005ecdb6e2479a0af01';
  v_skill public.skills%rowtype;
  v_submission public.skill_submissions%rowtype;
begin
  if p_server_secret is null
    or encode(extensions.digest(p_server_secret, 'sha256'), 'hex') <> v_expected_secret_hash
  then
    raise exception 'Invalid server secret' using errcode = '28000';
  end if;

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
    ai_review_suggestions
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
    p_skill->>'category',
    coalesce(array(select jsonb_array_elements_text(p_skill->'tags')), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(p_skill->'frameworks')), '{}'::text[]),
    coalesce(p_skill->>'version', '1.0.0'),
    coalesce(p_skill->>'license', 'Unknown'),
    p_skill->>'install_command',
    coalesce((p_skill->>'verified')::boolean, false),
    coalesce(p_skill->>'submission_source', 'web'),
    p_skill->>'submitted_by_agent',
    coalesce(p_skill->'ai_review_score', '{}'::jsonb),
    coalesce((p_skill->>'ai_review_approved')::boolean, false),
    coalesce(array(select jsonb_array_elements_text(p_skill->'ai_review_issues')), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(p_skill->'ai_review_suggestions')), '{}'::text[])
  )
  returning * into v_skill;

  insert into public.skill_submissions (
    skill_id,
    github_repo,
    submission_source,
    submitted_by_agent,
    ai_review_result,
    status
  )
  values (
    v_skill.id,
    p_submission->>'github_repo',
    coalesce(p_submission->>'submission_source', 'web'),
    p_submission->>'submitted_by_agent',
    coalesce(p_submission->'ai_review_result', '{}'::jsonb),
    coalesce(p_submission->>'status', 'reviewed')
  )
  returning * into v_submission;

  if p_activity is not null then
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
      coalesce(p_activity->>'actor_name', v_skill.author_name),
      coalesce(p_activity->>'actor_type', 'human'),
      p_activity->>'description',
      coalesce(p_activity->'metadata', '{}'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'skill', to_jsonb(v_skill),
    'submission', to_jsonb(v_submission)
  );
end;
$$;

revoke all on function public.submit_reviewed_skill(text, jsonb, jsonb, jsonb) from public;
grant execute on function public.submit_reviewed_skill(text, jsonb, jsonb, jsonb) to anon;
