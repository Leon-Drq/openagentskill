-- X OAuth token storage and daily skill-post history.
-- Tokens are encrypted with INDEXER_SECRET inside guarded RPCs.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.x_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'x',
  x_user_id text not null,
  username text not null,
  scope text,
  access_token_cipher bytea not null,
  refresh_token_cipher bytea not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider)
);

alter table public.x_oauth_connections enable row level security;

drop policy if exists "x_oauth_connections_no_public_access" on public.x_oauth_connections;
create policy "x_oauth_connections_no_public_access"
  on public.x_oauth_connections
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.x_oauth_connections from anon, authenticated;

create table if not exists public.x_post_history (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references public.skills(id) on delete set null,
  skill_slug text not null,
  x_post_id text,
  post_text text not null,
  status text not null default 'posted',
  error text,
  posted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.x_post_history enable row level security;

drop policy if exists "x_post_history_no_public_access" on public.x_post_history;
create policy "x_post_history_no_public_access"
  on public.x_post_history
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.x_post_history from anon, authenticated;

create index if not exists idx_x_post_history_skill_slug
  on public.x_post_history (skill_slug);

create index if not exists idx_x_post_history_posted_at
  on public.x_post_history (posted_at desc);

create or replace function public.assert_indexer_secret(p_server_secret text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_secret_hash constant text := '8ed2b827e8827c1d1657c0893b4c91653249267863eed5ef1af9157fce205328';
begin
  if p_server_secret is null
    or encode(extensions.digest(p_server_secret, 'sha256'), 'hex') <> v_expected_secret_hash
  then
    raise exception 'Invalid server secret' using errcode = '28000';
  end if;
end;
$$;

revoke all on function public.assert_indexer_secret(text) from public;

create or replace function public.upsert_x_oauth_connection(
  p_server_secret text,
  p_connection jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection public.x_oauth_connections%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  insert into public.x_oauth_connections (
    provider,
    x_user_id,
    username,
    scope,
    access_token_cipher,
    refresh_token_cipher,
    expires_at
  )
  values (
    'x',
    p_connection->>'x_user_id',
    p_connection->>'username',
    p_connection->>'scope',
    extensions.pgp_sym_encrypt(p_connection->>'access_token', p_server_secret),
    extensions.pgp_sym_encrypt(p_connection->>'refresh_token', p_server_secret),
    nullif(p_connection->>'expires_at', '')::timestamptz
  )
  on conflict (provider) do update set
    x_user_id = excluded.x_user_id,
    username = excluded.username,
    scope = excluded.scope,
    access_token_cipher = excluded.access_token_cipher,
    refresh_token_cipher = excluded.refresh_token_cipher,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning * into v_connection;

  return jsonb_build_object(
    'id', v_connection.id,
    'username', v_connection.username,
    'expires_at', v_connection.expires_at
  );
end;
$$;

revoke all on function public.upsert_x_oauth_connection(text, jsonb) from public;
grant execute on function public.upsert_x_oauth_connection(text, jsonb) to anon;

create or replace function public.get_x_oauth_connection(p_server_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection public.x_oauth_connections%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  select *
  into v_connection
  from public.x_oauth_connections
  where provider = 'x'
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'x_user_id', v_connection.x_user_id,
    'username', v_connection.username,
    'scope', v_connection.scope,
    'access_token', extensions.pgp_sym_decrypt(v_connection.access_token_cipher, p_server_secret),
    'refresh_token', extensions.pgp_sym_decrypt(v_connection.refresh_token_cipher, p_server_secret),
    'expires_at', v_connection.expires_at
  );
end;
$$;

revoke all on function public.get_x_oauth_connection(text) from public;
grant execute on function public.get_x_oauth_connection(text) to anon;

create or replace function public.update_x_oauth_tokens(
  p_server_secret text,
  p_access_token text,
  p_refresh_token text default null,
  p_expires_at timestamptz default null,
  p_scope text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection public.x_oauth_connections%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  update public.x_oauth_connections
  set
    access_token_cipher = extensions.pgp_sym_encrypt(p_access_token, p_server_secret),
    refresh_token_cipher = case
      when nullif(p_refresh_token, '') is null then refresh_token_cipher
      else extensions.pgp_sym_encrypt(p_refresh_token, p_server_secret)
    end,
    expires_at = coalesce(p_expires_at, expires_at),
    scope = coalesce(nullif(p_scope, ''), scope),
    updated_at = now()
  where provider = 'x'
  returning * into v_connection;

  if not found then
    return jsonb_build_object('error', 'x_connection_not_found');
  end if;

  return jsonb_build_object(
    'username', v_connection.username,
    'expires_at', v_connection.expires_at
  );
end;
$$;

revoke all on function public.update_x_oauth_tokens(text, text, text, timestamptz, text) from public;
grant execute on function public.update_x_oauth_tokens(text, text, text, timestamptz, text) to anon;

create or replace function public.pick_x_post_skill(p_server_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_skill public.skills%rowtype;
begin
  perform public.assert_indexer_secret(p_server_secret);

  select s.*
  into v_skill
  from public.skills s
  where s.ai_review_approved = true
    and s.github_stars >= 500
    and coalesce(s.quality_score, 0) > 0
    and not exists (
      select 1
      from public.x_post_history xph
      where xph.skill_slug = s.slug
        and xph.status = 'posted'
    )
    and not (
      concat_ws(
        ' ',
        s.name,
        s.description,
        s.long_description,
        s.tagline,
        s.category,
        s.github_repo,
        array_to_string(coalesce(s.tags, '{}'::text[]), ' '),
        array_to_string(coalesce(s.frameworks, '{}'::text[]), ' ')
      ) ~* '(^|[^a-z0-9])mcp([^a-z0-9]|$)|model context protocol'
    )
  order by
    s.quality_score desc,
    s.github_stars desc,
    s.created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
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
  );
end;
$$;

revoke all on function public.pick_x_post_skill(text) from public;
grant execute on function public.pick_x_post_skill(text) to anon;

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
    'skill_slug', v_post.skill_slug,
    'x_post_id', v_post.x_post_id,
    'status', v_post.status
  );
end;
$$;

revoke all on function public.record_x_post(text, jsonb) from public;
grant execute on function public.record_x_post(text, jsonb) to anon;
