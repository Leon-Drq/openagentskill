-- Create skills table for storing submitted agent skills
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  tagline TEXT,
  
  -- Author information
  author_name TEXT NOT NULL,
  author_email TEXT,
  author_url TEXT,
  
  -- GitHub information
  repository TEXT NOT NULL,
  github_repo TEXT NOT NULL, -- owner/repo format
  github_stars INTEGER DEFAULT 0,
  github_forks INTEGER DEFAULT 0,
  
  -- Categorization
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  frameworks TEXT[] DEFAULT '{}',
  
  -- Technical details
  version TEXT NOT NULL,
  license TEXT NOT NULL,
  install_command TEXT,
  npm_package TEXT,
  
  -- Status and metadata
  verified BOOLEAN DEFAULT FALSE,
  submission_source TEXT DEFAULT 'web', -- 'web', 'api', 'agent'
  submitted_by_agent TEXT,
  
  -- AI Review results
  ai_review_score JSONB, -- {security, quality, usefulness, compliance, total}
  ai_review_approved BOOLEAN DEFAULT FALSE,
  ai_review_issues TEXT[],
  ai_review_suggestions TEXT[],
  
  -- Statistics
  downloads INTEGER DEFAULT 0,
  used_by INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Public read access is limited to AI-approved skills.
CREATE POLICY "skills_select_approved_public" ON public.skills
  FOR SELECT
  TO anon, authenticated
  USING (ai_review_approved = true);

-- Writes are intentionally handled by server-side API routes with service credentials.
-- Do not grant public INSERT/UPDATE policies here; submissions must pass validation/review.

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_slug ON public.skills(slug);
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_github_repo ON public.skills(github_repo);
CREATE INDEX IF NOT EXISTS idx_skills_verified ON public.skills(verified);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON public.skills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_downloads ON public.skills(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON public.skills USING GIN(tags);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create submission history table
CREATE TABLE IF NOT EXISTS public.skill_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  github_repo TEXT NOT NULL,
  submission_source TEXT NOT NULL,
  submitted_by_agent TEXT,
  ai_review_result JSONB,
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.skill_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_submissions_skill_id ON public.skill_submissions(skill_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.skill_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.skill_submissions(created_at DESC);
