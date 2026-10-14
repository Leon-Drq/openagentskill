-- Execute against the migrated schema. All writes are rolled back, including
-- existing Agent stats/points/activity side effects. Never remove the rollback.
begin;
do $$ begin
  perform set_config('download_check.slug', (select slug from public.skills where ai_review_approved = true limit 1), true);
  perform set_config('download_check.user', (select id::text from auth.users limit 1), true);
end $$;
set local role service_role;
do $$
declare
  checked_slug text := current_setting('download_check.slug');
  actor uuid := current_setting('download_check.user')::uuid;
  initial bigint; result bigint; event_a text := 'operation-check-' || gen_random_uuid()::text;
  event_b text := 'operation-check-' || gen_random_uuid()::text;
  event_c text := 'operation-check-' || gen_random_uuid()::text;
begin
  select coalesce((select downloads from public.skill_download_totals where skill_slug = checked_slug),0) into initial;
  perform public.record_skill_download(actor, checked_slug, repeat('a',64), 'skill-document');
  perform public.record_skill_download(actor, checked_slug, repeat('a',64), 'skill-document');
  perform public.record_skill_download_action(actor, null, checked_slug, 'command-copy');
  perform public.record_skill_download_action(null, repeat('a',64), checked_slug, 'external-open');
  result := public.record_skill_download_action(null, repeat('a',64), checked_slug, 'external-open');
  assert result = initial + 5, 'Repeated account/guest operations must each increment';

  perform public.record_agent_outcome(event_a, checked_slug, 'Rollback-only verification', 'codex', 'success');
  perform public.record_agent_outcome(event_a, checked_slug, 'Rollback-only verification', 'codex', 'success');
  perform public.record_agent_outcome(event_b, checked_slug, 'Rollback-only verification', 'codex', 'failed');
  perform public.record_agent_outcome(event_c, checked_slug, 'Rollback-only verification', 'codex', 'blocked_by_risk', false, true);
  select downloads into result from public.skill_download_totals where skill_slug = checked_slug;
  assert result = initial + 7, 'Separate Agent runs count; retries, mirrors and blocked reports do not';
  perform public.record_agent_outcome(event_c, checked_slug, 'Rollback-only verification', 'codex', 'success');
  perform public.record_agent_feedback(checked_slug, 'codex', true);
  perform public.record_agent_feedback(checked_slug, 'codex', true);
  perform public.record_agent_feedback(checked_slug, 'web-user-placeholder', true, null, null, '{"source":"skill_detail_page"}');
  perform public.record_agent_feedback(checked_slug, 'codex-smoke', true);
  perform public.record_agent_outcome('smoke-' || event_a, checked_slug, 'Rollback-only verification', 'codex', 'success');
  perform public.record_agent_outcome('dry-' || event_a, checked_slug, 'Rollback-only verification', 'codex', 'success', false, false, false, null, null, '{"dry_run":true}');
  select downloads into result from public.skill_download_totals where skill_slug = checked_slug;
  assert result = initial + 10, 'Feedback calls count; browser ratings, dry runs and QA reports do not';
  assert (select site_downloads from public.skills where skills.slug = checked_slug) = result, 'Sort projection must match aggregate';
end $$;
reset role;
do $$ begin
  assert not has_table_privilege('anon','public.skill_download_receipts','SELECT,INSERT,UPDATE');
  assert not has_table_privilege('authenticated','public.skill_download_totals','INSERT,UPDATE');
  assert not has_function_privilege('anon','public.record_skill_download_action(uuid,text,text,text)','EXECUTE');
  assert not has_function_privilege('anon','private.record_download_agent_usage()','EXECUTE');
end $$;
rollback;
select 'PASS: repeated operations, Agent reports, transport retries, QA exclusions, projections and permissions; all writes rolled back' as result;
