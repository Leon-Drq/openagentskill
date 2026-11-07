-- Names need substring candidates, not a scan of every public Skill. Keep the
-- original LIKE predicate in the read adapter as the final authority.
CREATE VIRTUAL TABLE skills_name_fts USING fts5(name,
  content='skills',content_rowid='rowid',tokenize='trigram');
CREATE TRIGGER skills_name_fts_insert AFTER INSERT ON skills BEGIN
  INSERT INTO skills_name_fts(rowid,name) VALUES (NEW.rowid,NEW.name);
END;
CREATE TRIGGER skills_name_fts_delete AFTER DELETE ON skills BEGIN
  INSERT INTO skills_name_fts(skills_name_fts,rowid,name) VALUES ('delete',OLD.rowid,OLD.name);
END;
CREATE TRIGGER skills_name_fts_update AFTER UPDATE OF name ON skills
WHEN OLD.name IS NOT NEW.name BEGIN
  INSERT INTO skills_name_fts(skills_name_fts,rowid,name) VALUES ('delete',OLD.rowid,OLD.name);
  INSERT INTO skills_name_fts(rowid,name) VALUES (NEW.rowid,NEW.name);
END;
INSERT INTO skills_name_fts(skills_name_fts) VALUES ('rebuild');

-- Download counters, votes, scores and unchanged ingestion upserts must not
-- delete and reinsert all eight text fields into the full-text index.
DROP TRIGGER skills_fts_update;
CREATE TRIGGER skills_fts_update
AFTER UPDATE OF slug,name,github_repo,description,tagline,category,long_description,repository ON skills
WHEN OLD.slug IS NOT NEW.slug OR OLD.name IS NOT NEW.name
  OR OLD.github_repo IS NOT NEW.github_repo OR OLD.description IS NOT NEW.description
  OR OLD.tagline IS NOT NEW.tagline OR OLD.category IS NOT NEW.category
  OR OLD.long_description IS NOT NEW.long_description OR OLD.repository IS NOT NEW.repository
BEGIN
  INSERT INTO skills_fts(skills_fts,rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
  VALUES ('delete',OLD.rowid,OLD.slug,OLD.name,OLD.github_repo,OLD.description,OLD.tagline,OLD.category,OLD.long_description,OLD.repository);
  INSERT INTO skills_fts(rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
  VALUES (NEW.rowid,NEW.slug,NEW.name,NEW.github_repo,NEW.description,NEW.tagline,NEW.category,NEW.long_description,NEW.repository);
END;
