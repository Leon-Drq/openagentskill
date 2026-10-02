-- Internal trigger helpers must not be public RPCs. Server triggers and maintenance retain access.
revoke execute on function public.refresh_agent_outcome_stats_for_skill(text) from public, anon, authenticated;
revoke execute on function public.refresh_agent_outcome_stats_for_event() from public, anon, authenticated;
grant execute on function public.refresh_agent_outcome_stats_for_skill(text) to service_role;
grant execute on function public.refresh_agent_outcome_stats_for_event() to service_role;
