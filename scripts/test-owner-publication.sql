-- Integration test: all fixture writes roll back. Run only after the migration.
begin;
set local role service_role;
do $$
declare
  test_id uuid := gen_random_uuid();
  test_slug text := 'owner-channel-test-' || gen_random_uuid()::text;
  test_repo text := 'owner-channel-test/' || gen_random_uuid()::text;
  source jsonb;
  result jsonb;
  previous jsonb;
  n integer;
begin
  source := jsonb_build_object('slug',test_slug,'github_repo',test_repo,'source_path','SKILL.md',
    'source_commit_sha',repeat('a',40),'source_content_hash',replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
    'name','Transactional test fixture','description','A non-public test fixture that rolls back.',
    'author_name','Test','author_url','https://github.com/owner-channel-test',
    'repository','https://github.com/' || test_repo,'github_stars',0,'github_forks',0,
    'github_last_pushed_at',now(),'category','developer-tools','tags','["test"]'::jsonb,
    'frameworks','[]'::jsonb,'version','1.0.0','license','MIT','install_command','test-only-do-not-run');
  insert into public.skill_submissions(github_repo,submission_source,status,skill_path,ai_review_result)
    values(test_repo,'user','rejected','SKILL.md','{"approved":false,"scores":{"security":5},"issues":["fixture review issue"]}');
  result := public.publish_owner_skill(test_id,source,'Owner channel transaction verification','{"riskLevel":"low","executed":false}'::jsonb);
  assert result->>'status' = 'published';
  assert (result->>'ai_review_approved')::boolean = false;
  assert exists(select 1 from skills where slug=test_slug and listing_status='owner_published' and not ai_review_approved and not verified and not publisher_verified);
  assert exists(select 1 from skill_submissions where github_repo=test_repo and status='rejected' and ai_review_result->>'approved'='false');
  select previous_review into previous from owner_skill_publications where request_id=test_id;
  assert previous->'submissions'->0->'review'->'scores'->>'security' = '5';

  result := public.publish_owner_skill(test_id,source,'Owner channel transaction verification','{}');
  assert result->>'replayed' = 'true';
  select count(*) into n from skills where github_repo=test_repo;
  assert n=1;
  result := public.publish_owner_skill(gen_random_uuid(),source,'Owner channel same source verification','{}');
  assert result->>'status' = 'unchanged';
  result := public.publish_owner_skill(gen_random_uuid(),source || jsonb_build_object('github_repo','duplicate/' || test_slug,'slug','duplicate-' || test_slug),'Owner channel duplicate verification','{}');
  assert result->>'status' = 'duplicate';
  assert result->>'slug' = test_slug;
  begin
    perform public.publish_owner_skill(test_id,source,'Different reason must conflict','{}');
    raise exception 'Expected request conflict';
  exception when invalid_parameter_value then null;
  end;

  -- An old score cannot be relabelled as a new revision's score.
  update skills set ai_review_score='{"security":5}',ai_review_issues=array['fixture old issue'] where slug=test_slug;
  source := source || jsonb_build_object('source_commit_sha',repeat('b',40),'source_content_hash',replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
  result := public.publish_owner_skill(gen_random_uuid(),source,'Owner channel new revision verification','{}');
  assert result->>'status' = 'updated';
  assert exists(select 1 from skills where slug=test_slug and ai_review_score is null and not ai_review_approved and ai_review_issues=array['fixture old issue']);
  assert exists(select 1 from owner_skill_publications where skill_slug=test_slug and previous_review->'scores'->>'security'='5');

  -- Historical repo-only duplicates must not steal the exact pinned source.
  insert into skills(slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved,created_at)
  values(test_slug || '-legacy','Legacy duplicate','Untracked legacy fixture','Test','https://github.com/' || test_repo,test_repo,'developer-tools','MIT',true,now()-interval '1 year');
  update skills set ai_review_approved=true,listing_status='reviewed',ai_review_score='{"security":41}' where slug=test_slug;
  source := source || '{"version":"2.0.0"}'::jsonb;
  result := public.publish_owner_skill(gen_random_uuid(),source,'Owner metadata refresh verification','{}');
  assert result->>'status' = 'updated';
  assert result->>'slug' = test_slug;
  assert result->>'ai_review_approved' = 'true';
  assert exists(select 1 from skills where slug=test_slug and version='2.0.0' and ai_review_approved and listing_status='reviewed' and ai_review_score->>'security'='41');
  assert exists(select 1 from skills where slug=test_slug || '-legacy' and source_content_hash is null and ai_review_approved);
  result := public.publish_owner_skill(gen_random_uuid(),source,'Owner unchanged metadata verification','{}');
  assert result->>'status' = 'unchanged';
  result := public.publish_owner_skill(gen_random_uuid(),source || jsonb_build_object('github_repo','duplicate/' || test_slug,'slug','duplicate-' || test_slug),'Owner existing hash verification','{}');
  assert result->>'status' = 'duplicate';
  assert result->>'slug' = test_slug;
  assert not has_function_privilege('anon','public.publish_owner_skill(uuid,jsonb,text,jsonb)','execute');
  assert not has_function_privilege('authenticated','public.publish_owner_skill(uuid,jsonb,text,jsonb)','execute');
  assert not has_table_privilege('anon','public.owner_skill_publications','select');
  assert not has_table_privilege('authenticated','public.owner_skill_publications','select');
  assert not has_table_privilege('service_role','public.owner_skill_publications','update');
  assert not has_table_privilege('service_role','public.owner_skill_publications','delete');
  assert not has_table_privilege('service_role','public.owner_skill_publications','truncate');
  perform set_config('owner_test.slug',test_slug,true);
end;
$$;
set local role anon;
do $$
begin
  assert exists(select 1 from public.skills where slug=current_setting('owner_test.slug'));
  begin
    update public.skills set listing_status='owner_published' where slug=current_setting('owner_test.slug');
    if found then raise exception 'Anonymous update unexpectedly succeeded'; end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local role authenticated;
do $$
begin
  assert exists(select 1 from public.skills where slug=current_setting('owner_test.slug'));
  begin
    update public.skills set ai_review_approved=true where slug=current_setting('owner_test.slug');
    if found then raise exception 'Authenticated update unexpectedly succeeded'; end if;
  exception when insufficient_privilege then null;
  end;
end;
$$;
rollback;
select 'Owner publication transaction, permissions, deduplication and preservation tests passed; all fixtures rolled back.' as result;
