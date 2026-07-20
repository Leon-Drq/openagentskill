-- Keep public browse, search, and resolver reads cheap as the registry grows.
-- These indexes match the approved-only ordering paths used by lib/db/skills.ts.

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

-- Full-text search replaces the old multi-column ILIKE OR query. The document
-- intentionally indexes a bounded description excerpt so search stays fast
-- without duplicating every long README in the index.
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS search_document tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', left(coalesce(long_description, ''), 1600)), 'C') ||
    setweight(to_tsvector('simple', coalesce(tagline, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(github_repo, '')), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_skills_approved_search_document
  ON public.skills
  USING GIN (search_document)
  WHERE ai_review_approved = TRUE;

ANALYZE public.skills;
