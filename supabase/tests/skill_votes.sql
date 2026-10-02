-- Privileged SQL connection; all fixtures and votes roll back, including on failure.
begin;
select set_config('test.skill_slug',(select slug from public.skills where ai_review_approved=true or listing_status in ('owner_published','static_checked') order by slug limit 1),true);
select set_config('test.skill_hidden',(select coalesce((select slug from public.skills where not coalesce(ai_review_approved=true or listing_status in ('owner_published','static_checked'),false) limit 1),'')),true);
select set_config('test.skill_baseline_up', (select count(*)::text from public.skill_votes where skill_slug = current_setting('test.skill_slug') and vote = 1), true);
select set_config('test.skill_baseline_down', (select count(*)::text from public.skill_votes where skill_slug = current_setting('test.skill_slug') and vote = -1), true);
select set_config('test.skill_user_a', gen_random_uuid()::text, true);
select set_config('test.skill_user_b', gen_random_uuid()::text, true);
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
  (current_setting('test.skill_user_a')::uuid, 'authenticated', 'authenticated', current_setting('test.skill_user_a') || '@example.invalid', '{}'::jsonb),
  (current_setting('test.skill_user_b')::uuid, 'authenticated', 'authenticated', current_setting('test.skill_user_b') || '@example.invalid', '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.skill_user_a'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
select public.set_skill_vote(current_setting('test.skill_slug'), 1::smallint);
select public.set_skill_vote(current_setting('test.skill_slug'), 1::smallint);
do $$ begin
  if (select count(*) from public.skill_votes) <> 1 then raise exception 'Idempotent upvote failed'; end if;
  begin
    insert into public.skill_votes(user_id, skill_slug, vote) values (current_setting('test.skill_user_b')::uuid, current_setting('test.skill_slug'), -1);
    raise exception 'Cross-user insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.skill_votes set user_id = current_setting('test.skill_user_b')::uuid;
    raise exception 'Vote reassignment allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_skill_vote('not-a-real-case', 1::smallint);
    raise exception 'Unknown case allowed';
  exception when foreign_key_violation or insufficient_privilege then null; end;
  begin
    perform public.set_skill_vote(current_setting('test.skill_slug'), 2::smallint);
    raise exception 'Invalid direction allowed';
  exception when check_violation then null; end;
end $$;

select public.set_skill_vote(current_setting('test.skill_slug'), -1::smallint);
select public.set_skill_vote(current_setting('test.skill_slug'), -1::smallint);
do $$ begin
  if (select count(*) from public.skill_votes) <> 1 or (select vote from public.skill_votes) <> -1 then raise exception 'Exclusive switch to downvote failed'; end if;
end $$;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.skill_user_b'), 'role', 'authenticated', 'is_anonymous', false)::text, true);
do $$ begin
  if (select count(*) from public.skill_votes) <> 0 then raise exception 'Other user votes exposed'; end if;
  delete from public.skill_votes where user_id = current_setting('test.skill_user_a')::uuid;
  if found then raise exception 'Cross-user delete allowed'; end if;
  update public.skill_votes set vote = 1 where user_id = current_setting('test.skill_user_a')::uuid;
  if found then raise exception 'Cross-user update allowed'; end if;
end $$;
select public.set_skill_vote(current_setting('test.skill_slug'), 1::smallint);

set local role service_role;
do $$ declare totals record; begin
  select * into totals from public.skill_vote_counts(array[current_setting('test.skill_slug')]);
  if totals.likes <> current_setting('test.skill_baseline_up')::bigint + 1
    or totals.dislikes <> current_setting('test.skill_baseline_down')::bigint + 1 then raise exception 'Aggregate counts failed'; end if;
end $$;

set local role authenticated;
select public.set_skill_vote(current_setting('test.skill_slug'), null);
select public.set_skill_vote(current_setting('test.skill_slug'), null);
do $$ begin
  if (select count(*) from public.skill_votes) <> 0 then raise exception 'Cancel vote failed'; end if;
  begin
    perform * from public.skill_vote_counts(array[current_setting('test.skill_slug')]);
    raise exception 'Private aggregation RPC exposed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.skill_user_b'), 'role', 'authenticated', 'is_anonymous', true)::text, true);
do $$ begin
  begin
    perform public.set_skill_vote(current_setting('test.skill_slug'), -1::smallint);
    raise exception 'Anonymous account vote allowed';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
do $$ begin
  begin
    perform * from public.skill_votes;
    raise exception 'Guest can read voter identities';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_skill_vote(current_setting('test.skill_slug'), 1::smallint);
    raise exception 'Guest can vote';
  exception when insufficient_privilege then null; end;
end $$;
set local role service_role;
do $$ declare totals record; begin
  select * into totals from public.skill_vote_counts(array[current_setting('test.skill_slug')]);
  if totals.likes <> current_setting('test.skill_baseline_up')::bigint
    or totals.dislikes <> current_setting('test.skill_baseline_down')::bigint + 1 then raise exception 'Cancel vote totals failed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.skill_user_b'),'role','authenticated','is_anonymous',false)::text,true);
do $$ begin
  if current_setting('test.skill_hidden')<>'' then
    begin
      perform public.set_skill_vote(current_setting('test.skill_hidden'),1::smallint);
      raise exception 'Hidden skill accepted';
    exception when insufficient_privilege then null; end;
  end if;
  -- An authenticated caller cannot vote on an unlisted or fabricated skill.
  begin
    insert into public.skill_votes(user_id,skill_slug,vote) values(current_setting('test.skill_user_b')::uuid,'not-a-real-skill',1);
    raise exception 'Nonpublic target accepted';
  exception when insufficient_privilege or foreign_key_violation then null; end;
end $$;
rollback;
select 'Skill upvote, downvote, switch, cancellation, RLS and aggregation passed; fixtures rolled back' as result;
