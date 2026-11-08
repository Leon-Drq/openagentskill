-- Existing partial unique indexes exclude static_checked rows and cannot serve
-- all read policies. These non-unique indexes preserve publication semantics.
CREATE INDEX skills_lookup_repository ON skills(repository);
CREATE INDEX skills_lookup_github_repo ON skills(github_repo);
CREATE INDEX skills_lookup_source_hash ON skills(source_content_hash);
CREATE INDEX candidates_lookup_source_hash ON skill_candidates(source_content_hash,created_at);
