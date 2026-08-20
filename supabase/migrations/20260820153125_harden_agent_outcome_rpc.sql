-- Outcome writes are still public through the validated Next.js endpoint, but
-- direct PostgREST execution is reserved for the server-side service role.
revoke all on function public.record_agent_outcome(
  text, text, text, text, text, boolean, boolean, boolean, integer, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_agent_outcome(
  text, text, text, text, text, boolean, boolean, boolean, integer, text, jsonb
) to service_role;
