-- Allow a later worker to recover a publication interrupted after the row was
-- marked publishing. The lease predicate still prevents concurrent handling.
drop index if exists public.skill_candidates_claim_idx;

create index skill_candidates_claim_idx
  on public.skill_candidates (status, next_attempt_at, github_stars desc, discovered_at)
  where status in (
    'discovered', 'fast_track', 'review_required', 'publishing',
    'validation_error', 'publication_error'
  );
