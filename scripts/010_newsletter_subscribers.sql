-- ============================================================
-- 010: Newsletter subscribers for product growth loop
-- ============================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  cadence     TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('daily', 'weekly')),
  topics      TEXT[] NOT NULL DEFAULT '{}',
  source      TEXT NOT NULL DEFAULT 'website',
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_subscribers_insert_public" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_insert_public"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email = lower(email)
    AND char_length(email) <= 320
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  );

DROP POLICY IF EXISTS "newsletter_subscribers_no_public_select" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_no_public_select"
  ON public.newsletter_subscribers
  FOR SELECT
  TO anon, authenticated
  USING (false);

GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at
  ON public.newsletter_subscribers(created_at DESC);
