-- Open submission pipeline: accept standards-compliant zero-star SKILL.md
-- sources, persist review state, and keep publisher identity separate from
-- automated quality review.

alter table public.skill_submissions
  add column if not exists repository_url text,
  add column if not exists source_ref text,
  add column if not exists skill_path text,
  add column if not exists skill_name text,
  add column if not exists skill_description text,
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists submitter_github text,
  add column if not exists submitter_x text,
  add column if not exists identity_provider text,
  add column if not exists identity_verified boolean not null default false,
  add column if not exists status_token_hash text,
  add column if not exists request_fingerprint text,
  add column if not exists validation_result jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists review_started_at timestamptz,
  add column if not exists reviewed_at timestamptz;

alter table public.skills
  add column if not exists listing_status text not null default 'reviewed',
  add column if not exists source_ref text,
  add column if not exists source_path text,
  add column if not exists publisher_github text,
  add column if not exists publisher_x text,
  add column if not exists publisher_verified boolean not null default false;

update public.skill_submissions
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

update public.skills
set listing_status = 'listed'
where coalesce(ai_review_approved, false) = false
  and listing_status = 'reviewed';

create index if not exists idx_skill_submissions_public_queue
  on public.skill_submissions (status, created_at desc);

create index if not exists idx_skill_submissions_fingerprint_created
  on public.skill_submissions (request_fingerprint, created_at desc)
  where request_fingerprint is not null;

create index if not exists idx_skill_submissions_source_path
  on public.skill_submissions (github_repo, source_ref, skill_path);

create index if not exists idx_skills_listing_status
  on public.skills (listing_status, created_at desc);

drop trigger if exists update_skill_submissions_updated_at on public.skill_submissions;
create trigger update_skill_submissions_updated_at
  before update on public.skill_submissions
  for each row execute function public.update_updated_at_column();

alter table public.skill_submissions enable row level security;
revoke all on table public.skill_submissions from anon, authenticated;

-- Explicit grants keep server-only access working when Supabase disables
-- automatic Data API exposure for existing projects.
grant select, insert, update on table public.skill_submissions to service_role;
grant select, insert, update on table public.skills to service_role;
grant insert on table public.activity_feed to service_role;

comment on column public.skill_submissions.status is
  'draft, submitted, processing, listed, reviewed, duplicate, or quarantined';
comment on column public.skill_submissions.identity_verified is
  'True only after OAuth or repository ownership verification; handles alone never verify identity.';
comment on column public.skills.listing_status is
  'Community listing and trust lifecycle; default Resolve remains restricted to reviewed records.';
