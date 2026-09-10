-- Recorded migration version matches the remote migration history.
-- Prefer exact source identities over legacy repository rows; refresh metadata
-- without transferring approval to a different revision. No row deletion or score override.
create or replace function public.publish_owner_skill(p_request_id uuid, p_skill jsonb, p_reason text, p_scan jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_existing public.skills;
  v_history public.owner_skill_publications;
  v_conflict public.skills;
  v_slug text := p_skill->>'slug';
  v_repo text := p_skill->>'github_repo';
  v_path text := p_skill->>'source_path';
  v_commit text := p_skill->>'source_commit_sha';
  v_hash text := p_skill->>'source_content_hash';
  v_previous jsonb := '{}';
  v_submissions jsonb;
  v_result jsonb;
  v_same_revision boolean := false;
  v_owner_metadata jsonb;
begin
  if current_user <> 'service_role' then
    raise insufficient_privilege using message = 'Owner publication requires the internal publishing service';
  end if;
  if p_request_id is null or p_skill is null or p_scan is null
    or coalesce(length(trim(p_reason)), 0) not between 10 and 2000
    or coalesce(v_slug, '') !~ '^[a-z0-9][a-z0-9-]{0,149}$'
    or coalesce(v_repo, '') !~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'
    or coalesce(v_path, '') !~ '(^|/)SKILL[.]md$'
    or coalesce(v_commit, '') !~ '^[a-f0-9]{40}$'
    or coalesce(v_hash, '') !~ '^[a-f0-9]{64}$'
    or coalesce(p_skill->>'name', '') = ''
    or coalesce(p_skill->>'description', '') = '' then
    raise invalid_parameter_value using message = 'Invalid owner publication metadata';
  end if;

  -- Owner publications are infrequent. One transaction lock makes retries,
  -- source identity matching and hash deduplication unambiguous.
  perform pg_advisory_xact_lock(hashtextextended('openagentskill-owner-publish', 0));
  select * into v_history from public.owner_skill_publications where request_id = p_request_id;
  if found then
    if lower(v_history.github_repo) <> lower(v_repo) or v_history.source_path <> v_path
      or v_history.source_commit_sha <> v_commit or v_history.source_content_hash <> v_hash
      or v_history.reason <> p_reason then
      raise invalid_parameter_value using message = 'requestId already belongs to a different publication';
    end if;
    return v_history.result || '{"replayed":true}'::jsonb;
  end if;

  select * into v_existing from public.skills
  where lower(github_repo) = lower(v_repo) and coalesce(source_path, 'SKILL.md') = v_path
  order by (source_path = v_path and source_content_hash = v_hash) desc nulls last,
    (source_path = v_path) desc nulls last,
    ai_review_approved desc nulls last, created_at asc limit 1 for update;

  -- Respect the existing hash owner even when a legacy identity row also exists.
  select * into v_conflict from public.skills
  where source_content_hash = v_hash
    and (ai_review_approved = true or listing_status = 'owner_published')
    and (v_existing.id is null or id <> v_existing.id)
  limit 1 for update;
  if v_conflict.id is not null then
    v_existing := v_conflict;
    v_result := jsonb_build_object('slug',v_existing.slug,'status','duplicate','ai_review_approved',v_existing.ai_review_approved);
  end if;

  if v_existing.id is not null then
    v_slug := v_existing.slug;
    v_same_revision := v_existing.source_commit_sha = v_commit and v_existing.source_content_hash = v_hash;
    v_previous := jsonb_build_object('approved', v_existing.ai_review_approved, 'scores',v_existing.ai_review_score,
      'issues',v_existing.ai_review_issues,'suggestions',v_existing.ai_review_suggestions,
      'source_commit_sha',v_existing.source_commit_sha,'source_content_hash',v_existing.source_content_hash);
    if v_result is null and v_same_revision and (v_existing.ai_review_approved or v_existing.listing_status = 'owner_published')
      and (p_skill->>'github_last_pushed_at')::timestamptz is not distinct from v_existing.github_last_pushed_at
      and not exists (
        select 1 from jsonb_each(p_skill - 'slug' - 'github_last_pushed_at') as incoming(key,value)
        where (to_jsonb(v_existing)->incoming.key) is distinct from incoming.value
      ) then
      v_result := jsonb_build_object('slug',v_slug,'status','unchanged','ai_review_approved',v_existing.ai_review_approved);
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'review',ai_review_result)), '[]')
  into v_submissions from public.skill_submissions
  where lower(github_repo) = lower(v_repo) and coalesce(skill_path, 'SKILL.md') = v_path;
  v_previous := v_previous || jsonb_build_object('submissions', v_submissions);

  v_owner_metadata := jsonb_build_object('channel','owner','published_at',now(),'source_commit_sha',v_commit,
    'source_content_hash',v_hash,'static_analysis',p_scan,
    'notice','Published by the site owner. Automated review approval and runtime verification are not implied.');
  if v_result is null then
    if v_existing.id is null then
      insert into public.skills (slug,name,description,long_description,tagline,author_name,author_url,repository,
        github_repo,github_stars,github_forks,github_language,github_last_pushed_at,category,tags,frameworks,
        version,license,install_command,submission_source,listing_status,ai_review_approved,verified,publisher_verified,
        source_ref,source_path,source_commit_sha,source_content_hash,source_sync_status,owner_publication)
      values (v_slug,p_skill->>'name',p_skill->>'description',p_skill->>'long_description',p_skill->>'description',
        p_skill->>'author_name',p_skill->>'author_url',p_skill->>'repository',v_repo,
        (p_skill->>'github_stars')::integer,(p_skill->>'github_forks')::integer,p_skill->>'github_language',
        (p_skill->>'github_last_pushed_at')::timestamptz,p_skill->>'category',
        array(select jsonb_array_elements_text(p_skill->'tags')),array(select jsonb_array_elements_text(p_skill->'frameworks')),
        p_skill->>'version',p_skill->>'license',p_skill->>'install_command','owner','owner_published',false,false,false,
        v_commit,v_path,v_commit,v_hash,'current',v_owner_metadata);
    else
      update public.skills set name=p_skill->>'name', description=p_skill->>'description',
        long_description=p_skill->>'long_description',tagline=p_skill->>'description',repository=p_skill->>'repository',
        github_stars=(p_skill->>'github_stars')::integer,github_forks=(p_skill->>'github_forks')::integer,
        github_last_pushed_at=(p_skill->>'github_last_pushed_at')::timestamptz,
        category=p_skill->>'category',tags=array(select jsonb_array_elements_text(p_skill->'tags')),
        frameworks=array(select jsonb_array_elements_text(p_skill->'frameworks')),version=p_skill->>'version',
        license=p_skill->>'license',install_command=p_skill->>'install_command',
        listing_status=case when v_same_revision then listing_status else 'owner_published' end,
        -- A past AI approval does not transfer to different executable source.
        -- Original scores/issues and the prior revision are retained in history.
        ai_review_approved=case when v_same_revision then ai_review_approved else false end,
        ai_review_score=case when v_same_revision then ai_review_score else null end,
        source_ref=v_commit,source_path=v_path,source_commit_sha=v_commit,source_content_hash=v_hash,
        source_sync_status='current',owner_publication=v_owner_metadata
      where id=v_existing.id;
    end if;
    v_result := jsonb_build_object('slug',v_slug,'status',case when v_existing.id is null then 'published' else 'updated' end,
      'ai_review_approved',case when v_same_revision then coalesce(v_existing.ai_review_approved,false) else false end,'publication_channel','owner');
  end if;
  insert into public.owner_skill_publications (request_id,skill_slug,github_repo,source_path,source_commit_sha,
    source_content_hash,reason,previous_review,source_scan,result)
  values (p_request_id,v_slug,v_repo,v_path,v_commit,v_hash,p_reason,v_previous,p_scan,v_result);
  return v_result;
end;
$$;
revoke all on function public.publish_owner_skill(uuid,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.publish_owner_skill(uuid,jsonb,text,jsonb) to service_role;
