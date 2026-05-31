-- ============================================================
-- 011: Skill owner claims + engagement event loop
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;

-- Skill owner claims give authors a path to identify and improve their pages.
CREATE TABLE IF NOT EXISTS public.skill_claims (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_slug          TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_username     TEXT NOT NULL,
  repo_url            TEXT,
  verification_method TEXT NOT NULL DEFAULT 'github_profile'
    CHECK (verification_method IN ('github_profile', 'repository_issue', 'website_link', 'manual')),
  evidence_url        TEXT,
  evidence_note       TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_note       TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (skill_slug, user_id)
);

ALTER TABLE public.skill_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_claims_select_public_approved_or_own" ON public.skill_claims;
CREATE POLICY "skill_claims_select_public_approved_or_own"
  ON public.skill_claims
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "skill_claims_insert_own_pending" ON public.skill_claims;
CREATE POLICY "skill_claims_insert_own_pending"
  ON public.skill_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'pending'
    AND github_username ~* '^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$'
  );

DROP POLICY IF EXISTS "skill_claims_update_own_pending" ON public.skill_claims;
CREATE POLICY "skill_claims_update_own_pending"
  ON public.skill_claims
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id AND status = 'pending')
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'pending');

GRANT SELECT ON public.skill_claims TO anon, authenticated;
GRANT INSERT, UPDATE ON public.skill_claims TO authenticated;

CREATE INDEX IF NOT EXISTS idx_skill_claims_skill_slug
  ON public.skill_claims(skill_slug);
CREATE INDEX IF NOT EXISTS idx_skill_claims_user_id
  ON public.skill_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_claims_status_created_at
  ON public.skill_claims(status, created_at DESC);

DROP TRIGGER IF EXISTS update_skill_claims_updated_at ON public.skill_claims;
CREATE TRIGGER update_skill_claims_updated_at
  BEFORE UPDATE ON public.skill_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Raw engagement events stay private. Aggregates are public and can feed ranking/report pages.
CREATE TABLE IF NOT EXISTS public.skill_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_slug  TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (
    event_type IN (
      'view',
      'install_copy',
      'save',
      'compare',
      'outbound_github',
      'outbound_docs',
      'claim_start',
      'claim_submit'
    )
  ),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id  TEXT,
  path        TEXT,
  referrer    TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_events_no_public_access" ON public.skill_events;
DROP POLICY IF EXISTS "skill_events_select_private" ON public.skill_events;
CREATE POLICY "skill_events_select_private"
  ON public.skill_events
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "skill_events_insert_public_events" ON public.skill_events;
CREATE POLICY "skill_events_insert_public_events"
  ON public.skill_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IN (
      'view',
      'install_copy',
      'save',
      'compare',
      'outbound_github',
      'outbound_docs',
      'claim_start',
      'claim_submit'
    )
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1
      FROM public.skills
      WHERE public.skills.slug = skill_events.skill_slug
        AND public.skills.ai_review_approved = true
    )
  );

GRANT INSERT ON public.skill_events TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_skill_events_skill_slug_created_at
  ON public.skill_events(skill_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_events_event_type_created_at
  ON public.skill_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_events_created_at
  ON public.skill_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.skill_event_stats (
  skill_slug       TEXT PRIMARY KEY REFERENCES public.skills(slug) ON DELETE CASCADE,
  total_events     INTEGER NOT NULL DEFAULT 0,
  views            INTEGER NOT NULL DEFAULT 0,
  install_copies   INTEGER NOT NULL DEFAULT 0,
  saves            INTEGER NOT NULL DEFAULT 0,
  compares         INTEGER NOT NULL DEFAULT 0,
  outbound_clicks  INTEGER NOT NULL DEFAULT 0,
  claim_starts     INTEGER NOT NULL DEFAULT 0,
  claim_submits    INTEGER NOT NULL DEFAULT 0,
  last_event_at    TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_event_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_event_stats_select_public" ON public.skill_event_stats;
CREATE POLICY "skill_event_stats_select_public"
  ON public.skill_event_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.skill_event_stats TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_skill_event_stats_views
  ON public.skill_event_stats(views DESC);
CREATE INDEX IF NOT EXISTS idx_skill_event_stats_install_copies
  ON public.skill_event_stats(install_copies DESC);

CREATE OR REPLACE FUNCTION private.refresh_skill_event_stats_for_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected_slug TEXT;
BEGIN
  affected_slug := COALESCE(NEW.skill_slug, OLD.skill_slug);

  INSERT INTO public.skill_event_stats (
    skill_slug,
    total_events,
    views,
    install_copies,
    saves,
    compares,
    outbound_clicks,
    claim_starts,
    claim_submits,
    last_event_at,
    updated_at
  )
  SELECT
    skill_slug,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'view')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'install_copy')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'save')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'compare')::INTEGER,
    COUNT(*) FILTER (WHERE event_type IN ('outbound_github', 'outbound_docs'))::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'claim_start')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'claim_submit')::INTEGER,
    MAX(created_at),
    NOW()
  FROM public.skill_events
  WHERE skill_slug = affected_slug
  GROUP BY skill_slug
  ON CONFLICT (skill_slug) DO UPDATE SET
    total_events = EXCLUDED.total_events,
    views = EXCLUDED.views,
    install_copies = EXCLUDED.install_copies,
    saves = EXCLUDED.saves,
    compares = EXCLUDED.compares,
    outbound_clicks = EXCLUDED.outbound_clicks,
    claim_starts = EXCLUDED.claim_starts,
    claim_submits = EXCLUDED.claim_submits,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = NOW();

  DELETE FROM public.skill_event_stats
  WHERE skill_slug = affected_slug
    AND NOT EXISTS (
      SELECT 1
      FROM public.skill_events
      WHERE skill_slug = affected_slug
    );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_skill_event_stats_for_event() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS skill_events_refresh_stats ON public.skill_events;
CREATE TRIGGER skill_events_refresh_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.skill_events
  FOR EACH ROW
  EXECUTE FUNCTION private.refresh_skill_event_stats_for_event();
