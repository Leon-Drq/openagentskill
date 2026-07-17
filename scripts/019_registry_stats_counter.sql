-- Keep the public registry total in one row so pages never need a slow
-- COUNT(*) over the full skills table during a request.
CREATE TABLE IF NOT EXISTS public.registry_stats (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  approved_skill_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.registry_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registry_stats_select_public" ON public.registry_stats;
CREATE POLICY "registry_stats_select_public"
  ON public.registry_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.registry_stats TO anon, authenticated;

-- Start from the authoritative current total, then keep it synchronized below.
INSERT INTO public.registry_stats (id, approved_skill_count, updated_at)
SELECT TRUE, COUNT(*) FILTER (WHERE ai_review_approved), NOW()
FROM public.skills
ON CONFLICT (id) DO UPDATE SET
  approved_skill_count = EXCLUDED.approved_skill_count,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.refresh_registry_skill_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ai_review_approved THEN
      UPDATE public.registry_stats
      SET approved_skill_count = approved_skill_count + 1,
          updated_at = NOW()
      WHERE id = TRUE;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.ai_review_approved THEN
      UPDATE public.registry_stats
      SET approved_skill_count = GREATEST(approved_skill_count - 1, 0),
          updated_at = NOW()
      WHERE id = TRUE;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.ai_review_approved IS DISTINCT FROM NEW.ai_review_approved THEN
    UPDATE public.registry_stats
    SET approved_skill_count = GREATEST(
          approved_skill_count + CASE WHEN NEW.ai_review_approved THEN 1 ELSE -1 END,
          0
        ),
        updated_at = NOW()
    WHERE id = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_registry_skill_count() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS skills_refresh_registry_count ON public.skills;
CREATE TRIGGER skills_refresh_registry_count
  AFTER INSERT OR UPDATE OF ai_review_approved OR DELETE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_registry_skill_count();
