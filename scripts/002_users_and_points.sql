-- ============================================================
-- 002: User profiles + skill points system
-- ============================================================

-- 1. Public profiles (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE,
  display_name TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  website     TEXT,
  twitter     TEXT,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 0, 9),
  invited_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own"  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own"  ON public.profiles FOR DELETE USING (auth.uid() = id);

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Skill Points (SP) ledger
CREATE TABLE IF NOT EXISTS public.point_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,               -- positive = earn, negative = spend
  event_type  TEXT NOT NULL,                  -- 'skill_published', 'skill_installed', 'invite_signup', etc.
  description TEXT,
  ref_id      TEXT,                           -- optional: skill slug, invite code, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_events_select_own" ON public.point_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "point_events_insert_own" ON public.point_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Computed total points view (for fast reads)
CREATE OR REPLACE VIEW public.user_points AS
  SELECT user_id, COALESCE(SUM(amount), 0)::INTEGER AS total_points
  FROM public.point_events
  GROUP BY user_id;

-- 5. Helper: get user level from points
CREATE OR REPLACE FUNCTION public.get_user_level(points INTEGER)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN points >= 100000 THEN '{"level":6,"title":"Legend","next":null}'::jsonb
    WHEN points >= 25000  THEN jsonb_build_object('level',5,'title','Sage','next',100000,'progress',((points-25000)::float/(100000-25000)*100)::int)
    WHEN points >= 8000   THEN jsonb_build_object('level',4,'title','Architect','next',25000,'progress',((points-8000)::float/(25000-8000)*100)::int)
    WHEN points >= 2000   THEN jsonb_build_object('level',3,'title','Artisan','next',8000,'progress',((points-2000)::float/(8000-2000)*100)::int)
    WHEN points >= 500    THEN jsonb_build_object('level',2,'title','Builder','next',2000,'progress',((points-500)::float/(2000-500)*100)::int)
    ELSE                       jsonb_build_object('level',1,'title','Explorer','next',500,'progress',(points::float/500*100)::int)
  END;
$$;

-- 6. Bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_slug TEXT NOT NULL REFERENCES public.skills(slug) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, skill_slug)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);
