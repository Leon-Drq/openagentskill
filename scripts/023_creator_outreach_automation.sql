-- Creator outreach automation for X Radar discoveries.
-- Replies are only eligible after a skill passes the normal review path. The
-- functions remain secret-gated and expose no creator contact information.

alter table public.x_reply_drafts
  add column if not exists x_post_id text,
  add column if not exists posted_at timestamptz,
  add column if not exists error text;

alter table public.x_reply_drafts
  drop constraint if exists x_reply_drafts_status_check;

alter table public.x_reply_drafts
  add constraint x_reply_drafts_status_check check (
    status in ('draft', 'approved', 'posting', 'posted', 'dismissed', 'skipped', 'error')
  );

-- A launch post may link several repositories, but OpenAgentSkill sends at
-- most one creator reply to that post. Retire duplicate older drafts before
-- adding the partial unique index so the migration is safe on live data.
with ranked as (
  select
    d.id,
    row_number() over (
      partition by d.source_tweet_id
      order by d.score desc, d.created_at asc
    ) as rn
  from public.x_reply_drafts d
  where d.source_tweet_id is not null
    and coalesce(d.metadata->>'outreach_kind', '') = 'creator_x_reply'
)
update public.x_reply_drafts d
set
  status = 'skipped',
  error = coalesce(d.error, 'Skipped: another creator reply draft already owns this source post'),
  metadata = d.metadata || jsonb_build_object(
    'skipped_by', 'creator_outreach_dedupe_migration',
    'skip_reason', 'duplicate_source_tweet'
  ),
  updated_at = now()
from ranked r
where d.id = r.id
  and r.rn > 1;

create unique index if not exists idx_x_reply_drafts_creator_source_unique
  on public.x_reply_drafts (source_tweet_id)
  where source_tweet_id is not null
    and coalesce(metadata->>'outreach_kind', '') = 'creator_x_reply';

create index if not exists idx_x_reply_drafts_creator_status
  on public.x_reply_drafts (status, score desc, created_at asc)
  where coalesce(metadata->>'outreach_kind', '') = 'creator_x_reply';

create index if not exists idx_x_reply_drafts_creator_posted_at
  on public.x_reply_drafts (posted_at desc)
  where coalesce(metadata->>'outreach_kind', '') = 'creator_x_reply';

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
exception
  when unique_violation then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'duplicate_draft',
      'source_tweet_id', v_source_tweet_id,
      'skill_slug', v_skill_slug
    );
end;
$$;

revoke all on function public.record_x_reply_draft(text, jsonb) from public, anon, authenticated;
grant execute on function public.record_x_reply_draft(text, jsonb) to anon;

create or replace function public.claim_auto_creator_x_reply_draft(
  p_server_secret text,
  p_daily_limit integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_draft public.x_reply_drafts%rowtype;
  v_daily_limit integer := least(greatest(coalesce(p_daily_limit, 2), 1), 2);
  v_posted_last_24h integer;
begin
  perform public.assert_indexer_secret(p_server_secret);

  -- A timeout after sending an X reply must never cause an automatic retry.
  -- Mark stale locks for human review rather than returning them to the queue.
  update public.x_reply_drafts d
  set
    status = 'error',
    error = coalesce(d.error, 'Posting lock expired; check X before retrying'),
    metadata = d.metadata || jsonb_build_object(
      'stale_lock_at', now(),
      'stale_lock_policy', 'manual_review_required'
    ),
    updated_at = now()
  where d.status = 'posting'
    and coalesce(d.updated_at, d.created_at) < now() - interval '30 minutes'
    and coalesce(d.metadata->>'outreach_kind', '') = 'creator_x_reply';

  select count(*)
  into v_posted_last_24h
  from public.x_post_history h
  where h.status = 'posted'
    and coalesce(h.posted_at, h.created_at) >= now() - interval '24 hours'
    and h.metadata->>'type' = 'creator_indexed_reply';

  if v_posted_last_24h >= v_daily_limit then
    return jsonb_build_object(
      'status', 'skipped',
      'reason', 'creator_reply_daily_cap_reached'
    );
  end if;

  with picked as (
    select d.id
    from public.x_reply_drafts d
    where d.status = 'draft'
      and d.source_tweet_id is not null
      and nullif(d.source_author_username, '') is not null
      and coalesce(d.metadata->>'outreach_kind', '') = 'creator_x_reply'
      and coalesce((d.metadata->>'auto_publish')::boolean, false) = true
      and d.created_at >= now() - interval '10 days'
      and not exists (
        select 1
        from public.x_post_history h
        where h.status = 'posted'
          and h.metadata->>'type' = 'creator_indexed_reply'
          and h.metadata->>'in_reply_to' = d.source_tweet_id
      )
      and not exists (
        select 1
        from public.x_reply_drafts other_draft
        where other_draft.id <> d.id
          and other_draft.source_tweet_id = d.source_tweet_id
          and other_draft.status in ('posting', 'posted')
          and coalesce(other_draft.metadata->>'outreach_kind', '') = 'creator_x_reply'
      )
    order by d.score desc, d.created_at asc
    limit 1
    for update skip locked
  )
  update public.x_reply_drafts d
  set
    status = 'posting',
    error = null,
    metadata = d.metadata || jsonb_build_object('locked_at', now()),
    updated_at = now()
  from picked
  where d.id = picked.id
  returning d.* into v_draft;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_draft.id,
    'source_tweet_id', v_draft.source_tweet_id,
    'source_url', v_draft.source_url,
    'source_author_username', v_draft.source_author_username,
    'source_author_name', v_draft.source_author_name,
    'source_text', v_draft.source_text,
    'skill_id', v_draft.skill_id,
    'skill_slug', v_draft.skill_slug,
    'draft_text', v_draft.draft_text,
    'score', v_draft.score,
    'metadata', v_draft.metadata
  );
end;
$$;

revoke all on function public.claim_auto_creator_x_reply_draft(text, integer) from public, anon, authenticated;
grant execute on function public.claim_auto_creator_x_reply_draft(text, integer) to anon;

create or replace function public.complete_auto_creator_x_reply_draft(
  p_server_secret text,
  p_draft_id uuid,
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
  v_draft public.x_reply_drafts%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  if p_status not in ('posted', 'error', 'skipped') then
    raise exception 'Invalid creator reply completion status: %', p_status using errcode = '22023';
  end if;

  update public.x_reply_drafts d
  set
    status = p_status,
    x_post_id = coalesce(nullif(p_x_post_id, ''), d.x_post_id),
    posted_at = case when p_status = 'posted' then now() else d.posted_at end,
    error = nullif(p_error, ''),
    metadata = d.metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = now()
  where d.id = p_draft_id
    and coalesce(d.metadata->>'outreach_kind', '') = 'creator_x_reply'
  returning d.* into v_draft;

  if not found then
    return jsonb_build_object('status', 'missing', 'id', p_draft_id);
  end if;

  return jsonb_build_object(
    'status', v_draft.status,
    'id', v_draft.id,
    'x_post_id', v_draft.x_post_id,
    'skill_slug', v_draft.skill_slug
  );
end;
$$;

revoke all on function public.complete_auto_creator_x_reply_draft(text, uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_auto_creator_x_reply_draft(text, uuid, text, text, text, jsonb) to anon;

create or replace function public.get_creator_outreach_status(p_server_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_indexer_secret(p_server_secret);

  return jsonb_build_object(
    'queued', (
      select count(*) from public.x_reply_drafts d
      where d.status = 'draft'
        and coalesce(d.metadata->>'outreach_kind', '') = 'creator_x_reply'
    ),
    'posting', (
      select count(*) from public.x_reply_drafts d
      where d.status = 'posting'
        and coalesce(d.metadata->>'outreach_kind', '') = 'creator_x_reply'
    ),
    'postedLast24Hours', (
      select count(*) from public.x_post_history h
      where h.status = 'posted'
        and coalesce(h.posted_at, h.created_at) >= now() - interval '24 hours'
        and h.metadata->>'type' = 'creator_indexed_reply'
    ),
    'errorsLast24Hours', (
      select count(*) from public.x_reply_drafts d
      where d.status = 'error'
        and coalesce(d.updated_at, d.created_at) >= now() - interval '24 hours'
        and coalesce(d.metadata->>'outreach_kind', '') = 'creator_x_reply'
    ),
    'dailyLimit', 2
  );
end;
$$;

revoke all on function public.get_creator_outreach_status(text) from public, anon, authenticated;
grant execute on function public.get_creator_outreach_status(text) to anon;
