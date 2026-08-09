-- Verified install telemetry derived from idempotent agent outcome receipts.
-- A verified install is counted only when install_used=true and outcome=success.

ALTER TABLE public.agent_outcome_stats
  ADD COLUMN IF NOT EXISTS verified_installs INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agent_outcome_stats_verified_installs_nonnegative'
  ) THEN
    ALTER TABLE public.agent_outcome_stats
      ADD CONSTRAINT agent_outcome_stats_verified_installs_nonnegative
      CHECK (verified_installs >= 0);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS agent_outcome_stats_verified_installs_idx
  ON public.agent_outcome_stats (verified_installs DESC, total_outcomes DESC);

CREATE OR REPLACE FUNCTION private.refresh_verified_installs_for_skill(p_skill_slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verified_installs INTEGER;
BEGIN
  IF p_skill_slug IS NULL OR length(trim(p_skill_slug)) = 0 THEN
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_verified_installs
  FROM public.agent_outcomes
  WHERE skill_slug = p_skill_slug
    AND install_used = TRUE
    AND outcome = 'success';

  UPDATE public.agent_outcome_stats
  SET verified_installs = v_verified_installs,
      updated_at = NOW()
  WHERE skill_slug = p_skill_slug;

  IF NOT FOUND AND v_verified_installs > 0 THEN
    INSERT INTO public.agent_outcome_stats (skill_slug, verified_installs, updated_at)
    VALUES (p_skill_slug, v_verified_installs, NOW())
    ON CONFLICT (skill_slug) DO UPDATE SET
      verified_installs = EXCLUDED.verified_installs,
      updated_at = NOW();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_verified_installs_for_skill(TEXT)
  FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION private.refresh_verified_installs_for_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.refresh_verified_installs_for_skill(OLD.skill_slug);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.skill_slug IS DISTINCT FROM NEW.skill_slug THEN
    PERFORM private.refresh_verified_installs_for_skill(OLD.skill_slug);
  END IF;

  PERFORM private.refresh_verified_installs_for_skill(NEW.skill_slug);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_verified_installs_for_event()
  FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS zz_agent_outcomes_refresh_verified_installs
  ON public.agent_outcomes;
CREATE TRIGGER zz_agent_outcomes_refresh_verified_installs
  AFTER INSERT OR UPDATE OR DELETE ON public.agent_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION private.refresh_verified_installs_for_event();

UPDATE public.agent_outcome_stats AS stats
SET verified_installs = (
      SELECT COUNT(*)::INTEGER
      FROM public.agent_outcomes AS outcomes
