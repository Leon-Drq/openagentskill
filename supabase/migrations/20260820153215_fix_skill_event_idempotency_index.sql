-- A non-partial unique index is required for PostgREST upsert(on_conflict).
-- PostgreSQL unique indexes still allow multiple NULL values.
drop index if exists public.skill_events_event_key_unique;
create unique index skill_events_event_key_unique on public.skill_events (event_key);
