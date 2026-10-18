-- Product presentation is independent of review scores, source identity and publication.
alter table public.skills add column if not exists product_metadata jsonb not null default '{}'
  check (jsonb_typeof(product_metadata) = 'object' and octet_length(product_metadata::text) <= 32000);

create table public.skill_product_metadata_changes (
  request_id uuid primary key,
  github_repo text not null,
  source_path text not null,
  submission_id uuid references public.skill_submissions(id),
  skill_id uuid references public.skills(id),
  reason text not null check (length(trim(reason)) between 10 and 2000),
  previous jsonb not null,
  product_metadata jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.skill_product_metadata_changes enable row level security;
revoke all on public.skill_product_metadata_changes from public, anon, authenticated, service_role;
grant select, insert on public.skill_product_metadata_changes to service_role;

create or replace function public.update_skill_product_metadata(
  p_request_id uuid, p_repository text, p_path text, p_submission_id uuid,
  p_metadata jsonb, p_reason text, p_dry_run boolean default false
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_skill public.skills;
  v_submission public.skill_submissions;
  v_history public.skill_product_metadata_changes;
  v_result jsonb;
  v_previous jsonb;
begin
  if current_user <> 'service_role' then
    raise insufficient_privilege using message = 'Owner credentials required';
  end if;
  if p_request_id is null or coalesce(p_repository, '') !~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'
    or coalesce(p_path, '') !~ '(^|/)SKILL[.]md$' or length(p_path) > 500
    or coalesce(length(trim(p_reason)), 0) not between 10 and 2000
    or p_metadata is null or jsonb_typeof(p_metadata) <> 'object' or octet_length(p_metadata::text) > 32000
    or exists (select 1 from jsonb_each(p_metadata) e where e.key not in ('websiteUrl','documentationUrl','logoUrl','exampleUrl','prerequisites','runtimeNotes') or jsonb_typeof(e.value) <> 'string') then
    raise invalid_parameter_value using message = 'Invalid product metadata request';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('openagentskill-product-metadata', 0));
  select * into v_history from public.skill_product_metadata_changes where request_id = p_request_id;
  if found then
    if lower(v_history.github_repo) <> lower(p_repository) or v_history.source_path <> p_path
      or v_history.submission_id is distinct from p_submission_id or v_history.product_metadata <> p_metadata or v_history.reason <> p_reason then
      raise invalid_parameter_value using message = 'requestId belongs to a different metadata change';
    end if;
    return v_history.result || '{"replayed":true}'::jsonb;
  end if;
  if p_submission_id is not null then
    select * into v_submission from public.skill_submissions where id = p_submission_id for update;
    if v_submission.id is null or lower(v_submission.github_repo) <> lower(p_repository) or v_submission.skill_path <> p_path then
      raise invalid_parameter_value using message = 'Submission identity does not match';
    end if;
    if v_submission.status = 'processing' then
      raise invalid_parameter_value using message = 'Submission is being processed; retry after review finishes';
    end if;
  end if;
  select * into v_skill from public.skills where lower(github_repo) = lower(p_repository) and source_path = p_path
    order by (id = v_submission.skill_id) desc nulls last, created_at asc, id asc limit 1 for update;
  if v_skill.id is null and v_submission.id is null then
    raise invalid_parameter_value using message = 'No existing skill or submission matches this source';
  end if;
  v_previous := jsonb_build_object('skill_metadata', v_skill.product_metadata,
    'submission_metadata', v_submission.validation_result->'product_metadata',
    'listing_status', v_skill.listing_status, 'ai_review_approved', v_skill.ai_review_approved,
    'submission_status', v_submission.status);
  v_result := jsonb_build_object('slug', v_skill.slug, 'listing_status', v_skill.listing_status,
    'ai_review_approved', v_skill.ai_review_approved, 'submission_status', v_submission.status,
    'product_metadata', p_metadata, 'metadata_only', true, 'dry_run', p_dry_run);
  if p_dry_run then return v_result; end if;
  if v_skill.id is not null then
    update public.skills set product_metadata = p_metadata where id = v_skill.id;
  end if;
  if v_submission.id is not null then
    update public.skill_submissions set validation_result = coalesce(validation_result, '{}') || jsonb_build_object('product_metadata', p_metadata) where id = v_submission.id;
  end if;
  insert into public.skill_product_metadata_changes(request_id,github_repo,source_path,submission_id,skill_id,reason,previous,product_metadata,result)
    values(p_request_id,p_repository,p_path,p_submission_id,v_skill.id,p_reason,v_previous,p_metadata,v_result);
  return v_result;
end $$;
revoke all on function public.update_skill_product_metadata(uuid,text,text,uuid,jsonb,text,boolean) from public, anon, authenticated;
grant execute on function public.update_skill_product_metadata(uuid,text,text,uuid,jsonb,text,boolean) to service_role;

-- Append to the existing invoker view, preserving the order and all predicates.
create or replace view public.skill_directory_entries with (security_invoker = true) as
select
  id, slug, name, description, tagline, author_name, author_url, repository,
  github_repo, github_stars, github_forks, category, tags, frameworks, version,
  license, install_command, npm_package, verified, publisher_verified,
  submission_source, submitted_by_agent, ai_review_score, ai_review_approved,
  listing_status, owner_publication, ai_review_issues, downloads, used_by,
  rating, review_count, quality_score, quality_signals, github_language,
  github_last_pushed_at, source_ref, source_path, source_commit_sha,
  source_content_hash, source_sync_status, created_at, updated_at,
  primary_category, taxonomy_tags, output_types, taxonomy_version, site_downloads,
  product_metadata
from public.skills s
where (ai_review_approved = true or listing_status in ('owner_published', 'static_checked'))
  and public.is_directory_skill(name, github_repo, category, tags, frameworks)
  and not exists (
    select 1 from public.skills older
    where s.github_repo is not null and s.source_path is not null
      and lower(older.github_repo) = lower(s.github_repo) and older.source_path = s.source_path
      and (older.ai_review_approved = true or older.listing_status in ('owner_published', 'static_checked'))
      and public.is_directory_skill(older.name, older.github_repo, older.category, older.tags, older.frameworks)
      and (older.created_at, older.id) < (s.created_at, s.id)
  );
NOTIFY pgrst, 'reload schema';
