-- Keep background maintenance queries independent from interactive registry
-- reads. These indexes support the bounded star-refresh and SEO candidate
-- selection paths as the catalog grows.

CREATE INDEX IF NOT EXISTS idx_skills_approved_slug_refresh
  ON public.skills (slug)
  WHERE ai_review_approved = TRUE
    AND github_repo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skills_approved_created_for_seo
  ON public.skills (created_at DESC)
  WHERE ai_review_approved = TRUE;

ANALYZE public.skills;
