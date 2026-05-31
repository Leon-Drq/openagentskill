-- ============================================================
-- 012: Harden skill events RLS and move privileged trigger code
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;

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

DROP FUNCTION IF EXISTS public.refresh_skill_event_stats_for_event();
DROP FUNCTION IF EXISTS public.record_skill_event(text, text, text, text, text, jsonb);
