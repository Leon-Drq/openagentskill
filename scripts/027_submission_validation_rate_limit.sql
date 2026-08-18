-- Protect the public preflight endpoint from exhausting the registry's GitHub
-- API quota. Fingerprints are one-way hashes of IP, user agent, secret, and day.

create table if not exists public.submission_validation_events (
  id uuid primary key default gen_random_uuid(),
  request_fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_submission_validation_events_fingerprint_created
  on public.submission_validation_events (request_fingerprint, created_at desc);

alter table public.submission_validation_events enable row level security;
revoke all on table public.submission_validation_events from anon, authenticated;
grant select, insert, delete on table public.submission_validation_events to service_role;

comment on table public.submission_validation_events is
  'Server-only, privacy-preserving rate-limit events for public Skill source validation.';
