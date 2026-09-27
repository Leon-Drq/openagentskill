-- Run through a privileged test connection after the migration. All event and
-- trigger effects roll back; no review/publication records are modified.
begin;
do $test$
declare
  public_slugs text[];
  hidden_slug text;
  target_slug text;
  role_name text;
begin
  public_slugs := array[
    (select slug from public.skills where ai_review_approved = true limit 1),
    (select slug from public.skills where listing_status = 'owner_published' and ai_review_approved is not true limit 1),
    (select slug from public.skills where listing_status = 'static_checked' and ai_review_approved is not true limit 1)
  ];
  select slug into hidden_slug from public.skills
    where ai_review_approved is not true and coalesce(listing_status, '') not in ('owner_published', 'static_checked') limit 1;
  if array_position(public_slugs, null) is not null or hidden_slug is null then
    raise exception 'Missing visibility fixtures; cannot verify event policy';
  end if;

  foreach role_name in array array['anon', 'authenticated'] loop
    execute format('set local role %I', role_name);
    foreach target_slug in array public_slugs loop
      insert into public.skill_events(skill_slug, event_type, session_id, source, is_verified, metadata)
        values (target_slug, 'view', 'rls-regression-rollback', 'web', false, '{"test":"rolled-back"}');
    end loop;
    begin
      insert into public.skill_events(skill_slug, event_type) values (hidden_slug, 'view');
      raise exception 'Private listing accepted';
    exception when insufficient_privilege then null; end;
    begin
      insert into public.skill_events(skill_slug, event_type, is_verified) values (public_slugs[1], 'view', true);
      raise exception 'Verified event forgery accepted';
    exception when insufficient_privilege then null; end;
    begin
      insert into public.skill_events(skill_slug, event_type) values (public_slugs[1], 'install_success');
      raise exception 'Outcome forgery accepted';
    exception when insufficient_privilege then null; end;
    begin
      insert into public.skill_events(skill_slug, event_type, user_id)
        values (public_slugs[1], 'view', '00000000-0000-4000-8000-000000000001');
      raise exception 'User impersonation accepted';
    exception when insufficient_privilege then null; end;
    if exists (select 1 from public.skill_events limit 1) then
      raise exception 'Private event rows became readable';
    end if;
    reset role;
  end loop;
end $test$;
rollback;
select 'PASS: public events accepted, private/verified/outcome/user forgeries denied; all writes rolled back' as result;
