-- All fixture writes roll back; no publication or review decision is made.
begin;
set local role service_role;
do $$
declare
  v_repo text := 'product-metadata-test/' || gen_random_uuid()::text;
  v_id uuid := gen_random_uuid();
  v_skill_id uuid;
  v_request uuid := gen_random_uuid();
  v_metadata jsonb := '{"websiteUrl":"https://example.com/product","logoUrl":"https://example.com/logo.svg","prerequisites":"Node.js 20+","runtimeNotes":"Not runtime verified"}';
  v_result jsonb;
  v_review jsonb := '{"approved":false,"scores":{"security":5},"issues":["Original manual review"]}';
begin
  insert into public.skill_submissions(id,github_repo,submission_source,status,skill_path,ai_review_result,validation_result)
    values(v_id,v_repo,'user','listed','SKILL.md',v_review,'{"queue":{"attempts":1},"source_ref":"unchanged"}');
  v_result := public.update_skill_product_metadata(v_request,v_repo,'SKILL.md',v_id,v_metadata,'Fixture metadata correction',true);
  assert v_result->>'submission_status' = 'listed';
  assert not exists(select 1 from public.skill_product_metadata_changes where request_id=v_request);
  assert not exists(select 1 from public.skill_submissions where id=v_id and validation_result ? 'product_metadata');
  v_result := public.update_skill_product_metadata(v_request,v_repo,'SKILL.md',v_id,v_metadata,'Fixture metadata correction');
  assert v_result->>'slug' is null;
  assert not exists(select 1 from public.skills where github_repo=v_repo);
  assert exists(select 1 from public.skill_submissions where id=v_id and status='listed' and ai_review_result=v_review
    and validation_result->'product_metadata'=v_metadata and validation_result->'queue'->>'attempts'='1');
  assert exists(select 1 from public.skill_product_metadata_changes where request_id=v_request and previous->>'submission_status'='listed');
  v_result := public.update_skill_product_metadata(v_request,v_repo,'SKILL.md',v_id,v_metadata,'Fixture metadata correction');
  assert v_result->>'replayed'='true';
  begin
    perform public.update_skill_product_metadata(v_request,v_repo,'SKILL.md',v_id,'{}','Fixture metadata correction');
    raise exception 'Expected retry conflict';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_skill_product_metadata(gen_random_uuid(),v_repo,'other/SKILL.md',v_id,v_metadata,'Fixture metadata correction');
    raise exception 'Expected identity conflict';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.update_skill_product_metadata(gen_random_uuid(),v_repo,'SKILL.md',v_id,'{"ai_review_approved":true}','Fixture review tampering');
    raise exception 'Expected unknown field rejection';
  exception when invalid_parameter_value then null; end;
  update public.skill_submissions set status='processing' where id=v_id;
  begin
    perform public.update_skill_product_metadata(gen_random_uuid(),v_repo,'SKILL.md',v_id,v_metadata,'Fixture worker concurrency');
    raise exception 'Expected worker conflict';
  exception when invalid_parameter_value then null; end;
  update public.skill_submissions set status='listed' where id=v_id;
  insert into public.skills(slug,name,description,author_name,repository,github_repo,source_path,source_commit_sha,category,license,listing_status,ai_review_approved,ai_review_score,verified)
    values('product-metadata-' || gen_random_uuid()::text,'Fixture','Product information fixture','Fixture','https://github.com/' || v_repo,v_repo,'SKILL.md',repeat('a',40),'developer-tools','MIT','static_checked',false,'{"method":"static","security":5}',false) returning id into v_skill_id;
  v_result := public.update_skill_product_metadata(gen_random_uuid(),v_repo,'SKILL.md',v_id,v_metadata,'Fixture public metadata correction');
  assert exists(select 1 from public.skills where id=v_skill_id and product_metadata=v_metadata and listing_status='static_checked' and not ai_review_approved and not verified and ai_review_score='{"method":"static","security":5}'::jsonb and source_commit_sha=repeat('a',40));
  assert exists(select 1 from public.skill_directory_entries where id=v_skill_id and product_metadata=v_metadata);
  assert has_table_privilege('service_role','public.skill_product_metadata_changes','INSERT');
  assert not has_table_privilege('service_role','public.skill_product_metadata_changes','UPDATE');
  assert not has_table_privilege('anon','public.skill_product_metadata_changes','SELECT');
  assert not has_table_privilege('authenticated','public.skill_product_metadata_changes','SELECT');
  assert not has_function_privilege('anon','public.update_skill_product_metadata(uuid,text,text,uuid,jsonb,text,boolean)','EXECUTE');
  assert not has_function_privilege('authenticated','public.update_skill_product_metadata(uuid,text,text,uuid,jsonb,text,boolean)','EXECUTE');
end $$;
rollback;
select 'PASS: metadata persistence, dry run, idempotency, identity binding, review preservation, pending state, audit and role isolation; fixtures rolled back' as result;
