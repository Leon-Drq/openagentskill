-- Make newly reviewed skills immediately discoverable by exact and full-text
-- search, and keep their quality score synchronized from the first insert.

alter table public.skills
  add column if not exists search_document tsvector
  generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(slug, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(github_repo, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(tagline, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(category, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(long_description, '')), 'C') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(repository, '')), 'C')
  ) stored;

create index if not exists idx_skills_search_document
  on public.skills using gin (search_document);

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
                and ai_review_score->>'source' = 'open-skill-submission'
                then (ai_review_score->>'total')::numeric / 40 * 15
              when jsonb_typeof(ai_review_score->'total') = 'number'
                then (ai_review_score->>'total')::numeric / 100 * 15
              when ai_review_approved then 10.5
              else 0
            end
          )
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
      least(100, round((star_score + review_score + freshness_score + usage_score + metadata_score)::numeric, 2)) as quality_score,
      jsonb_build_object(
        'star_score', star_score,
        'review_score', review_score,
        'freshness_score', freshness_score,
        'usage_score', usage_score,
        'metadata_score', metadata_score,
        'model', 'v2'
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
grant execute on function public.refresh_skill_quality_scores(text) to service_role;

create or replace function public.refresh_quality_after_skill_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_skill_quality_scores(new.slug);
  return new;
end;
$$;

revoke all on function public.refresh_quality_after_skill_write() from public;
revoke all on function public.refresh_quality_after_skill_write() from anon, authenticated;

drop trigger if exists skills_refresh_quality_after_insert on public.skills;
create trigger skills_refresh_quality_after_insert
  after insert on public.skills
  for each row execute function public.refresh_quality_after_skill_write();

drop trigger if exists skills_refresh_quality_after_metadata_update on public.skills;
create trigger skills_refresh_quality_after_metadata_update
  after update of github_stars, github_repo, verified, tags, ai_review_score,
    ai_review_approved, github_last_pushed_at on public.skills
  for each row execute function public.refresh_quality_after_skill_write();

select public.refresh_skill_quality_scores();

-- Repository metadata is deterministic. Remove only "missing license"
-- feedback when a concrete license is already recorded; retain usage-rights
-- and non-commercial warnings.
with cleaned as (
  select
    id,
    array(
      select issue
      from unnest(coalesce(ai_review_issues, '{}'::text[])) as issue
      where issue !~* '(no explicit|missing|without|not (present|found|provided|declared|specified)).{0,80}licen[cs]e|licen[cs]e.{0,80}(missing|not (present|found|provided|declared|specified))'
    ) as issues,
    array(
      select suggestion
      from unnest(coalesce(ai_review_suggestions, '{}'::text[])) as suggestion
      where suggestion !~* '(add|include|declare|provide|specify|choose).{0,100}licen[cs]e'
    ) as suggestions
  from public.skills
  where lower(coalesce(license, '')) not in ('', 'unknown', 'noassertion', 'other', 'none')
)
update public.skills s
set ai_review_issues = cleaned.issues,
    ai_review_suggestions = cleaned.suggestions
from cleaned
where s.id = cleaned.id;

with licensed_submissions as (
  select ss.id, ss.ai_review_result
  from public.skill_submissions ss
  join public.skills s on s.id = ss.skill_id
  where lower(coalesce(s.license, '')) not in ('', 'unknown', 'noassertion', 'other', 'none')
), cleaned as (
  select
    id,
    coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements_text(coalesce(ai_review_result->'issues', '[]'::jsonb)) as value
      where value !~* '(no explicit|missing|without|not (present|found|provided|declared|specified)).{0,80}licen[cs]e|licen[cs]e.{0,80}(missing|not (present|found|provided|declared|specified))'
    ), '[]'::jsonb) as issues,
    coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements_text(coalesce(ai_review_result->'suggestions', '[]'::jsonb)) as value
      where value !~* '(add|include|declare|provide|specify|choose).{0,100}licen[cs]e'
    ), '[]'::jsonb) as suggestions,
    coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements_text(coalesce(ai_review_result->'policy'->'issues', '[]'::jsonb)) as value
      where value !~* '(no explicit|missing|without|not (present|found|provided|declared|specified)).{0,80}licen[cs]e|licen[cs]e.{0,80}(missing|not (present|found|provided|declared|specified))'
    ), '[]'::jsonb) as policy_issues,
    coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements_text(coalesce(ai_review_result->'policy'->'suggestions', '[]'::jsonb)) as value
      where value !~* '(add|include|declare|provide|specify|choose).{0,100}licen[cs]e'
    ), '[]'::jsonb) as policy_suggestions
  from licensed_submissions
)
update public.skill_submissions ss
set ai_review_result = ss.ai_review_result || jsonb_build_object(
  'issues', cleaned.issues,
  'suggestions', cleaned.suggestions,
  'policy', coalesce(ss.ai_review_result->'policy', '{}'::jsonb) || jsonb_build_object(
    'issues', cleaned.policy_issues,
    'suggestions', cleaned.policy_suggestions
  )
)
from cleaned
where ss.id = cleaned.id;

comment on column public.skills.search_document is
  'Stored, weighted simple-language document used by public Skill search.';
