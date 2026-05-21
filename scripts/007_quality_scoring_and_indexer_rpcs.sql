-- Quality scoring plus controlled indexer writes.
-- The public tables stay RLS-protected; production automation writes through
-- narrow RPCs guarded by INDEXER_SECRET.

create extension if not exists pgcrypto with schema extensions;

alter table public.skills
  add column if not exists quality_score numeric(5,2) not null default 0,
  add column if not exists quality_signals jsonb not null default '{}'::jsonb,
  add column if not exists github_language text,
  add column if not exists github_last_pushed_at timestamptz;

create index if not exists idx_skills_quality_score
  on public.skills (quality_score desc);

create index if not exists idx_skills_github_last_pushed_at
  on public.skills (github_last_pushed_at desc);

create or replace function public.refresh_skill_quality_scores(p_slug text default null)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  with base as (
    select
      s.id,
      s.slug,
      greatest(coalesce(s.github_stars, 0), 0) as github_stars,
      s.github_repo,
      s.verified,
      s.tags,
      s.ai_review_score,
      s.ai_review_approved,
      coalesce(s.github_last_pushed_at, s.last_synced_at, s.updated_at, s.created_at) as freshness_at,
      coalesce(ss.total_calls, 0) as total_calls,
      coalesce(ss.success_rate, 0) as success_rate
    from public.skills s
    left join public.skill_stats ss on ss.skill_slug = s.slug
    where p_slug is null or s.slug = p_slug
  ),
  signals as (
    select
      id,
      slug,
      least(35, round((ln(github_stars + 1) / ln(10) * 7)::numeric, 2)) as star_score,
      round(
        least(
          15,
          greatest(
            0,
            case
              when jsonb_typeof(ai_review_score->'total') = 'number'
                then (ai_review_score->>'total')::numeric
              when ai_review_approved then 70
              else 0
            end
          ) / 100 * 15
        ),
        2
      ) as review_score,
      case
        when freshness_at >= now() - interval '30 days' then 15::numeric
        when freshness_at >= now() - interval '90 days' then 12::numeric
        when freshness_at >= now() - interval '180 days' then 8::numeric
        when freshness_at >= now() - interval '365 days' then 4::numeric
        else 0::numeric
      end as freshness_score,
      case
        when total_calls >= 20 then round(least(20, success_rate / 100 * 20)::numeric, 2)
        when total_calls >= 5 then round(least(12, success_rate / 100 * 12)::numeric, 2)
        when total_calls > 0 then 5::numeric
        else 0::numeric
      end as usage_score,
      (
        case when github_repo ~ '^[^/]+/[^/]+$' then 3 else 0 end
        + case when coalesce(array_length(tags, 1), 0) >= 3 then 4 else 0 end
        + case when verified then 8 else 0 end
      )::numeric as metadata_score
    from base
  ),
  scored as (
    select
      id,
      least(
        100,
        round((star_score + review_score + freshness_score + usage_score + metadata_score)::numeric, 2)
      ) as quality_score,
      jsonb_build_object(
        'star_score', star_score,
        'review_score', review_score,
        'freshness_score', freshness_score,
        'usage_score', usage_score,
        'metadata_score', metadata_score,
        'model', 'v1'
      ) as quality_signals
    from signals
  )
  update public.skills s
  set
    quality_score = scored.quality_score,
    quality_signals = scored.quality_signals,
    updated_at = now()
  from scored
  where s.id = scored.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.refresh_skill_quality_scores(text) from public;
revoke all on function public.refresh_skill_quality_scores(text) from anon, authenticated;

create or replace function public.refresh_quality_after_skill_stats_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_skill_quality_scores(coalesce(new.skill_slug, old.skill_slug));
  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_quality_after_skill_stats_change() from public;
revoke all on function public.refresh_quality_after_skill_stats_change() from anon, authenticated;

drop trigger if exists skill_stats_refresh_quality on public.skill_stats;
create trigger skill_stats_refresh_quality
  after insert or update or delete on public.skill_stats
  for each row
  execute function public.refresh_quality_after_skill_stats_change();

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
  v_expected_secret_hash constant text := '8ed2b827e8827c1d1657c0893b4c91653249267863eed5ef1af9157fce205328';
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

create or replace function public.update_skill_github_metadata(
  p_server_secret text,
  p_slug text,
  p_github_stars integer,
  p_github_forks integer default null,
  p_github_language text default null,
  p_github_last_pushed_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_secret_hash constant text := '8ed2b827e8827c1d1657c0893b4c91653249267863eed5ef1af9157fce205328';
  v_skill public.skills%rowtype;
begin
  if p_server_secret is null
    or encode(extensions.digest(p_server_secret, 'sha256'), 'hex') <> v_expected_secret_hash
  then
    raise exception 'Invalid server secret' using errcode = '28000';
  end if;

  update public.skills
  set
    github_stars = greatest(coalesce(p_github_stars, github_stars), 0),
    github_forks = coalesce(p_github_forks, github_forks),
    github_language = coalesce(nullif(p_github_language, ''), github_language),
    github_last_pushed_at = coalesce(p_github_last_pushed_at, github_last_pushed_at),
    last_synced_at = now(),
    updated_at = now()
  where slug = p_slug
  returning * into v_skill;

  if not found then
    return jsonb_build_object('error', 'skill_not_found');
  end if;

  perform public.refresh_skill_quality_scores(v_skill.slug);

  return jsonb_build_object('skill', to_jsonb(v_skill));
end;
$$;

revoke all on function public.update_skill_github_metadata(text, text, integer, integer, text, timestamptz) from public;
grant execute on function public.update_skill_github_metadata(text, text, integer, integer, text, timestamptz) to anon;

select public.refresh_skill_quality_scores();
