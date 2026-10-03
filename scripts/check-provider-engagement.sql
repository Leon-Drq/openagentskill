-- Rollback-only permission and interaction verification. No test users or votes persist.
begin;
set local statement_timeout = '15s';
do $$
declare fixture uuid := gen_random_uuid();
begin
  insert into auth.users(id,email) values(fixture,'provider-test-'||fixture||'@example.invalid');
  perform set_config('request.jwt.claims',json_build_object('sub',fixture,'role','authenticated','is_anonymous',false)::text,true);
end;
$$;
set local role authenticated;
do $$
declare row_value public.provider_skill_engagement; old_claims text := current_setting('request.jwt.claims');
begin
  perform public.set_provider_skill_engagement('skillry-grokbot-avatar','vote',1::smallint,null);
  perform public.set_provider_skill_engagement('skillry-grokbot-avatar','save',null,true);
  select * into strict row_value from public.provider_skill_engagement where skill_slug='skillry-grokbot-avatar';
  if row_value.vote<>1 or not row_value.saved then raise exception 'Save erased vote'; end if;
  perform public.set_provider_skill_engagement('skillry-grokbot-avatar','vote',-1::smallint,null);
  select * into strict row_value from public.provider_skill_engagement where skill_slug='skillry-grokbot-avatar';
  if row_value.vote<>-1 or not row_value.saved then raise exception 'Vote erased save'; end if;
  begin
    perform public.set_provider_skill_engagement('unpublished-fixture','vote',1::smallint,null);
    raise exception 'Unknown catalog entry accepted';
  exception when foreign_key_violation then null; end;
  begin
    perform public.set_provider_skill_engagement('skillry-grokbot-avatar','vote',2::smallint,null);
    raise exception 'Invalid vote accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.provider_skill_vote_counts(array['skillry-grokbot-avatar']);
    raise exception 'User can read aggregate function';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid(),'role','authenticated','is_anonymous',false)::text,true);
  if exists(select 1 from public.provider_skill_engagement where skill_slug='skillry-grokbot-avatar') then raise exception 'Other user can see row'; end if;
  update public.provider_skill_engagement set saved=false where skill_slug='skillry-grokbot-avatar';
  if found then raise exception 'Other user can update row'; end if;
  begin
    insert into public.provider_skill_engagement(user_id,skill_slug,vote) values(row_value.user_id,'skillry-field-notes-deck',1);
    raise exception 'Other user can insert with fixture identity';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',(old_claims::jsonb||'{"is_anonymous":true}'::jsonb)::text,true);
  begin
    perform public.set_provider_skill_engagement('skillry-grokbot-avatar','vote',1::smallint,null);
    raise exception 'Anonymous user accepted';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.provider_skill_engagement) then raise exception 'Anonymous session can read rows'; end if;
  perform set_config('request.jwt.claims',old_claims,true);
  perform public.set_provider_skill_engagement('skillry-grokbot-avatar','vote',null,null);
  select * into strict row_value from public.provider_skill_engagement where skill_slug='skillry-grokbot-avatar';
  if row_value.vote is not null or not row_value.saved then raise exception 'Removing vote erased save'; end if;
  perform public.set_provider_skill_engagement('skillry-grokbot-avatar','save',null,false);
  select * into strict row_value from public.provider_skill_engagement where skill_slug='skillry-grokbot-avatar';
  if row_value.vote is not null or row_value.saved then raise exception 'Removing save failed'; end if;
end;
$$;
reset role;
select 'passed: vote/save preservation, removal, unknown slug, invalid vote, private aggregates, user isolation, anonymous rejection; all rolled back' as verification;
rollback;
