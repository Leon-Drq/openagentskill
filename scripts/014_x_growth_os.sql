-- X Growth OS: content queue, post metrics, and reply drafts.
-- All automation mutations are guarded by INDEXER_SECRET RPCs.

create table if not exists public.x_content_queue (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references public.skills(id) on delete set null,
  skill_slug text not null,
  content_type text not null default 'skill_pick',
  campaign text not null default 'daily_skill',
  status text not null default 'queued',
  priority numeric not null default 0,
  scheduled_for timestamptz not null default now(),
  post_text text not null,
  reply_text text,
  x_post_id text,
  attempts integer not null default 0,
  locked_at timestamptz,
  posted_at timestamptz,
  error text,
  source text not null default 'auto',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint x_content_queue_status_check check (
    status in ('queued', 'posting', 'posted', 'skipped', 'error', 'draft')
  ),
  constraint x_content_queue_content_type_check check (
    content_type in ('skill_pick', 'weekly_thread', 'reply_draft', 'launch_update')
  )
);

alter table public.x_content_queue enable row level security;

drop policy if exists "x_content_queue_no_public_access" on public.x_content_queue;
create policy "x_content_queue_no_public_access"
  on public.x_content_queue
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.x_content_queue from anon, authenticated;

create index if not exists idx_x_content_queue_due
  on public.x_content_queue (status, scheduled_for, priority desc, created_at);

create index if not exists idx_x_content_queue_skill_slug
  on public.x_content_queue (skill_slug);

drop index if exists public.idx_x_content_queue_active_unique;

create unique index if not exists idx_x_content_queue_active_skill_unique
  on public.x_content_queue (skill_slug, content_type)
  where status in ('queued', 'posting');

drop trigger if exists update_x_content_queue_updated_at on public.x_content_queue;
create trigger update_x_content_queue_updated_at
  before update on public.x_content_queue
  for each row
  execute function public.update_updated_at_column();

alter table public.x_post_history
  add column if not exists queue_item_id uuid references public.x_content_queue(id) on delete set null;

create index if not exists idx_x_post_history_queue_item_id
  on public.x_post_history (queue_item_id);

create table if not exists public.x_post_metrics (
  id uuid primary key default gen_random_uuid(),
  x_post_id text not null,
  queue_item_id uuid references public.x_content_queue(id) on delete set null,
  skill_slug text,
  captured_at timestamptz not null default now(),
  reply_count integer not null default 0,
  repost_count integer not null default 0,
  like_count integer not null default 0,
  quote_count integer not null default 0,
  bookmark_count integer,
  impression_count integer,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.x_post_metrics enable row level security;

drop policy if exists "x_post_metrics_no_public_access" on public.x_post_metrics;
create policy "x_post_metrics_no_public_access"
  on public.x_post_metrics
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.x_post_metrics from anon, authenticated;

create index if not exists idx_x_post_metrics_post_captured_at
  on public.x_post_metrics (x_post_id, captured_at desc);

create index if not exists idx_x_post_metrics_skill_slug
  on public.x_post_metrics (skill_slug);

create table if not exists public.x_reply_drafts (
  id uuid primary key default gen_random_uuid(),
  source_tweet_id text,
  source_url text,
  source_author_username text,
  source_author_name text,
  source_text text,
  skill_id uuid references public.skills(id) on delete set null,
  skill_slug text,
  draft_text text not null,
  status text not null default 'draft',
  score numeric not null default 0,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint x_reply_drafts_status_check check (
    status in ('draft', 'approved', 'posted', 'dismissed', 'error')
  )
);

alter table public.x_reply_drafts enable row level security;

drop policy if exists "x_reply_drafts_no_public_access" on public.x_reply_drafts;
create policy "x_reply_drafts_no_public_access"
  on public.x_reply_drafts
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.x_reply_drafts from anon, authenticated;

create index if not exists idx_x_reply_drafts_status_created_at
  on public.x_reply_drafts (status, created_at desc);

create index if not exists idx_x_reply_drafts_skill_slug
  on public.x_reply_drafts (skill_slug);

create unique index if not exists idx_x_reply_drafts_source_skill_unique
  on public.x_reply_drafts (source_tweet_id, skill_slug)
  where source_tweet_id is not null;

drop trigger if exists update_x_reply_drafts_updated_at on public.x_reply_drafts;
create trigger update_x_reply_drafts_updated_at
  before update on public.x_reply_drafts
  for each row
  execute function public.update_updated_at_column();

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

create or replace function public.complete_x_content_queue_item(
  p_server_secret text,
  p_item_id uuid,
  p_status text,
  p_x_post_id text default null,
  p_error text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.x_content_queue%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  update public.x_content_queue
  set
    status = p_status,
    x_post_id = coalesce(nullif(p_x_post_id, ''), x_post_id),
    posted_at = case when p_status = 'posted' then coalesce(posted_at, now()) else posted_at end,
    error = nullif(p_error, ''),
    locked_at = null,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where id = p_item_id
  returning * into v_item;

  if not found then
    return jsonb_build_object('status', 'missing', 'id', p_item_id);
  end if;

  return jsonb_build_object(
    'status', v_item.status,
    'id', v_item.id,
    'skill_slug', v_item.skill_slug,
    'x_post_id', v_item.x_post_id
  );
end;
$$;

revoke all on function public.complete_x_content_queue_item(text, uuid, text, text, text, jsonb) from public;
grant execute on function public.complete_x_content_queue_item(text, uuid, text, text, text, jsonb) to anon;

create or replace function public.record_x_post(
  p_server_secret text,
  p_post jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_post public.x_post_history%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  insert into public.x_post_history (
    queue_item_id,
    skill_id,
    skill_slug,
    x_post_id,
    post_text,
    status,
    error,
    posted_at,
    metadata
  )
  values (
    nullif(p_post->>'queue_item_id', '')::uuid,
    nullif(p_post->>'skill_id', '')::uuid,
    p_post->>'skill_slug',
    nullif(p_post->>'x_post_id', ''),
    p_post->>'post_text',
    coalesce(nullif(p_post->>'status', ''), 'posted'),
    nullif(p_post->>'error', ''),
    nullif(p_post->>'posted_at', '')::timestamptz,
    coalesce(p_post->'metadata', '{}'::jsonb)
  )
  returning * into v_post;

  return jsonb_build_object(
    'id', v_post.id,
    'queue_item_id', v_post.queue_item_id,
    'skill_slug', v_post.skill_slug,
    'x_post_id', v_post.x_post_id,
    'status', v_post.status
  );
end;
$$;

revoke all on function public.record_x_post(text, jsonb) from public;
grant execute on function public.record_x_post(text, jsonb) to anon;

create or replace function public.get_x_post_metric_targets(
  p_server_secret text,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_indexer_secret(p_server_secret);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'x_post_id', h.x_post_id,
        'queue_item_id', h.queue_item_id,
        'skill_slug', h.skill_slug,
        'posted_at', h.posted_at
      )
      order by h.posted_at desc nulls last, h.created_at desc
    )
    from (
      select h.*
      from public.x_post_history h
      where h.status = 'posted'
        and h.x_post_id is not null
        and coalesce(h.posted_at, h.created_at) >= now() - interval '45 days'
        and not exists (
          select 1
          from public.x_post_metrics m
          where m.x_post_id = h.x_post_id
            and m.captured_at >= now() - interval '12 hours'
        )
      order by coalesce(h.posted_at, h.created_at) desc
      limit greatest(1, least(coalesce(p_limit, 50), 100))
    ) h
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_x_post_metric_targets(text, integer) from public;
grant execute on function public.get_x_post_metric_targets(text, integer) to anon;

create or replace function public.record_x_post_metric(
  p_server_secret text,
  p_metric jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_metric public.x_post_metrics%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  insert into public.x_post_metrics (
    x_post_id,
    queue_item_id,
    skill_slug,
    captured_at,
    reply_count,
    repost_count,
    like_count,
    quote_count,
    bookmark_count,
    impression_count,
    raw_metrics
  )
  values (
    p_metric->>'x_post_id',
    nullif(p_metric->>'queue_item_id', '')::uuid,
    nullif(p_metric->>'skill_slug', ''),
    coalesce(nullif(p_metric->>'captured_at', '')::timestamptz, now()),
    coalesce(nullif(p_metric->>'reply_count', '')::integer, 0),
    coalesce(nullif(p_metric->>'repost_count', '')::integer, 0),
    coalesce(nullif(p_metric->>'like_count', '')::integer, 0),
    coalesce(nullif(p_metric->>'quote_count', '')::integer, 0),
    nullif(p_metric->>'bookmark_count', '')::integer,
    nullif(p_metric->>'impression_count', '')::integer,
    coalesce(p_metric->'raw_metrics', '{}'::jsonb)
  )
  returning * into v_metric;

  return jsonb_build_object(
    'id', v_metric.id,
    'x_post_id', v_metric.x_post_id,
    'captured_at', v_metric.captured_at
  );
end;
$$;

revoke all on function public.record_x_post_metric(text, jsonb) from public;
grant execute on function public.record_x_post_metric(text, jsonb) to anon;

create or replace function public.record_x_reply_draft(
  p_server_secret text,
  p_draft jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_draft public.x_reply_drafts%rowtype;
  v_source_tweet_id text := nullif(p_draft->>'source_tweet_id', '');
  v_skill_slug text := nullif(p_draft->>'skill_slug', '');
begin
  perform public.assert_indexer_secret(p_server_secret);

  if v_source_tweet_id is not null and v_skill_slug is not null and exists (
    select 1
    from public.x_reply_drafts d
    where d.source_tweet_id = v_source_tweet_id
      and d.skill_slug = v_skill_slug
  ) then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'duplicate_draft',
      'source_tweet_id', v_source_tweet_id,
      'skill_slug', v_skill_slug
    );
  end if;

  insert into public.x_reply_drafts (
    source_tweet_id,
    source_url,
    source_author_username,
    source_author_name,
    source_text,
    skill_id,
    skill_slug,
    draft_text,
    status,
    score,
    reason,
    metadata
  )
  values (
    v_source_tweet_id,
    nullif(p_draft->>'source_url', ''),
    nullif(p_draft->>'source_author_username', ''),
    nullif(p_draft->>'source_author_name', ''),
    nullif(p_draft->>'source_text', ''),
    nullif(p_draft->>'skill_id', '')::uuid,
    v_skill_slug,
    p_draft->>'draft_text',
    coalesce(nullif(p_draft->>'status', ''), 'draft'),
    coalesce(nullif(p_draft->>'score', '')::numeric, 0),
    nullif(p_draft->>'reason', ''),
    coalesce(p_draft->'metadata', '{}'::jsonb)
  )
  returning * into v_draft;

  return jsonb_build_object(
    'status', 'drafted',
    'id', v_draft.id,
    'source_tweet_id', v_draft.source_tweet_id,
    'skill_slug', v_draft.skill_slug
  );
end;
$$;

revoke all on function public.record_x_reply_draft(text, jsonb) from public;
grant execute on function public.record_x_reply_draft(text, jsonb) to anon;
