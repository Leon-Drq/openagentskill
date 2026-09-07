-- Privileged SQL connection; all fixtures and votes roll back, including on failure.
begin;
select set_config('test.gallery_baseline_up', (select count(*)::text from public.showcase_votes where case_slug = 'room-to-grow-poster' and vote = 1), true);
select set_config('test.gallery_baseline_down', (select count(*)::text from public.showcase_votes where case_slug = 'room-to-grow-poster' and vote = -1), true);
select set_config('test.gallery_user_a', gen_random_uuid()::text, true);
select set_config('test.gallery_user_b', gen_random_uuid()::text, true);
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
  (current_setting('test.gallery_user_a')::uuid, 'authenticated', 'authenticated', current_setting('test.gallery_user_a') || '@example.invalid', '{}'::jsonb),
  (current_setting('test.gallery_user_b')::uuid, 'authenticated', 'authenticated', current_setting('test.gallery_user_b') || '@example.invalid', '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.gallery_user_a'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
select public.set_showcase_vote('room-to-grow-poster', 1::smallint);
select public.set_showcase_vote('room-to-grow-poster', 1::smallint);
do $$ begin
  if (select count(*) from public.showcase_votes) <> 1 then raise exception 'Idempotent upvote failed'; end if;
  begin
    insert into public.showcase_votes(user_id, case_slug, vote) values (current_setting('test.gallery_user_b')::uuid, 'room-to-grow-poster', -1);
    raise exception 'Cross-user insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.showcase_votes set user_id = current_setting('test.gallery_user_b')::uuid;
    raise exception 'Vote reassignment allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_showcase_vote('not-a-real-case', 1::smallint);
    raise exception 'Unknown case allowed';
  exception when foreign_key_violation then null; end;
  begin
    perform public.set_showcase_vote('room-to-grow-poster', 2::smallint);
    raise exception 'Invalid direction allowed';
  exception when check_violation then null; end;
end $$;

select public.set_showcase_vote('room-to-grow-poster', -1::smallint);
select public.set_showcase_vote('room-to-grow-poster', -1::smallint);
do $$ begin
  if (select count(*) from public.showcase_votes) <> 1 or (select vote from public.showcase_votes) <> -1 then raise exception 'Exclusive switch to downvote failed'; end if;
end $$;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.gallery_user_b'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
do $$ begin
  if (select count(*) from public.showcase_votes) <> 0 then raise exception 'Other user votes exposed'; end if;
  delete from public.showcase_votes where user_id = current_setting('test.gallery_user_a')::uuid;
  if found then raise exception 'Cross-user delete allowed'; end if;
  update public.showcase_votes set vote = 1 where user_id = current_setting('test.gallery_user_a')::uuid;
  if found then raise exception 'Cross-user update allowed'; end if;
end $$;
select public.set_showcase_vote('room-to-grow-poster', 1::smallint);

set local role service_role;
do $$ declare totals record; begin
  select * into totals from public.showcase_vote_counts(array['room-to-grow-poster']);
  if totals.likes <> current_setting('test.gallery_baseline_up')::bigint + 1
    or totals.dislikes <> current_setting('test.gallery_baseline_down')::bigint + 1 then raise exception 'Aggregate counts failed'; end if;
end $$;

set local role authenticated;
select public.set_showcase_vote('room-to-grow-poster', null);
select public.set_showcase_vote('room-to-grow-poster', null);
do $$ begin
  if (select count(*) from public.showcase_votes) <> 0 then raise exception 'Cancel vote failed'; end if;
  begin
    perform * from public.showcase_vote_counts(array['room-to-grow-poster']);
    raise exception 'Private aggregation RPC exposed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.gallery_user_b'), 'role', 'authenticated', 'is_anonymous', true)::text, true);
do $$ begin
  begin
    perform public.set_showcase_vote('room-to-grow-poster', -1::smallint);
    raise exception 'Anonymous account vote allowed';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
do $$ begin
  begin
    perform * from public.showcase_votes;
    raise exception 'Guest can read voter identities';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_showcase_vote('room-to-grow-poster', 1::smallint);
    raise exception 'Guest can vote';
  exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
do $$ declare totals record; begin
  select * into totals from public.showcase_vote_counts(array['room-to-grow-poster']);
  if totals.likes <> current_setting('test.gallery_baseline_up')::bigint
    or totals.dislikes <> current_setting('test.gallery_baseline_down')::bigint + 1 then raise exception 'Cancel vote totals failed'; end if;
end $$;
rollback;
select 'Gallery upvote, downvote, switch, cancellation, RLS and aggregation passed; fixtures rolled back' as result;
