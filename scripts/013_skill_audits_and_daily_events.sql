-- ============================================================
-- 013: Skill audit records + daily engagement aggregates
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS private;

-- Public read model for explainable skill audits. Writes are server-side only.
CREATE TABLE IF NOT EXISTS public.skill_audits (
  skill_slug         TEXT PRIMARY KEY REFERENCES public.skills(slug) ON DELETE CASCADE,
  audit_score        INTEGER NOT NULL DEFAULT 0 CHECK (audit_score BETWEEN 0 AND 100),
  risk_level         TEXT NOT NULL DEFAULT 'needs_review'
    CHECK (risk_level IN ('safe_to_try', 'needs_review', 'risky')),
  quality_score      INTEGER NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  trust_score        INTEGER NOT NULL DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  maintenance_score  INTEGER NOT NULL DEFAULT 0 CHECK (maintenance_score BETWEEN 0 AND 100),
  security_score     INTEGER NOT NULL DEFAULT 0 CHECK (security_score BETWEEN 0 AND 100),
  install_score      INTEGER NOT NULL DEFAULT 0 CHECK (install_score BETWEEN 0 AND 100),
  checks             JSONB NOT NULL DEFAULT '[]'::jsonb,
  signals            JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings           JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_audits_select_public" ON public.skill_audits;
CREATE POLICY "skill_audits_select_public"
  ON public.skill_audits
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.skill_audits TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_skill_audits_score
  ON public.skill_audits(audit_score DESC);
CREATE INDEX IF NOT EXISTS idx_skill_audits_risk_score
  ON public.skill_audits(risk_level, audit_score DESC);
CREATE INDEX IF NOT EXISTS idx_skill_audits_updated_at
  ON public.skill_audits(updated_at DESC);

DROP TRIGGER IF EXISTS update_skill_audits_updated_at ON public.skill_audits;
CREATE TRIGGER update_skill_audits_updated_at
  BEFORE UPDATE ON public.skill_audits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Public daily aggregate for trend pages. Raw skill_events remains private.
CREATE TABLE IF NOT EXISTS public.skill_events_daily (
  skill_slug       TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  event_date       DATE NOT NULL,
  total_events     INTEGER NOT NULL DEFAULT 0,
  views            INTEGER NOT NULL DEFAULT 0,
  install_copies   INTEGER NOT NULL DEFAULT 0,
  saves            INTEGER NOT NULL DEFAULT 0,
  compares         INTEGER NOT NULL DEFAULT 0,
  outbound_clicks  INTEGER NOT NULL DEFAULT 0,
  claim_starts     INTEGER NOT NULL DEFAULT 0,
  claim_submits    INTEGER NOT NULL DEFAULT 0,
  first_event_at   TIMESTAMPTZ,
  last_event_at    TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (skill_slug, event_date)
);

ALTER TABLE public.skill_events_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_events_daily_select_public" ON public.skill_events_daily;
CREATE POLICY "skill_events_daily_select_public"
  ON public.skill_events_daily
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.skill_events_daily TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_skill_events_daily_date
  ON public.skill_events_daily(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_skill_events_daily_install_copies
  ON public.skill_events_daily(event_date DESC, install_copies DESC);
CREATE INDEX IF NOT EXISTS idx_skill_events_daily_views
  ON public.skill_events_daily(event_date DESC, views DESC);
CREATE INDEX IF NOT EXISTS idx_skill_events_daily_last_event
  ON public.skill_events_daily(last_event_at DESC);

CREATE OR REPLACE FUNCTION private.refresh_skill_events_daily_for_date(
  p_skill_slug TEXT,
  p_event_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.skill_events_daily (
    skill_slug,
    event_date,
    total_events,
    views,
    install_copies,
    saves,
    compares,
    outbound_clicks,
    claim_starts,
    claim_submits,
    first_event_at,
    last_event_at,
    updated_at
  )
  SELECT
    skill_slug,
    p_event_date,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'view')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'install_copy')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'save')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'compare')::INTEGER,
    COUNT(*) FILTER (WHERE event_type IN ('outbound_github', 'outbound_docs'))::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'claim_start')::INTEGER,
    COUNT(*) FILTER (WHERE event_type = 'claim_submit')::INTEGER,
    MIN(created_at),
    MAX(created_at),
    NOW()
  FROM public.skill_events
  WHERE skill_slug = p_skill_slug
    AND created_at >= p_event_date::timestamptz
    AND created_at < (p_event_date + 1)::timestamptz
  GROUP BY skill_slug
  ON CONFLICT (skill_slug, event_date) DO UPDATE SET
    total_events = EXCLUDED.total_events,
    views = EXCLUDED.views,
    install_copies = EXCLUDED.install_copies,
    saves = EXCLUDED.saves,
    compares = EXCLUDED.compares,
    outbound_clicks = EXCLUDED.outbound_clicks,
    claim_starts = EXCLUDED.claim_starts,
    claim_submits = EXCLUDED.claim_submits,
    first_event_at = EXCLUDED.first_event_at,
    last_event_at = EXCLUDED.last_event_at,
    updated_at = NOW();

  DELETE FROM public.skill_events_daily
  WHERE skill_slug = p_skill_slug
    AND event_date = p_event_date
    AND NOT EXISTS (
      SELECT 1
      FROM public.skill_events
      WHERE skill_slug = p_skill_slug
        AND created_at >= p_event_date::timestamptz
        AND created_at < (p_event_date + 1)::timestamptz
    );
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_skill_events_daily_for_date(TEXT, DATE)
  FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION private.refresh_skill_events_daily_for_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM private.refresh_skill_events_daily_for_date(OLD.skill_slug, OLD.created_at::date);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM private.refresh_skill_events_daily_for_date(NEW.skill_slug, NEW.created_at::date);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_skill_events_daily_for_event()
  FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS skill_events_refresh_daily_stats ON public.skill_events;
CREATE TRIGGER skill_events_refresh_daily_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.skill_events
  FOR EACH ROW
  EXECUTE FUNCTION private.refresh_skill_events_daily_for_event();

-- Backfill current daily aggregates from existing raw events.
INSERT INTO public.skill_events_daily (
  skill_slug,
  event_date,
  total_events,
  views,
  install_copies,
  saves,
  compares,
  outbound_clicks,
  claim_starts,
  claim_submits,
  first_event_at,
  last_event_at,
  updated_at
)
SELECT
  skill_slug,
  created_at::date,
  COUNT(*)::INTEGER,
  COUNT(*) FILTER (WHERE event_type = 'view')::INTEGER,
  COUNT(*) FILTER (WHERE event_type = 'install_copy')::INTEGER,
  COUNT(*) FILTER (WHERE event_type = 'save')::INTEGER,
  COUNT(*) FILTER (WHERE event_type = 'compare')::INTEGER,
  COUNT(*) FILTER (WHERE event_type IN ('outbound_github', 'outbound_docs'))::INTEGER,
  COUNT(*) FILTER (WHERE event_type = 'claim_start')::INTEGER,
  COUNT(*) FILTER (WHERE event_type = 'claim_submit')::INTEGER,
  MIN(created_at),
  MAX(created_at),
  NOW()
FROM public.skill_events
GROUP BY skill_slug, created_at::date
ON CONFLICT (skill_slug, event_date) DO UPDATE SET
  total_events = EXCLUDED.total_events,
  views = EXCLUDED.views,
  install_copies = EXCLUDED.install_copies,
  saves = EXCLUDED.saves,
  compares = EXCLUDED.compares,
  outbound_clicks = EXCLUDED.outbound_clicks,
  claim_starts = EXCLUDED.claim_starts,
  claim_submits = EXCLUDED.claim_submits,
  first_event_at = EXCLUDED.first_event_at,
  last_event_at = EXCLUDED.last_event_at,
  updated_at = NOW();
