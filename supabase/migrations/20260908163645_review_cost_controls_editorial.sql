-- Additive rollout: no historical approvals, scores, or articles are rewritten.
create table public.skill_analysis_ledger (
  id uuid primary key default gen_random_uuid(), request_key text not null,
  feature text not null, model text not null, status text not null default 'reserved'
    check (status in ('reserved','complete','failed')),
  reserved_usd numeric not null check (reserved_usd > 0),
  input_tokens bigint, output_tokens bigint, response text, error_code text,
  created_at timestamptz not null default now(), finished_at timestamptz,
  cache_until timestamptz not null default (now() + interval '7 days')
);
create index skill_analysis_key_idx on public.skill_analysis_ledger(request_key, created_at desc);
create index skill_analysis_date_idx on public.skill_analysis_ledger(created_at);
alter table public.skill_analysis_ledger enable row level security;
revoke all on public.skill_analysis_ledger from public, anon, authenticated;
grant select,insert,update on public.skill_analysis_ledger to service_role;

create function public.reserve_skill_analysis(p_key text,p_feature text,p_model text,p_reserved_usd numeric)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare cached public.skill_analysis_ledger; n integer; spend numeric; new_id uuid;
begin
  if p_key is null or length(p_key) <> 64 or p_reserved_usd is null or p_reserved_usd <= 0 or p_reserved_usd > 0.1 then
    raise exception 'Invalid reservation';
  end if;
  -- One lock for every feature and every worker, including concurrent crons.
  perform pg_advisory_xact_lock(92840517);
  select * into cached from public.skill_analysis_ledger where request_key=p_key order by created_at desc limit 1;
  if found then
    if cached.status='complete' and cached.cache_until>now() then
      return jsonb_build_object('status','cached','response',cached.response);
    elsif cached.created_at>now()-interval '24 hours' then
      return jsonb_build_object('status','cooldown');
    end if;
  end if;
  select count(*),coalesce(sum(reserved_usd),0) into n,spend from public.skill_analysis_ledger
    where created_at>=now()-interval '24 hours';
  -- Failed/aborted calls retain their full reservation: no free retries assumption.
  if n>=100 or spend+p_reserved_usd>2 then return jsonb_build_object('status','budget_exhausted'); end if;
  insert into public.skill_analysis_ledger(request_key,feature,model,reserved_usd)
    values(p_key,p_feature,p_model,p_reserved_usd) returning id into new_id;
  return jsonb_build_object('status','reserved','id',new_id);
end $$;
revoke all on function public.reserve_skill_analysis(text,text,text,numeric) from public,anon,authenticated;
grant execute on function public.reserve_skill_analysis(text,text,text,numeric) to service_role;

create function public.finish_skill_analysis(p_id uuid,p_response text,p_input_tokens bigint,p_output_tokens bigint,p_error text)
returns void language sql security invoker set search_path = '' as $$
  update public.skill_analysis_ledger set status=case when p_error is null then 'complete' else 'failed' end,
    response=left(p_response,30000),input_tokens=p_input_tokens,output_tokens=p_output_tokens,
    error_code=left(p_error,120),finished_at=now()
  where id=p_id and status='reserved';
$$;
revoke all on function public.finish_skill_analysis(uuid,text,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.finish_skill_analysis(uuid,text,bigint,bigint,text) to service_role;

create policy skills_select_static_public on public.skills for select to anon,authenticated
using (listing_status='static_checked');
-- The existing controlled indexer RPC writes review metadata but not listing_status.
create function public.set_static_publication_state() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.ai_review_score->>'method'='static' and new.ai_review_score->>'policy_version'='risk-first-v1'
    and new.ai_review_score->>'decision'='approved' then
    new.ai_review_approved:=false; new.listing_status:='static_checked';
  end if;
  return new;
end $$;
revoke all on function public.set_static_publication_state() from public,anon,authenticated;
create trigger skill_static_publication before insert or update on public.skills
for each row execute function public.set_static_publication_state();

create table public.seo_editorial_queue (
  id uuid primary key default gen_random_uuid(), week_start date not null,
  slot integer not null check(slot between 1 and 20), topic_key text not null unique,
  brief jsonb not null, draft jsonb, status text not null default 'planned'
    check(status in ('planned','draft','approved','published','needs_revision')),
  review_notes jsonb, created_at timestamptz not null default now(), published_at timestamptz,
  unique(week_start,slot)
);
alter table public.seo_editorial_queue enable row level security;
revoke all on public.seo_editorial_queue from public,anon,authenticated;
grant select,insert,update on public.seo_editorial_queue to service_role;

create function public.publish_seo_editorial(p_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare q public.seo_editorial_queue; d jsonb; wc integer; source_count integer; new_slug text;
begin
  perform pg_advisory_xact_lock(92840518);
  select * into q from public.seo_editorial_queue where id=p_id for update;
  if not found then raise exception 'Editorial slot not found'; end if;
  if q.status='published' then return jsonb_build_object('published',true,'slug',q.draft->>'slug','duplicate',true); end if;
  if q.status not in ('draft','approved') then raise exception 'Draft review required'; end if;
  d:=q.draft; new_slug:=d->>'slug';
  wc:=cardinality(regexp_split_to_array(trim(d->>'content'),'\s+'));
  select count(distinct value) into source_count from jsonb_array_elements_text(d->'sources')
    where value like 'https://%' and position(value in d->>'content')>0;
  if coalesce(new_slug,'') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(new_slug)>160
    or coalesce(length(d->>'title'),0) not between 20 and 100
    or coalesce(length(d->>'summary'),0) not between 50 and 200
    or coalesce(wc,0) not between 600 and 3000 or source_count<3
    or (select count(*) from regexp_matches(d->>'content','^##\s+[^#]','gn')) < 4
    or coalesce(length(d->>'uniqueValue'),0)<100 or coalesce(length(trim(d->>'factCheckedBy')),0)=0
    or (d->>'content') !~* '(methodology|selection criteria)'
    or (d->>'content') !~* '(limitations|trade-offs|tradeoffs|caveats)'
    or (d->>'content') ~* '(<script|<iframe|javascript:|\mTODO\M|\mPLACEHOLDER\M)'
    then raise exception 'Editorial quality gate failed'; end if;
  if (select count(*) from public.seo_editorial_queue where published_at>=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC')>=20
    then raise exception 'Weekly publication cap reached'; end if;
  -- A renamed slug cannot republish the same article or title.
  if exists(select 1 from public.blog_posts where lower(title)=lower(d->>'title')
      or md5(regexp_replace(content,'\s+','','g'))=md5(regexp_replace(d->>'content','\s+','','g')))
    then raise exception 'Duplicate editorial content'; end if;
  insert into public.blog_posts(slug,title,summary,content,published_at)
    values(new_slug,d->>'title',d->>'summary',d->>'content',now());
  update public.seo_editorial_queue set status='published',published_at=now() where id=p_id;
  return jsonb_build_object('published',true,'slug',new_slug);
end $$;
revoke all on function public.publish_seo_editorial(uuid) from public,anon,authenticated;
grant execute on function public.publish_seo_editorial(uuid) to service_role;

-- Public inventory includes static-checked listings without fabricating AI approval.
create or replace function public.refresh_registry_skill_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare before_public boolean := false; after_public boolean := false;
begin
  if TG_OP <> 'INSERT' then before_public := coalesce(old.ai_review_approved,false) or old.listing_status in ('static_checked','owner_published'); end if;
  if TG_OP <> 'DELETE' then after_public := coalesce(new.ai_review_approved,false) or new.listing_status in ('static_checked','owner_published'); end if;
  if coalesce(before_public,false) is distinct from coalesce(after_public,false) then
    update public.registry_stats set approved_skill_count=greatest(0,approved_skill_count + case when after_public then 1 else -1 end),updated_at=now() where id=true;
  end if;
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
update public.registry_stats set approved_skill_count=(select count(*) from public.skills where ai_review_approved=true or listing_status in ('static_checked','owner_published')),updated_at=now() where id=true;
drop trigger skills_refresh_registry_count on public.skills;
create trigger skills_refresh_registry_count after insert or delete or update of ai_review_approved,listing_status on public.skills
for each row execute function public.refresh_registry_skill_count();

CREATE OR REPLACE FUNCTION public.refresh_registry_coverage_stats()
 RETURNS registry_coverage_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
        where (ai_review_approved = true or listing_status in ('static_checked','owner_published'))
          and github_repo is not null
          and length(trim(github_repo)) > 0
      ) repositories
      where repository_identity is not null
    ),
    (
      select
        count(*) filter (where (ai_review_approved = true or listing_status in ('static_checked','owner_published')))
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
    (select count(*) from public.skills where (ai_review_approved = true or listing_status in ('static_checked','owner_published'))),
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
$function$;
