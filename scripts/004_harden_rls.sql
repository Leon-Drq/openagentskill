-- ============================================================
-- 004: RLS hardening for server-mediated writes
-- ============================================================

-- Skills are submitted through Next.js API routes after validation/review.
-- Direct browser writes would bypass those checks, so keep public access read-only.
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_select_all" ON public.skills;
DROP POLICY IF EXISTS "skills_insert_public" ON public.skills;
DROP POLICY IF EXISTS "skills_insert_service" ON public.skills;
DROP POLICY IF EXISTS "skills_update_verified" ON public.skills;
DROP POLICY IF EXISTS "skills_select_approved_public" ON public.skills;

CREATE POLICY "skills_select_approved_public"
  ON public.skills
  FOR SELECT
  TO anon, authenticated
  USING (ai_review_approved = true);

-- Submission history should be private to server/admin paths.
ALTER TABLE public.skill_submissions ENABLE ROW LEVEL SECURITY;

-- Activity rows are public to read but only server routes may write.
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

UPDATE public.activity_feed
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.activity_feed
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DROP POLICY IF EXISTS "activity_insert_public" ON public.activity_feed;
DROP POLICY IF EXISTS "activity_insert_service" ON public.activity_feed;
DROP POLICY IF EXISTS "activity_select_all" ON public.activity_feed;
DROP POLICY IF EXISTS "activity_feed_select_public" ON public.activity_feed;

CREATE POLICY "activity_feed_select_public"
  ON public.activity_feed
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Feedback rows can include agent identifiers and errors. Keep raw rows private;
-- expose only the aggregate skill_stats view.
ALTER TABLE public.skill_feedback ENABLE ROW LEVEL SECURITY;

UPDATE public.skill_feedback
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;

ALTER TABLE public.skill_feedback
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

DROP POLICY IF EXISTS "skill_feedback_insert_all" ON public.skill_feedback;
DROP POLICY IF EXISTS "skill_feedback_select_all" ON public.skill_feedback;

GRANT SELECT ON public.skill_stats TO anon, authenticated;

-- Point events are a server-awarded ledger. Users can read their own ledger,
-- but must not be able to mint points directly.
ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_events_insert_own" ON public.point_events;
DROP POLICY IF EXISTS "point_events_select_own" ON public.point_events;

CREATE POLICY "point_events_select_own"
  ON public.point_events
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Recreate user_points as a security-invoker view so profile/points reads
-- continue to respect point_events RLS.
CREATE OR REPLACE VIEW public.user_points
WITH (security_invoker = true) AS
  SELECT user_id, COALESCE(SUM(amount), 0)::INTEGER AS total_points
  FROM public.point_events
  GROUP BY user_id;

REVOKE SELECT ON public.user_points FROM anon, public;
GRANT SELECT ON public.user_points TO authenticated;
