-- Keep automatic marketplace growth high-signal and globally deduplicated.

create unique index if not exists skills_approved_source_content_hash_unique
  on public.skills (source_content_hash)
  where source_content_hash is not null
    and ai_review_approved = true;

update public.skill_candidates
set status = 'rejected',
    risk_reasons = array_append(
      coalesce(risk_reasons, '{}'::text[]),
      'Automatic discovery requires at least 20 GitHub stars'
    ),
    last_error = null,
    lease_owner = null,
    lease_expires_at = null,
    updated_at = now()
where github_stars < 20
  and status in ('discovered', 'review_required', 'validation_error', 'publication_error');
