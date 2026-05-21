-- ============================================================
-- 005: Supabase security advisor fixes
-- ============================================================

-- Keep helper functions on a fixed search path.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_level(points INTEGER)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN points >= 100000 THEN '{"level":6,"title":"Legend","next":null}'::jsonb
    WHEN points >= 25000  THEN jsonb_build_object('level',5,'title','Sage','next',100000,'progress',((points-25000)::float/(100000-25000)*100)::int)
    WHEN points >= 8000   THEN jsonb_build_object('level',4,'title','Architect','next',25000,'progress',((points-8000)::float/(25000-8000)*100)::int)
    WHEN points >= 2000   THEN jsonb_build_object('level',3,'title','Artisan','next',8000,'progress',((points-2000)::float/(8000-2000)*100)::int)
    WHEN points >= 500    THEN jsonb_build_object('level',2,'title','Builder','next',2000,'progress',((points-500)::float/(2000-500)*100)::int)
    ELSE                       jsonb_build_object('level',1,'title','Explorer','next',500,'progress',(points::float/500*100)::int)
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- skill_relations is read-only from public clients.
ALTER TABLE public.skill_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "relations_insert_public" ON public.skill_relations;
DROP POLICY IF EXISTS "relations_select_all" ON public.skill_relations;

CREATE POLICY "relations_select_all"
  ON public.skill_relations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Private tables intentionally deny browser/API key access. Service role still bypasses RLS.
DROP POLICY IF EXISTS "skill_submissions_no_public_access" ON public.skill_submissions;
CREATE POLICY "skill_submissions_no_public_access"
  ON public.skill_submissions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "skill_feedback_no_public_access" ON public.skill_feedback;
CREATE POLICY "skill_feedback_no_public_access"
  ON public.skill_feedback
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Replace the security-definer aggregate view with a real cache table maintained
-- by a trigger, so public users see aggregate stats without raw feedback access.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'skill_stats'
      AND c.relkind = 'v'
  ) THEN
    DROP VIEW public.skill_stats;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.skill_stats (
  skill_slug      TEXT PRIMARY KEY REFERENCES public.skills(slug) ON DELETE CASCADE,
  total_calls     INTEGER NOT NULL DEFAULT 0,
  success_calls   INTEGER NOT NULL DEFAULT 0,
  success_rate    NUMERIC,
  avg_latency_ms  INTEGER,
  unique_agents   INTEGER NOT NULL DEFAULT 0,
  last_called_at  TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_stats_select_public" ON public.skill_stats;
CREATE POLICY "skill_stats_select_public"
  ON public.skill_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.skill_stats TO anon, authenticated;

INSERT INTO public.skill_stats (
  skill_slug,
  total_calls,
  success_calls,
  success_rate,
  avg_latency_ms,
  unique_agents,
  last_called_at,
  updated_at
)
SELECT
  skill_slug,
  COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE success)::INTEGER,
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE ROUND((COUNT(*) FILTER (WHERE success))::NUMERIC / COUNT(*)::NUMERIC * 100, 2)
  END,
  ROUND(AVG(latency_ms), 0)::INTEGER,
  COUNT(DISTINCT agent_id)::INTEGER,
  MAX(created_at),
  NOW()
FROM public.skill_feedback
GROUP BY skill_slug
ON CONFLICT (skill_slug) DO UPDATE SET
  total_calls = EXCLUDED.total_calls,
  success_calls = EXCLUDED.success_calls,
  success_rate = EXCLUDED.success_rate,
  avg_latency_ms = EXCLUDED.avg_latency_ms,
  unique_agents = EXCLUDED.unique_agents,
  last_called_at = EXCLUDED.last_called_at,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.refresh_skill_stats_for_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_slug TEXT;
BEGIN
  affected_slug := COALESCE(NEW.skill_slug, OLD.skill_slug);

  INSERT INTO public.skill_stats (
    skill_slug,
    total_calls,
    success_calls,
    success_rate,
    avg_latency_ms,
    unique_agents,
    last_called_at,
    updated_at
  )
  SELECT
    skill_slug,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE success)::INTEGER,
    CASE
      WHEN COUNT(*) = 0 THEN NULL
      ELSE ROUND((COUNT(*) FILTER (WHERE success))::NUMERIC / COUNT(*)::NUMERIC * 100, 2)
    END,
    ROUND(AVG(latency_ms), 0)::INTEGER,
    COUNT(DISTINCT agent_id)::INTEGER,
    MAX(created_at),
    NOW()
  FROM public.skill_feedback
  WHERE skill_slug = affected_slug
  GROUP BY skill_slug
  ON CONFLICT (skill_slug) DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    success_calls = EXCLUDED.success_calls,
    success_rate = EXCLUDED.success_rate,
    avg_latency_ms = EXCLUDED.avg_latency_ms,
    unique_agents = EXCLUDED.unique_agents,
    last_called_at = EXCLUDED.last_called_at,
    updated_at = NOW();

  DELETE FROM public.skill_stats
  WHERE skill_slug = affected_slug
    AND NOT EXISTS (
      SELECT 1
      FROM public.skill_feedback
      WHERE skill_slug = affected_slug
    );

  IF TG_OP = 'UPDATE' AND OLD.skill_slug IS DISTINCT FROM NEW.skill_slug THEN
    affected_slug := OLD.skill_slug;

    INSERT INTO public.skill_stats (
      skill_slug,
      total_calls,
      success_calls,
      success_rate,
      avg_latency_ms,
      unique_agents,
      last_called_at,
      updated_at
    )
    SELECT
      skill_slug,
      COUNT(*)::INTEGER,
      COUNT(*) FILTER (WHERE success)::INTEGER,
      CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE ROUND((COUNT(*) FILTER (WHERE success))::NUMERIC / COUNT(*)::NUMERIC * 100, 2)
      END,
      ROUND(AVG(latency_ms), 0)::INTEGER,
      COUNT(DISTINCT agent_id)::INTEGER,
      MAX(created_at),
      NOW()
    FROM public.skill_feedback
    WHERE skill_slug = affected_slug
    GROUP BY skill_slug
    ON CONFLICT (skill_slug) DO UPDATE SET
      total_calls = EXCLUDED.total_calls,
      success_calls = EXCLUDED.success_calls,
      success_rate = EXCLUDED.success_rate,
      avg_latency_ms = EXCLUDED.avg_latency_ms,
      unique_agents = EXCLUDED.unique_agents,
      last_called_at = EXCLUDED.last_called_at,
      updated_at = NOW();

    DELETE FROM public.skill_stats
    WHERE skill_slug = affected_slug
      AND NOT EXISTS (
        SELECT 1
        FROM public.skill_feedback
        WHERE skill_slug = affected_slug
      );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_skill_stats_for_feedback() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS skill_feedback_refresh_stats ON public.skill_feedback;
CREATE TRIGGER skill_feedback_refresh_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.skill_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_skill_stats_for_feedback();
