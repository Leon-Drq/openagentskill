-- Keep navigation, locale changes, and sitemap reads off the slow full-table
-- sort path. These partial indexes only cover publicly approved skills.

CREATE INDEX IF NOT EXISTS idx_skills_approved_quality_stars
  ON public.skills (quality_score DESC, github_stars DESC)
  WHERE ai_review_approved = TRUE;

CREATE INDEX IF NOT EXISTS idx_skills_approved_category_quality_stars
  ON public.skills (category, quality_score DESC, github_stars DESC)
  WHERE ai_review_approved = TRUE;

CREATE INDEX IF NOT EXISTS idx_skills_approved_stars
  ON public.skills (github_stars DESC)
  WHERE ai_review_approved = TRUE;

CREATE INDEX IF NOT EXISTS idx_skills_approved_freshness_quality
  ON public.skills (github_last_pushed_at DESC NULLS LAST, quality_score DESC)
  WHERE ai_review_approved = TRUE;

CREATE INDEX IF NOT EXISTS idx_skills_approved_downloads_created
  ON public.skills (downloads DESC, created_at DESC)
  WHERE ai_review_approved = TRUE;

CREATE INDEX IF NOT EXISTS idx_skills_approved_slug_refresh
  ON public.skills (slug)
  WHERE ai_review_approved = TRUE
    AND github_repo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_skills_approved_created_for_seo
  ON public.skills (created_at DESC)
  WHERE ai_review_approved = TRUE;

ANALYZE public.skills;
