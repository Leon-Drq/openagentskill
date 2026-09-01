-- The source sync now calls this function with the service role. Remove the
-- temporary anon/authenticated execution path so the provenance writer is not
-- exposed through the public Data API.
revoke execute on function public.record_skill_source_version(
  text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_skill_source_version(
  text, text, text, text, text, text, text, text, text, jsonb
) to service_role;
