-- Run after the canonical source migration, in a transaction that rolls back.
-- Fixtures use reserved test identities and never alter review or usage history.
do $test$
declare
  canonical_id uuid;
  rejected_id uuid;
begin
  insert into public.skills (slug,name,description,author_name,repository,github_repo,category,license,source_path,listing_status,ai_review_approved)
    values ('oas-test-canonical-source','Fixture Skill','Test only','fixture','https://github.com/oas-test/source','oas-test/source','automation','MIT','skills/one/SKILL.md','static_checked',false)
    returning id into canonical_id;
  begin
    insert into public.skills (slug,name,description,author_name,repository,github_repo,category,license,source_path,listing_status,ai_review_approved)
      values ('oas-test-duplicate-source','Fixture Skill','Test only','fixture','https://github.com/oas-test/source','OAS-TEST/source','automation','MIT','skills/one/SKILL.md','static_checked',false);
    raise exception 'Duplicate source insert was allowed';
  exception when unique_violation then
    if sqlerrm <> 'Public Skill source already has a canonical listing' then raise; end if;
  end;
  insert into public.skills (slug,name,description,author_name,repository,github_repo,category,license,source_path,listing_status,ai_review_approved)
    values ('oas-test-canonical-source','Fixture Skill','Updated metadata','fixture','https://github.com/oas-test/source','oas-test/source','automation','MIT','skills/one/SKILL.md','static_checked',false)
    on conflict (slug) do update set description=excluded.description;
  if not exists (select 1 from public.skills where id=canonical_id and description='Updated metadata' and ai_review_approved=false) then
    raise exception 'Same-slug synchronization or review preservation failed';
  end if;
  insert into public.skills (slug,name,description,author_name,repository,github_repo,category,license,source_path,listing_status,ai_review_approved)
    values ('oas-test-other-path','Fixture Skill','Test only','fixture','https://github.com/oas-test/source','oas-test/source','automation','MIT','skills/two/SKILL.md','static_checked',false);
  if (select count(*) from public.skill_directory_entries where github_repo='oas-test/source') <> 2 then
    raise exception 'Distinct Skill paths must be separately discoverable';
  end if;
  insert into public.skills (slug,name,description,author_name,repository,github_repo,category,license,source_path,listing_status,ai_review_approved)
    values ('oas-test-unpublished-source','Fixture Skill','Test only','fixture','https://github.com/oas-test/unpublished','oas-test/unpublished','automation','MIT','SKILL.md','reviewed',false)
    returning id into rejected_id;
  insert into public.skills (slug,name,description,author_name,repository,github_repo,category,license,source_path,listing_status,ai_review_approved)
    values ('oas-test-public-source','Fixture Skill','Test only','fixture','https://github.com/oas-test/unpublished','oas-test/unpublished','automation','MIT','SKILL.md','static_checked',false);
  if not exists (select 1 from public.skills where id=rejected_id and ai_review_approved=false and listing_status='reviewed') then
    raise exception 'Unpublished history was modified';
  end if;
end;
$test$;
