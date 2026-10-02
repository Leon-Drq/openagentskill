-- Match the public directory's publication predicate and deterministic ordering.
-- Existing DESC indexes use NULLS FIRST and cannot serve NULLS LAST + slug.
create index if not exists skills_public_catalog_quality_slug_idx
  on public.skills (quality_score desc nulls last, slug asc)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');

create index if not exists skills_public_catalog_stars_slug_idx
  on public.skills (github_stars desc nulls last, slug asc)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');

create index if not exists skills_public_catalog_created_slug_idx
  on public.skills (created_at desc nulls last, slug asc)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');

create index if not exists skills_public_catalog_updated_slug_idx
  on public.skills (github_last_pushed_at desc nulls last, slug asc)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');

create index if not exists skills_public_catalog_downloads_slug_idx
  on public.skills (downloads desc nulls last, slug asc)
  where ai_review_approved = true or listing_status in ('owner_published', 'static_checked');
