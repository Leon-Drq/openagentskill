-- Transaction assertions detect a concurrent change between classification
-- and a D1 batch. Successful batches remove their assertion rows immediately.
CREATE TABLE d1_write_guards(id TEXT PRIMARY KEY NOT NULL,valid INTEGER NOT NULL CHECK(valid=1)) STRICT;

CREATE TRIGGER skills_static_state_insert AFTER INSERT ON skills
WHEN json_extract(NEW.ai_review_score,'$.method')='static' AND json_extract(NEW.ai_review_score,'$.policy_version')='risk-first-v1'
 AND json_extract(NEW.ai_review_score,'$.decision')='approved' AND (NEW.ai_review_approved<>0 OR NEW.listing_status<>'static_checked')
BEGIN UPDATE skills SET ai_review_approved=0,listing_status='static_checked' WHERE id=NEW.id; END;
CREATE TRIGGER skills_static_state_update AFTER UPDATE ON skills
WHEN json_extract(NEW.ai_review_score,'$.method')='static' AND json_extract(NEW.ai_review_score,'$.policy_version')='risk-first-v1'
 AND json_extract(NEW.ai_review_score,'$.decision')='approved' AND (NEW.ai_review_approved<>0 OR NEW.listing_status<>'static_checked')
BEGIN UPDATE skills SET ai_review_approved=0,listing_status='static_checked' WHERE id=NEW.id; END;

-- Preserve the source INSERT guard, including historical duplicate listings.
CREATE TRIGGER skills_guard_public_source_insert BEFORE INSERT ON skills
WHEN NEW.github_repo IS NOT NULL AND NEW.source_path IS NOT NULL
 AND (NEW.ai_review_approved=1 OR NEW.listing_status IN ('owner_published','static_checked'))
 AND NOT EXISTS(SELECT 1 FROM skills s WHERE s.slug=NEW.slug AND lower(s.github_repo)=lower(NEW.github_repo) AND s.source_path=NEW.source_path
  AND (s.ai_review_approved=1 OR s.listing_status IN ('owner_published','static_checked')))
 AND EXISTS(SELECT 1 FROM skills s WHERE s.slug<>NEW.slug AND lower(s.github_repo)=lower(NEW.github_repo) AND s.source_path=NEW.source_path
  AND (s.ai_review_approved=1 OR s.listing_status IN ('owner_published','static_checked')))
BEGIN SELECT raise(ABORT,'skills_public_source_identity_key'); END;

CREATE INDEX candidate_claim_available ON skill_candidates(status,next_attempt_at,lease_expires_at,github_stars DESC,discovered_at);
CREATE INDEX indexer_runs_recent ON indexer_runs(started_at DESC);
