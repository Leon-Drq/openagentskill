-- X posting dedupe guards.
-- Prevents the same skill from being queued or posted repeatedly across
-- timestamped campaigns/lane-specific queues.

-- 1) Retire queued/posting items for skills that already have a posted X record.
update public.x_content_queue q
set
  status = 'skipped',
  error = coalesce(q.error, 'Skipped: skill already posted to X'),
  locked_at = null,
  metadata = q.metadata || jsonb_build_object(
    'skipped_by', 'x_post_dedupe_migration',
    'skip_reason', 'already_posted'
  ),
  updated_at = now()
where q.status in ('queued', 'posting')
  and exists (
    select 1
    from public.x_post_history h
    where h.skill_slug = q.skill_slug
      and h.status = 'posted'
  );

-- 2) For remaining active queue rows, keep only one active item per skill/content type.
with ranked as (
  select
    q.id,
    row_number() over (
      partition by q.skill_slug, q.content_type
      order by q.priority desc, q.scheduled_for asc, q.created_at asc
    ) as rn
  from public.x_content_queue q
  where q.status in ('queued', 'posting')
)
update public.x_content_queue q
set
  status = 'skipped',
  error = coalesce(q.error, 'Skipped: duplicate active X queue item'),
  locked_at = null,
  metadata = q.metadata || jsonb_build_object(
    'skipped_by', 'x_post_dedupe_migration',
    'skip_reason', 'duplicate_active'
  ),
  updated_at = now()
from ranked r
where q.id = r.id
  and r.rn > 1;

drop index if exists public.idx_x_content_queue_active_unique;

create unique index if not exists idx_x_content_queue_active_skill_unique
  on public.x_content_queue (skill_slug, content_type)
  where status in ('queued', 'posting');

create index if not exists idx_x_post_history_skill_status_posted
  on public.x_post_history (skill_slug, coalesce(posted_at, created_at) desc)
  where status = 'posted';

create or replace function public.enqueue_x_content_queue_item(
  p_server_secret text,
  p_item jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.x_content_queue%rowtype;
  v_skill_slug text := p_item->>'skill_slug';
  v_content_type text := coalesce(nullif(p_item->>'content_type', ''), 'skill_pick');
  v_campaign text := coalesce(nullif(p_item->>'campaign', ''), 'daily_skill');
begin
  perform public.assert_indexer_secret(p_server_secret);

  if v_skill_slug is null or v_skill_slug = '' then
    raise exception 'Missing skill_slug' using errcode = '22023';
  end if;

  if coalesce(p_item->>'post_text', '') = '' then
    raise exception 'Missing post_text' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.x_post_history h
    where h.skill_slug = v_skill_slug
      and h.status = 'posted'
  ) then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'duplicate_posted',
      'skill_slug', v_skill_slug
    );
  end if;

  if exists (
    select 1
    from public.x_content_queue q
    where q.skill_slug = v_skill_slug
      and q.content_type = v_content_type
      and q.status in ('queued', 'posting')
  ) then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'duplicate_active',
      'skill_slug', v_skill_slug
    );
  end if;

  insert into public.x_content_queue (
    skill_id,
    skill_slug,
    content_type,
    campaign,
    status,
    priority,
    scheduled_for,
    post_text,
    reply_text,
    source,
    metadata
  )
  values (
    nullif(p_item->>'skill_id', '')::uuid,
    v_skill_slug,
    v_content_type,
    v_campaign,
    coalesce(nullif(p_item->>'status', ''), 'queued'),
    coalesce(nullif(p_item->>'priority', '')::numeric, 0),
    coalesce(nullif(p_item->>'scheduled_for', '')::timestamptz, now()),
    p_item->>'post_text',
    nullif(p_item->>'reply_text', ''),
    coalesce(nullif(p_item->>'source', ''), 'auto'),
    coalesce(p_item->'metadata', '{}'::jsonb)
  )
  returning * into v_item;

  return jsonb_build_object(
    'status', 'queued',
    'id', v_item.id,
    'skill_slug', v_item.skill_slug,
    'scheduled_for', v_item.scheduled_for
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'duplicate_active',
      'skill_slug', v_skill_slug
    );
end;
$$;

revoke all on function public.enqueue_x_content_queue_item(text, jsonb) from public;
grant execute on function public.enqueue_x_content_queue_item(text, jsonb) to anon;

create or replace function public.claim_x_content_queue_item(p_server_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.x_content_queue%rowtype;
  v_skill public.skills%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  -- Retire any stale active rows for skills that have already been posted.
  update public.x_content_queue q
  set
    status = 'skipped',
    error = coalesce(q.error, 'Skipped: skill already posted to X'),
    locked_at = null,
    metadata = q.metadata || jsonb_build_object(
      'skipped_by', 'claim_x_content_queue_item',
      'skip_reason', 'already_posted'
    ),
    updated_at = now()
  where q.status in ('queued', 'posting')
    and exists (
      select 1
      from public.x_post_history h
      where h.skill_slug = q.skill_slug
        and h.status = 'posted'
    );

  with picked as (
    select q.id
    from public.x_content_queue q
    where q.status = 'queued'
      and q.scheduled_for <= now()
      and q.attempts < 3
      and not exists (
        select 1
        from public.x_post_history h
        where h.skill_slug = q.skill_slug
          and h.status = 'posted'
      )
    order by q.priority desc, q.scheduled_for asc, q.created_at asc
    limit 1
    for update skip locked
  )
  update public.x_content_queue q
  set
    status = 'posting',
    locked_at = now(),
    attempts = q.attempts + 1,
    updated_at = now()
  from picked
  where q.id = picked.id
  returning q.* into v_item;

  if not found then
    return null;
  end if;

  select *
  into v_skill
  from public.skills
  where id = v_item.skill_id
     or slug = v_item.skill_slug
  order by case when id = v_item.skill_id then 0 else 1 end
  limit 1;

  return jsonb_build_object(
    'id', v_item.id,
    'skill_id', v_item.skill_id,
    'skill_slug', v_item.skill_slug,
    'content_type', v_item.content_type,
    'campaign', v_item.campaign,
    'status', v_item.status,
    'priority', v_item.priority,
    'post_text', v_item.post_text,
    'reply_text', v_item.reply_text,
    'attempts', v_item.attempts,
    'metadata', v_item.metadata,
    'skill', case
      when v_skill.id is null then null
      else jsonb_build_object(
        'id', v_skill.id,
        'slug', v_skill.slug,
        'name', v_skill.name,
        'description', v_skill.description,
        'category', v_skill.category,
        'tags', v_skill.tags,
        'github_repo', v_skill.github_repo,
        'github_stars', v_skill.github_stars,
        'quality_score', v_skill.quality_score,
        'install_command', v_skill.install_command
      )
    end
  );
end;
$$;

revoke all on function public.claim_x_content_queue_item(text) from public;
grant execute on function public.claim_x_content_queue_item(text) to anon;
