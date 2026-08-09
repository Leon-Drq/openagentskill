-- Detail and API reads use the agent_outcome_stats primary key (skill_slug).
-- Avoid maintaining a ranking index until a verified-install leaderboard needs it.
DROP INDEX IF EXISTS public.agent_outcome_stats_verified_installs_idx;
