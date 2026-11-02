-- Eligibility uses the same application rule as the PostgreSQL directory.
-- Membership changes must be batched with catalog writes. If identity fields
-- change without that adapter, remove membership so stale eligibility fails shut.
CREATE TABLE directory_skill_ids (
  id TEXT PRIMARY KEY NOT NULL REFERENCES skills(id) ON DELETE CASCADE
) STRICT;
CREATE TRIGGER directory_identity_changed AFTER UPDATE OF name,github_repo,category,tags,frameworks ON skills
BEGIN DELETE FROM directory_skill_ids WHERE id = NEW.id; END;

CREATE INDEX skills_public_quality ON skills(quality_score DESC,slug ASC)
  WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked');
CREATE INDEX skills_public_stars ON skills(github_stars DESC,slug ASC)
  WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked');
CREATE INDEX skills_public_new ON skills(created_at DESC,slug ASC)
  WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked');
CREATE INDEX skills_public_fresh ON skills(github_last_pushed_at DESC,slug ASC)
  WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked');
CREATE INDEX skills_public_downloads ON skills(site_downloads DESC,slug ASC)
  WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked');
CREATE INDEX skills_public_name ON skills(lower(name),slug)
  WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked');
CREATE INDEX skills_public_repository ON skills(lower(github_repo),source_path,created_at,id)
  WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked');
CREATE INDEX skills_taxonomy ON skills(primary_category,quality_score DESC,slug);
CREATE INDEX skills_category ON skills(category,quality_score DESC,slug);
CREATE INDEX skill_claims_owner ON skill_claims(user_id,status,created_at);
CREATE INDEX skill_claims_public ON skill_claims(skill_slug,status,created_at);
CREATE INDEX skill_versions_latest ON skill_versions(skill_slug,detected_at DESC);
CREATE INDEX skill_events_daily_recent ON skill_events_daily(event_date DESC,skill_slug);
CREATE INDEX skill_votes_slug ON skill_votes(skill_slug,vote);
CREATE INDEX showcase_votes_slug ON showcase_votes(case_slug,vote);
CREATE INDEX provider_votes_slug ON provider_skill_engagement(skill_slug,vote);
CREATE INDEX activity_feed_recent ON activity_feed(created_at DESC);
CREATE INDEX blog_posts_recent ON blog_posts(published_at DESC);
CREATE INDEX ranking_snapshots_recent ON ranking_snapshots(ranking_slug,generated_at DESC);
CREATE INDEX point_events_owner ON point_events(user_id,created_at DESC);

CREATE VIEW skill_directory_entries AS
SELECT s.* FROM skills s JOIN directory_skill_ids directory ON directory.id = s.id
WHERE (s.ai_review_approved = 1 OR s.listing_status IN ('owner_published','static_checked'))
AND NOT EXISTS (
  SELECT 1 FROM skills older JOIN directory_skill_ids eligible ON eligible.id = older.id
  WHERE (older.ai_review_approved = 1 OR older.listing_status IN ('owner_published','static_checked'))
    AND lower(older.github_repo) = lower(s.github_repo) AND older.source_path = s.source_path
    AND (older.created_at,older.id) < (s.created_at,s.id)
);
CREATE VIEW user_points AS SELECT user_id,coalesce(sum(amount),0) AS total_points FROM point_events GROUP BY user_id;

-- FTS is private. Every search additionally applies publication authorization.
CREATE VIRTUAL TABLE skills_fts USING fts5(slug,name,github_repo,description,tagline,category,long_description,repository,
  content='skills',content_rowid='rowid',tokenize='unicode61 remove_diacritics 0');
CREATE TRIGGER skills_fts_insert AFTER INSERT ON skills BEGIN
  INSERT INTO skills_fts(rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
  VALUES (NEW.rowid,NEW.slug,NEW.name,NEW.github_repo,NEW.description,NEW.tagline,NEW.category,NEW.long_description,NEW.repository);
END;
CREATE TRIGGER skills_fts_delete AFTER DELETE ON skills BEGIN
  INSERT INTO skills_fts(skills_fts,rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
  VALUES ('delete',OLD.rowid,OLD.slug,OLD.name,OLD.github_repo,OLD.description,OLD.tagline,OLD.category,OLD.long_description,OLD.repository);
END;
CREATE TRIGGER skills_fts_update AFTER UPDATE ON skills BEGIN
  INSERT INTO skills_fts(skills_fts,rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
  VALUES ('delete',OLD.rowid,OLD.slug,OLD.name,OLD.github_repo,OLD.description,OLD.tagline,OLD.category,OLD.long_description,OLD.repository);
  INSERT INTO skills_fts(rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
  VALUES (NEW.rowid,NEW.slug,NEW.name,NEW.github_repo,NEW.description,NEW.tagline,NEW.category,NEW.long_description,NEW.repository);
END;
