-- ============================================================
-- 003: Activity feed + agent feedback loop
-- ============================================================

-- Link skills to an owning profile when the author has signed in.
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skills_author_user_id ON public.skills(author_user_id);

-- Public activity feed. Raw writes are server-side only; public clients can read.
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,
  skill_id    UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  actor_name  TEXT NOT NULL,
  actor_type  TEXT NOT NULL DEFAULT 'human' CHECK (actor_type IN ('human', 'agent', 'system')),
  description TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_feed_select_public" ON public.activity_feed;
CREATE POLICY "activity_feed_select_public"
  ON public.activity_feed
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_actor_type ON public.activity_feed(actor_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_skill_id ON public.activity_feed(skill_id);

-- Raw agent feedback. This contains per-agent identifiers, so do not expose rows publicly.
CREATE TABLE IF NOT EXISTS public.skill_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_slug    TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  agent_id      TEXT NOT NULL,
  success       BOOLEAN NOT NULL,
  latency_ms    INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_message TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_feedback ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_skill_feedback_skill_slug ON public.skill_feedback(skill_slug);
CREATE INDEX IF NOT EXISTS idx_skill_feedback_created_at ON public.skill_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_feedback_agent_id ON public.skill_feedback(agent_id);

-- Aggregate-only public stats. Raw skill_feedback rows remain protected by RLS.
CREATE OR REPLACE VIEW public.skill_stats AS
SELECT
  skill_slug,
  COUNT(*)::INTEGER AS total_calls,
  COUNT(*) FILTER (WHERE success)::INTEGER AS success_calls,
  CASE
    WHEN COUNT(*) = 0 THEN NULL
    ELSE ROUND((COUNT(*) FILTER (WHERE success))::NUMERIC / COUNT(*)::NUMERIC * 100, 2)
  END AS success_rate,
  ROUND(AVG(latency_ms), 0)::INTEGER AS avg_latency_ms,
  COUNT(DISTINCT agent_id)::INTEGER AS unique_agents,
  MAX(created_at) AS last_called_at
FROM public.skill_feedback
GROUP BY skill_slug;

GRANT SELECT ON public.skill_stats TO anon, authenticated;
