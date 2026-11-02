-- Business data only. No public SQL endpoint or implicit authorization.

-- Application writes remain gated until PostgreSQL RPCs/triggers are ported.

-- skills.search_document is a preserved source vector; D1 search uses FTS5.

CREATE TABLE "activity_feed" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "event_type" TEXT NOT NULL,
  "skill_id" TEXT,
  "actor_name" TEXT NOT NULL,
  "actor_type" TEXT NOT NULL DEFAULT 'human',
  "description" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "agent_outcome_stats" (
  "skill_slug" TEXT NOT NULL,
  "total_outcomes" INTEGER NOT NULL DEFAULT 0,
  "successful_outcomes" INTEGER NOT NULL DEFAULT 0,
  "failed_outcomes" INTEGER NOT NULL DEFAULT 0,
  "not_relevant_outcomes" INTEGER NOT NULL DEFAULT 0,
  "risk_blocked_outcomes" INTEGER NOT NULL DEFAULT 0,
  "setup_required_outcomes" INTEGER NOT NULL DEFAULT 0,
  "install_attempts" INTEGER NOT NULL DEFAULT 0,
  "success_rate" REAL,
  "last_outcome_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "install_success_rate" REAL,
  "avg_output_quality" REAL,
  "avg_time_to_useful_ms" REAL,
  "production_outcomes" INTEGER NOT NULL DEFAULT 0,
  "human_review_required_outcomes" INTEGER NOT NULL DEFAULT 0,
  "low_quality_outcomes" INTEGER NOT NULL DEFAULT 0,
  "recent_outcomes_30d" INTEGER NOT NULL DEFAULT 0,
  "recent_successful_outcomes_30d" INTEGER NOT NULL DEFAULT 0,
  "recent_failed_outcomes_30d" INTEGER NOT NULL DEFAULT 0,
  "recent_success_rate" REAL,
  "recent_failure_rate" REAL,
  "unique_agents" INTEGER NOT NULL DEFAULT 0,
  "agent_proven_score" REAL,
  "last_success_at" TEXT,
  "last_failure_at" TEXT,
  "verified_installs" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("skill_slug"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK (verified_installs >= 0)
) STRICT;

CREATE TABLE "agent_outcomes" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "event_id" TEXT NOT NULL,
  "skill_slug" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "agent" TEXT NOT NULL DEFAULT 'auto',
  "outcome" TEXT NOT NULL,
  "install_used" INTEGER NOT NULL DEFAULT 0 CHECK ("install_used" IN (0,1)),
  "risk_blocked" INTEGER NOT NULL DEFAULT 0 CHECK ("risk_blocked" IN (0,1)),
  "setup_required" INTEGER NOT NULL DEFAULT 0 CHECK ("setup_required" IN (0,1)),
  "time_to_useful_ms" INTEGER,
  "notes" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (outcome IN ('success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required')),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK (time_to_useful_ms IS NULL OR time_to_useful_ms >= 0)
) STRICT;

CREATE UNIQUE INDEX "agent_outcomes_event_id_unique_idx" ON "agent_outcomes" ("event_id");

CREATE TABLE "blog_posts" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_id" TEXT,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "published_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  UNIQUE ("slug")
) STRICT;

CREATE TABLE "bookmarks" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "skill_slug" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("user_id") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  UNIQUE ("user_id","skill_slug")
) STRICT;

CREATE TABLE "indexer_runs" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "mode" TEXT NOT NULL DEFAULT 'bulk',
  "status" TEXT NOT NULL DEFAULT 'completed',
  "filter_mode" TEXT NOT NULL DEFAULT 'skills-only',
  "started_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "completed_at" TEXT,
  "target_new" INTEGER NOT NULL DEFAULT 0,
  "min_stars" INTEGER NOT NULL DEFAULT 0,
  "max_search_requests" INTEGER NOT NULL DEFAULT 0,
  "search_requests" INTEGER NOT NULL DEFAULT 0,
  "candidates_found" INTEGER NOT NULL DEFAULT 0,
  "skipped_existing" INTEGER NOT NULL DEFAULT 0,
  "skipped_mcp" INTEGER NOT NULL DEFAULT 0,
  "skipped_low_relevance" INTEGER NOT NULL DEFAULT 0,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "errors" INTEGER NOT NULL DEFAULT 0,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id")
) STRICT;

CREATE TABLE "newsletter_subscribers" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "email" TEXT NOT NULL,
  "cadence" TEXT NOT NULL DEFAULT 'weekly',
  "topics" TEXT NOT NULL DEFAULT '[]' CHECK ("topics" IS NULL OR json_valid("topics")) CHECK ("topics" IS NULL OR json_type("topics") = 'array'),
  "source" TEXT NOT NULL DEFAULT 'website',
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (cadence IN ('daily', 'weekly')),
  UNIQUE ("email"),
  PRIMARY KEY ("id")
) STRICT;

CREATE TABLE "owner_skill_publications" (
  "request_id" TEXT NOT NULL,
  "skill_slug" TEXT NOT NULL,
  "github_repo" TEXT NOT NULL,
  "source_path" TEXT NOT NULL,
  "source_commit_sha" TEXT NOT NULL,
  "source_content_hash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actor" TEXT NOT NULL DEFAULT 'site-owner-token',
  "previous_review" TEXT NOT NULL DEFAULT '{}' CHECK ("previous_review" IS NULL OR json_valid("previous_review")),
  "source_scan" TEXT NOT NULL CHECK ("source_scan" IS NULL OR json_valid("source_scan")),
  "result" TEXT NOT NULL CHECK ("result" IS NULL OR json_valid("result")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("request_id"),
  CHECK (length(trim(reason)) >= 10 AND length(trim(reason)) <= 2000)
) STRICT;

CREATE TABLE "point_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "user_id" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "event_type" TEXT NOT NULL,
  "description" TEXT,
  "ref_id" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("user_id") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "profiles" (
  "id" TEXT NOT NULL,
  "username" TEXT,
  "display_name" TEXT,
  "bio" TEXT,
  "avatar_url" TEXT,
  "website" TEXT,
  "twitter" TEXT,
  "invite_code" TEXT DEFAULT (lower(hex(randomblob(4)))),
  "invited_by" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "github_username" TEXT,
  "x_username" TEXT,
  "github_user_id" INTEGER,
  "github_verified_at" TEXT,
  "x_user_id" TEXT,
  "x_verified_at" TEXT,
  CHECK (github_username IS NULL OR (length(github_username) BETWEEN 1 AND 39 AND lower(github_username) NOT GLOB '*[^a-z0-9-]*' AND substr(lower(github_username),1,1) GLOB '[a-z0-9]' AND substr(lower(github_username),-1,1) GLOB '[a-z0-9]')),
  FOREIGN KEY ("id") REFERENCES "account_identities" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  UNIQUE ("invite_code"),
  FOREIGN KEY ("invited_by") REFERENCES "profiles" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  PRIMARY KEY ("id"),
  UNIQUE ("username"),
  CHECK (x_username IS NULL OR (length(x_username) BETWEEN 1 AND 15 AND lower(x_username) NOT GLOB '*[^a-z0-9_]*'))
) STRICT;

CREATE UNIQUE INDEX "profiles_github_user_id_unique" ON "profiles" ("github_user_id") WHERE (github_user_id IS NOT NULL);

CREATE UNIQUE INDEX "profiles_github_username_unique" ON "profiles" (lower(github_username)) WHERE (github_username IS NOT NULL);

CREATE UNIQUE INDEX "profiles_x_user_id_unique" ON "profiles" ("x_user_id") WHERE (x_user_id IS NOT NULL);

CREATE UNIQUE INDEX "profiles_x_username_unique" ON "profiles" (lower(x_username)) WHERE (x_username IS NOT NULL);

CREATE TABLE "provider_skill_catalog" (
  "slug" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "source_url" TEXT NOT NULL,
  PRIMARY KEY ("slug"),
  CHECK (provider IN ('skillry', 'redskill', 'scenario')),
  CHECK (source_url LIKE 'https://%')
) STRICT;

CREATE TABLE "provider_skill_engagement" (
  "user_id" TEXT NOT NULL,
  "skill_slug" TEXT NOT NULL,
  "vote" INTEGER,
  "saved" INTEGER NOT NULL DEFAULT 0 CHECK ("saved" IN (0,1)),
  PRIMARY KEY ("user_id","skill_slug"),
  FOREIGN KEY ("skill_slug") REFERENCES "provider_skill_catalog" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("user_id") REFERENCES "account_identities" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK (vote IN ('-1', 1))
) STRICT;

CREATE TABLE "ranking_snapshots" (
  "id" INTEGER NOT NULL,
  "ranking_slug" TEXT NOT NULL,
  "snapshot_date" TEXT NOT NULL DEFAULT (date('now')),
  "generated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "methodology_version" TEXT NOT NULL,
  "item_count" INTEGER NOT NULL DEFAULT 0,
  "items" TEXT NOT NULL DEFAULT '[]' CHECK ("items" IS NULL OR json_valid("items")),
  "source_counts" TEXT NOT NULL DEFAULT '{}' CHECK ("source_counts" IS NULL OR json_valid("source_counts")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (item_count >= 0),
  CHECK (json_type(items) = 'array'),
  PRIMARY KEY ("id"),
  UNIQUE ("ranking_slug","snapshot_date"),
  CHECK (json_type(source_counts) = 'object')
) STRICT;

CREATE TABLE "registry_coverage_stats" (
  "id" INTEGER NOT NULL DEFAULT 1 CHECK ("id" IN (0,1)),
  "discovered_projects" INTEGER NOT NULL DEFAULT 0,
  "validated_skills" INTEGER NOT NULL DEFAULT 0,
  "installable_skills" INTEGER NOT NULL DEFAULT 0,
  "agent_proven_skills" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (agent_proven_skills >= 0),
  CHECK (discovered_projects >= 0),
  CHECK (id),
  CHECK (installable_skills >= 0),
  PRIMARY KEY ("id"),
  CHECK (validated_skills >= 0)
) STRICT;

CREATE TABLE "registry_stats" (
  "id" INTEGER NOT NULL DEFAULT 1 CHECK ("id" IN (0,1)),
  "approved_skill_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (id),
  PRIMARY KEY ("id")
) STRICT;

CREATE TABLE "seo_editorial_queue" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "week_start" TEXT NOT NULL,
  "slot" INTEGER NOT NULL,
  "topic_key" TEXT NOT NULL,
  "brief" TEXT NOT NULL CHECK ("brief" IS NULL OR json_valid("brief")),
  "draft" TEXT CHECK ("draft" IS NULL OR json_valid("draft")),
  "status" TEXT NOT NULL DEFAULT 'planned',
  "review_notes" TEXT CHECK ("review_notes" IS NULL OR json_valid("review_notes")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "published_at" TEXT,
  PRIMARY KEY ("id"),
  CHECK (slot >= 1 AND slot <= 20),
  CHECK (status IN ('planned', 'draft', 'approved', 'published', 'needs_revision')),
  UNIQUE ("topic_key"),
  UNIQUE ("week_start","slot")
) STRICT;

CREATE TABLE "showcase_entries" (
  "slug" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("slug")
) STRICT;

CREATE TABLE "showcase_votes" (
  "user_id" TEXT NOT NULL,
  "case_slug" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "vote" INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY ("case_slug") REFERENCES "showcase_entries" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  PRIMARY KEY ("user_id","case_slug"),
  FOREIGN KEY ("user_id") REFERENCES "account_identities" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK (vote IN ('-1', 1))
) STRICT;

CREATE TABLE "skill_analysis_ledger" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "request_key" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'reserved',
  "reserved_usd" REAL NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "response" TEXT,
  "error_code" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "finished_at" TEXT,
  "cache_until" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now','+7 days') || '000Z'),
  PRIMARY KEY ("id"),
  CHECK (reserved_usd > 0),
  CHECK (status IN ('reserved', 'complete', 'failed'))
) STRICT;

CREATE TABLE "skill_audits" (
  "skill_slug" TEXT NOT NULL,
  "audit_score" INTEGER NOT NULL DEFAULT 0,
  "risk_level" TEXT NOT NULL DEFAULT 'needs_review',
  "quality_score" INTEGER NOT NULL DEFAULT 0,
  "trust_score" INTEGER NOT NULL DEFAULT 0,
  "maintenance_score" INTEGER NOT NULL DEFAULT 0,
  "security_score" INTEGER NOT NULL DEFAULT 0,
  "install_score" INTEGER NOT NULL DEFAULT 0,
  "checks" TEXT NOT NULL DEFAULT '[]' CHECK ("checks" IS NULL OR json_valid("checks")),
  "signals" TEXT NOT NULL DEFAULT '[]' CHECK ("signals" IS NULL OR json_valid("signals")),
  "warnings" TEXT NOT NULL DEFAULT '[]' CHECK ("warnings" IS NULL OR json_valid("warnings")),
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "generated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (audit_score >= 0 AND audit_score <= 100),
  CHECK (install_score >= 0 AND install_score <= 100),
  CHECK (maintenance_score >= 0 AND maintenance_score <= 100),
  PRIMARY KEY ("skill_slug"),
  CHECK (quality_score >= 0 AND quality_score <= 100),
  CHECK (risk_level IN ('safe_to_try', 'needs_review', 'risky')),
  CHECK (security_score >= 0 AND security_score <= 100),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK (trust_score >= 0 AND trust_score <= 100)
) STRICT;

CREATE TABLE "skill_candidates" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "source_key" TEXT NOT NULL,
  "github_repository_id" INTEGER,
  "github_full_name" TEXT NOT NULL,
  "github_owner" TEXT NOT NULL,
  "github_repo" TEXT NOT NULL,
  "source_ref" TEXT,
  "source_path" TEXT NOT NULL DEFAULT '',
  "canonical_source_url" TEXT NOT NULL,
  "source_content_hash" TEXT,
  "skill_name" TEXT,
  "skill_description" TEXT,
  "github_stars" INTEGER NOT NULL DEFAULT 0,
  "github_updated_at" TEXT,
  "license" TEXT,
  "license_status" TEXT NOT NULL DEFAULT 'unknown',
  "status" TEXT NOT NULL DEFAULT 'discovered',
  "risk_level" TEXT NOT NULL DEFAULT 'unknown',
  "risk_reasons" TEXT NOT NULL DEFAULT '[]' CHECK ("risk_reasons" IS NULL OR json_valid("risk_reasons")) CHECK ("risk_reasons" IS NULL OR json_type("risk_reasons") = 'array'),
  "has_executable_files" INTEGER NOT NULL DEFAULT 0 CHECK ("has_executable_files" IN (0,1)),
  "fast_track_eligible" INTEGER NOT NULL DEFAULT 0 CHECK ("fast_track_eligible" IN (0,1)),
  "requires_ai_review" INTEGER NOT NULL DEFAULT 1 CHECK ("requires_ai_review" IN (0,1)),
  "duplicate_of" TEXT,
  "published_skill_slug" TEXT,
  "discovery_source" TEXT NOT NULL DEFAULT 'github-search',
  "discovery_payload" TEXT NOT NULL DEFAULT '{}' CHECK ("discovery_payload" IS NULL OR json_valid("discovery_payload")),
  "validation_payload" TEXT NOT NULL DEFAULT '{}' CHECK ("validation_payload" IS NULL OR json_valid("validation_payload")),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "lease_owner" TEXT,
  "lease_expires_at" TEXT,
  "last_error" TEXT,
  "discovered_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "validated_at" TEXT,
  "published_at" TEXT,
  "last_seen_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (attempt_count >= 0),
  FOREIGN KEY ("duplicate_of") REFERENCES "skill_candidates" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CHECK (github_stars >= 0),
  CHECK (license_status IN ('unknown', 'missing', 'restricted', 'detected')),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("published_skill_slug") REFERENCES "skills" ("slug") ON DELETE SET NULL ON UPDATE NO ACTION,
  CHECK (risk_level IN ('unknown', 'low', 'medium', 'high', 'critical')),
  UNIQUE ("source_key"),
  CHECK (status IN ('discovered', 'validating', 'expanded', 'fast_track', 'review_required', 'publishing', 'published', 'rejected', 'duplicate', 'validation_error', 'publication_error'))
) STRICT;

CREATE UNIQUE INDEX "skill_candidates_active_content_unique" ON "skill_candidates" ("source_content_hash") WHERE ((source_content_hash IS NOT NULL) AND (status IN ('fast_track', 'review_required', 'publishing', 'published', 'publication_error')));

CREATE UNIQUE INDEX "skill_candidates_canonical_source_unique" ON "skill_candidates" (lower(canonical_source_url));

CREATE UNIQUE INDEX "skill_candidates_repo_path_unique" ON "skill_candidates" ("github_repository_id","source_path") WHERE (github_repository_id IS NOT NULL);

CREATE TABLE "skill_claims" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_slug" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "github_username" TEXT,
  "repo_url" TEXT,
  "verification_method" TEXT NOT NULL DEFAULT 'github_profile',
  "evidence_url" TEXT,
  "evidence_note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewer_note" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "x_username" TEXT,
  "verified_at" TEXT,
  "verification_tier" TEXT NOT NULL DEFAULT 'maintainer',
  "challenge_token_hash" TEXT,
  "challenge_expires_at" TEXT,
  CHECK (github_username IS NULL OR (length(github_username) BETWEEN 1 AND 39 AND lower(github_username) NOT GLOB '*[^a-z0-9-]*' AND substr(lower(github_username),1,1) GLOB '[a-z0-9]' AND substr(lower(github_username),-1,1) GLOB '[a-z0-9]')),
  CHECK (github_username IS NOT NULL OR x_username IS NOT NULL OR evidence_url IS NOT NULL),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  UNIQUE ("skill_slug","user_id"),
  CHECK (status IN ('pending', 'approved', 'rejected')),
  FOREIGN KEY ("user_id") REFERENCES "profiles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK (verification_method IN ('github_profile', 'github_oauth', 'repository_file', 'repository_issue', 'website_link', 'manual')),
  CHECK (verification_tier IN ('maintainer', 'official')),
  CHECK (status <> 'approved' OR verified_at IS NOT NULL),
  CHECK (x_username IS NULL OR (length(x_username) BETWEEN 1 AND 15 AND lower(x_username) NOT GLOB '*[^a-z0-9_]*'))
) STRICT;

CREATE TABLE "skill_download_receipts" (
  "user_id" TEXT,
  "skill_slug" TEXT NOT NULL,
  "download_day" TEXT NOT NULL DEFAULT (date('now')),
  "artifact_sha256" TEXT,
  "artifact_kind" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "visitor_key" TEXT,
  "actor_key" TEXT GENERATED ALWAYS AS (CASE WHEN user_id IS NOT NULL THEN 'user:' || user_id ELSE 'visitor:' || visitor_key END) STORED,
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "source_event_key" TEXT,
  CHECK (source_event_key IS NULL AND (user_id IS NOT NULL) <> (visitor_key IS NOT NULL) OR source_event_key IS NOT NULL AND user_id IS NULL AND visitor_key IS NULL AND (artifact_kind IN ('command-copy', 'external-open', 'agent-use'))),
  CHECK ((artifact_kind IN ('skill-document', 'paid-file')) AND artifact_sha256 IS NOT NULL OR (artifact_kind IN ('command-copy', 'external-open', 'agent-use')) AND artifact_sha256 IS NULL),
  CHECK (artifact_kind IN ('skill-document', 'paid-file', 'command-copy', 'external-open', 'agent-use')),
  CHECK ((length(artifact_sha256) = 64 AND artifact_sha256 NOT GLOB '*[^a-f0-9]*')),
  PRIMARY KEY ("id"),
  CHECK ((length(skill_slug) BETWEEN 1 AND 200 AND substr(skill_slug,1,1) GLOB '[a-z0-9]' AND skill_slug NOT GLOB '*[^a-z0-9-]*')),
  UNIQUE ("source_event_key"),
  FOREIGN KEY ("user_id") REFERENCES "account_identities" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK ((length(visitor_key) = 64 AND visitor_key NOT GLOB '*[^a-f0-9]*'))
) STRICT;

CREATE TABLE "skill_download_totals" (
  "skill_slug" TEXT NOT NULL,
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (downloads >= 0),
  PRIMARY KEY ("skill_slug")
) STRICT;

CREATE TABLE "skill_event_stats" (
  "skill_slug" TEXT NOT NULL,
  "total_events" INTEGER NOT NULL DEFAULT 0,
  "views" INTEGER NOT NULL DEFAULT 0,
  "install_copies" INTEGER NOT NULL DEFAULT 0,
  "saves" INTEGER NOT NULL DEFAULT 0,
  "compares" INTEGER NOT NULL DEFAULT 0,
  "outbound_clicks" INTEGER NOT NULL DEFAULT 0,
  "claim_starts" INTEGER NOT NULL DEFAULT 0,
  "claim_submits" INTEGER NOT NULL DEFAULT 0,
  "last_event_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "resolve_requests" INTEGER NOT NULL DEFAULT 0,
  "install_starts" INTEGER NOT NULL DEFAULT 0,
  "install_successes" INTEGER NOT NULL DEFAULT 0,
  "install_failures" INTEGER NOT NULL DEFAULT 0,
  "agent_calls" INTEGER NOT NULL DEFAULT 0,
  "outcome_successes" INTEGER NOT NULL DEFAULT 0,
  "outcome_failures" INTEGER NOT NULL DEFAULT 0,
  "share_copies" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("skill_slug"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "skill_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_slug" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "user_id" TEXT,
  "session_id" TEXT,
  "path" TEXT,
  "referrer" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "event_key" TEXT,
  "source" TEXT NOT NULL DEFAULT 'web',
  "is_verified" INTEGER NOT NULL DEFAULT 0 CHECK ("is_verified" IN (0,1)),
  CHECK (event_type IN ('view', 'resolve_request', 'install_copy', 'install_start', 'install_success', 'install_failure', 'agent_call', 'outcome_success', 'outcome_failure', 'save', 'compare', 'outbound_github', 'outbound_docs', 'claim_start', 'claim_submit', 'share_copy')),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("user_id") REFERENCES "profiles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
) STRICT;

CREATE UNIQUE INDEX "skill_events_event_key_unique" ON "skill_events" ("event_key");

CREATE TABLE "skill_events_daily" (
  "skill_slug" TEXT NOT NULL,
  "event_date" TEXT NOT NULL,
  "total_events" INTEGER NOT NULL DEFAULT 0,
  "views" INTEGER NOT NULL DEFAULT 0,
  "install_copies" INTEGER NOT NULL DEFAULT 0,
  "saves" INTEGER NOT NULL DEFAULT 0,
  "compares" INTEGER NOT NULL DEFAULT 0,
  "outbound_clicks" INTEGER NOT NULL DEFAULT 0,
  "claim_starts" INTEGER NOT NULL DEFAULT 0,
  "claim_submits" INTEGER NOT NULL DEFAULT 0,
  "first_event_at" TEXT,
  "last_event_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "resolve_requests" INTEGER NOT NULL DEFAULT 0,
  "install_starts" INTEGER NOT NULL DEFAULT 0,
  "install_successes" INTEGER NOT NULL DEFAULT 0,
  "install_failures" INTEGER NOT NULL DEFAULT 0,
  "agent_calls" INTEGER NOT NULL DEFAULT 0,
  "outcome_successes" INTEGER NOT NULL DEFAULT 0,
  "outcome_failures" INTEGER NOT NULL DEFAULT 0,
  "share_copies" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("skill_slug","event_date"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "skill_feedback" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_slug" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "success" INTEGER NOT NULL CHECK ("success" IN (0,1)),
  "latency_ms" INTEGER,
  "error_message" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "skill_product_metadata_changes" (
  "request_id" TEXT NOT NULL,
  "github_repo" TEXT NOT NULL,
  "source_path" TEXT NOT NULL,
  "submission_id" TEXT,
  "skill_id" TEXT,
  "reason" TEXT NOT NULL,
  "previous" TEXT NOT NULL CHECK ("previous" IS NULL OR json_valid("previous")),
  "product_metadata" TEXT NOT NULL CHECK ("product_metadata" IS NULL OR json_valid("product_metadata")),
  "result" TEXT NOT NULL CHECK ("result" IS NULL OR json_valid("result")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("request_id"),
  CHECK (length(trim(reason)) >= 10 AND length(trim(reason)) <= 2000),
  FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY ("submission_id") REFERENCES "skill_submissions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "skill_relations" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "source_skill_id" TEXT,
  "target_skill_id" TEXT,
  "relation_type" TEXT NOT NULL,
  "created_by" TEXT,
  "created_by_type" TEXT DEFAULT 'system',
  "confidence" REAL DEFAULT 1.0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("source_skill_id") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  UNIQUE ("source_skill_id","target_skill_id","relation_type"),
  FOREIGN KEY ("target_skill_id") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "skill_stats" (
  "skill_slug" TEXT NOT NULL,
  "total_calls" INTEGER NOT NULL DEFAULT 0,
  "success_calls" INTEGER NOT NULL DEFAULT 0,
  "success_rate" REAL,
  "avg_latency_ms" INTEGER,
  "unique_agents" INTEGER NOT NULL DEFAULT 0,
  "last_called_at" TEXT,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("skill_slug"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "skill_submissions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_id" TEXT,
  "github_repo" TEXT NOT NULL,
  "submission_source" TEXT NOT NULL,
  "submitted_by_agent" TEXT,
  "ai_review_result" TEXT CHECK ("ai_review_result" IS NULL OR json_valid("ai_review_result")),
  "status" TEXT NOT NULL,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "repository_url" TEXT,
  "source_ref" TEXT,
  "skill_path" TEXT,
  "skill_name" TEXT,
  "skill_description" TEXT,
  "category" TEXT,
  "tags" TEXT NOT NULL DEFAULT '[]' CHECK ("tags" IS NULL OR json_valid("tags")) CHECK ("tags" IS NULL OR json_type("tags") = 'array'),
  "submitter_github" TEXT,
  "submitter_x" TEXT,
  "identity_provider" TEXT,
  "identity_verified" INTEGER NOT NULL DEFAULT 0 CHECK ("identity_verified" IN (0,1)),
  "status_token_hash" TEXT,
  "request_fingerprint" TEXT,
  "validation_result" TEXT NOT NULL DEFAULT '{}' CHECK ("validation_result" IS NULL OR json_valid("validation_result")),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "review_started_at" TEXT,
  "reviewed_at" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "skill_versions" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_slug" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT 'Unknown',
  "source_commit_sha" TEXT,
  "source_content_hash" TEXT NOT NULL,
  "source_ref" TEXT,
  "source_path" TEXT,
  "license" TEXT NOT NULL DEFAULT 'Unknown',
  "license_source" TEXT NOT NULL DEFAULT 'unknown',
  "detected_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  UNIQUE ("skill_slug","source_content_hash")
) STRICT;

CREATE TABLE "skill_votes" (
  "user_id" TEXT NOT NULL,
  "skill_slug" TEXT NOT NULL,
  "vote" INTEGER NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("user_id","skill_slug"),
  FOREIGN KEY ("skill_slug") REFERENCES "skills" ("slug") ON DELETE CASCADE ON UPDATE NO ACTION,
  FOREIGN KEY ("user_id") REFERENCES "account_identities" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CHECK (vote IN ('-1', 1))
) STRICT;

CREATE TABLE "skills" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "long_description" TEXT,
  "tagline" TEXT,
  "author_name" TEXT NOT NULL,
  "author_email" TEXT,
  "author_url" TEXT,
  "repository" TEXT NOT NULL,
  "github_repo" TEXT NOT NULL,
  "github_stars" INTEGER DEFAULT 0,
  "github_forks" INTEGER DEFAULT 0,
  "category" TEXT NOT NULL,
  "tags" TEXT DEFAULT '[]' CHECK ("tags" IS NULL OR json_valid("tags")) CHECK ("tags" IS NULL OR json_type("tags") = 'array'),
  "frameworks" TEXT DEFAULT '[]' CHECK ("frameworks" IS NULL OR json_valid("frameworks")) CHECK ("frameworks" IS NULL OR json_type("frameworks") = 'array'),
  "version" TEXT NOT NULL DEFAULT 'Unknown',
  "license" TEXT NOT NULL,
  "install_command" TEXT,
  "npm_package" TEXT,
  "verified" INTEGER DEFAULT 0 CHECK ("verified" IN (0,1)),
  "submission_source" TEXT DEFAULT 'web',
  "submitted_by_agent" TEXT,
  "ai_review_score" TEXT CHECK ("ai_review_score" IS NULL OR json_valid("ai_review_score")),
  "ai_review_approved" INTEGER DEFAULT 0 CHECK ("ai_review_approved" IN (0,1)),
  "ai_review_issues" TEXT CHECK ("ai_review_issues" IS NULL OR json_valid("ai_review_issues")) CHECK ("ai_review_issues" IS NULL OR json_type("ai_review_issues") = 'array'),
  "ai_review_suggestions" TEXT CHECK ("ai_review_suggestions" IS NULL OR json_valid("ai_review_suggestions")) CHECK ("ai_review_suggestions" IS NULL OR json_type("ai_review_suggestions") = 'array'),
  "downloads" INTEGER DEFAULT 0,
  "used_by" INTEGER DEFAULT 0,
  "rating" REAL DEFAULT 0.0,
  "review_count" INTEGER DEFAULT 0,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "last_synced_at" TEXT,
  "parent_skill_id" TEXT,
  "composed_of" TEXT CHECK ("composed_of" IS NULL OR json_valid("composed_of")) CHECK ("composed_of" IS NULL OR json_type("composed_of") = 'array'),
  "skill_type" TEXT DEFAULT 'standalone',
  "interface_definition" TEXT CHECK ("interface_definition" IS NULL OR json_valid("interface_definition")),
  "author_type" TEXT DEFAULT 'human',
  "trust_level" TEXT DEFAULT 'unverified',
  "weekly_downloads" INTEGER DEFAULT 0,
  "composition_count" INTEGER DEFAULT 0,
  "author_user_id" TEXT,
  "quality_score" REAL NOT NULL DEFAULT 0,
  "quality_signals" TEXT NOT NULL DEFAULT '{}' CHECK ("quality_signals" IS NULL OR json_valid("quality_signals")),
  "github_language" TEXT,
  "github_last_pushed_at" TEXT,
  "listing_status" TEXT NOT NULL DEFAULT 'reviewed',
  "source_ref" TEXT,
  "source_path" TEXT,
  "publisher_github" TEXT,
  "publisher_x" TEXT,
  "publisher_verified" INTEGER NOT NULL DEFAULT 0 CHECK ("publisher_verified" IN (0,1)),
  "search_document" TEXT,
  "source_commit_sha" TEXT,
  "source_content_hash" TEXT,
  "source_sync_status" TEXT NOT NULL DEFAULT 'untracked',
  "license_source" TEXT NOT NULL DEFAULT 'unknown',
  "license_status" TEXT NOT NULL DEFAULT 'unknown',
  "owner_publication" TEXT CHECK ("owner_publication" IS NULL OR json_valid("owner_publication")),
  "primary_category" TEXT,
  "taxonomy_tags" TEXT NOT NULL DEFAULT '[]' CHECK ("taxonomy_tags" IS NULL OR json_valid("taxonomy_tags")) CHECK ("taxonomy_tags" IS NULL OR json_type("taxonomy_tags") = 'array'),
  "output_types" TEXT NOT NULL DEFAULT '[]' CHECK ("output_types" IS NULL OR json_valid("output_types")) CHECK ("output_types" IS NULL OR json_type("output_types") = 'array'),
  "taxonomy_version" INTEGER NOT NULL DEFAULT 0,
  "site_downloads" INTEGER NOT NULL DEFAULT 0,
  "product_metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("product_metadata" IS NULL OR json_valid("product_metadata")),
  FOREIGN KEY ("author_user_id") REFERENCES "profiles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CHECK (license_source IN ('skill_frontmatter', 'github_repository', 'manual', 'unknown')),
  CHECK (license_status IN ('detected', 'missing', 'unknown', 'restricted')),
  FOREIGN KEY ("parent_skill_id") REFERENCES "skills" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  PRIMARY KEY ("id"),
  CHECK (json_type(product_metadata) = 'object' AND length(CAST(product_metadata AS BLOB)) <= 32000),
  CHECK (site_downloads >= 0),
  UNIQUE ("slug"),
  CHECK (source_sync_status IN ('untracked', 'current', 'changed', 'error'))
) STRICT;

CREATE UNIQUE INDEX "skills_approved_source_content_hash_unique" ON "skills" ("source_content_hash") WHERE ((source_content_hash IS NOT NULL) AND (ai_review_approved = 1));

CREATE UNIQUE INDEX "skills_public_content_hash_unique" ON "skills" ("source_content_hash") WHERE ((source_content_hash IS NOT NULL) AND ((ai_review_approved = 1) OR (listing_status = 'owner_published')));

CREATE TABLE "submission_validation_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "request_fingerprint" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id")
) STRICT;

CREATE TABLE "x_content_queue" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_id" TEXT,
  "skill_slug" TEXT NOT NULL,
  "content_type" TEXT NOT NULL DEFAULT 'skill_pick',
  "campaign" TEXT NOT NULL DEFAULT 'daily_skill',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "priority" REAL NOT NULL DEFAULT 0,
  "scheduled_for" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "post_text" TEXT NOT NULL,
  "reply_text" TEXT,
  "x_post_id" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_at" TEXT,
  "posted_at" TEXT,
  "error" TEXT,
  "source" TEXT NOT NULL DEFAULT 'auto',
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  CHECK (content_type IN ('skill_pick', 'weekly_thread', 'reply_draft', 'launch_update')),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CHECK (status IN ('queued', 'posting', 'posted', 'skipped', 'error', 'draft'))
) STRICT;

CREATE UNIQUE INDEX "idx_x_content_queue_active_skill_unique" ON "x_content_queue" ("skill_slug","content_type") WHERE (status IN ('queued', 'posting'));

CREATE TABLE "x_oauth_connections" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "provider" TEXT NOT NULL DEFAULT 'x',
  "x_user_id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "scope" TEXT,
  "access_token_cipher" BLOB NOT NULL,
  "refresh_token_cipher" BLOB NOT NULL,
  "expires_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  UNIQUE ("provider")
) STRICT;

CREATE TABLE "x_post_history" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "skill_id" TEXT,
  "skill_slug" TEXT NOT NULL,
  "x_post_id" TEXT,
  "post_text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'posted',
  "error" TEXT,
  "posted_at" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "queue_item_id" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("queue_item_id") REFERENCES "x_content_queue" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "x_post_metrics" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "x_post_id" TEXT NOT NULL,
  "queue_item_id" TEXT,
  "skill_slug" TEXT,
  "captured_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "reply_count" INTEGER NOT NULL DEFAULT 0,
  "repost_count" INTEGER NOT NULL DEFAULT 0,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "quote_count" INTEGER NOT NULL DEFAULT 0,
  "bookmark_count" INTEGER,
  "impression_count" INTEGER,
  "raw_metrics" TEXT NOT NULL DEFAULT '{}' CHECK ("raw_metrics" IS NULL OR json_valid("raw_metrics")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("queue_item_id") REFERENCES "x_content_queue" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
) STRICT;

CREATE TABLE "x_reply_drafts" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  "source_tweet_id" TEXT,
  "source_url" TEXT,
  "source_author_username" TEXT,
  "source_author_name" TEXT,
  "source_text" TEXT,
  "skill_id" TEXT,
  "skill_slug" TEXT,
  "draft_text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "score" REAL NOT NULL DEFAULT 0,
  "reason" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK ("metadata" IS NULL OR json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z'),
  "x_post_id" TEXT,
  "posted_at" TEXT,
  "error" TEXT,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CHECK (status IN ('draft', 'approved', 'posting', 'posted', 'dismissed', 'skipped', 'error'))
) STRICT;

CREATE UNIQUE INDEX "idx_x_reply_drafts_creator_source_unique" ON "x_reply_drafts" ("source_tweet_id") WHERE ((source_tweet_id IS NOT NULL) AND (COALESCE(json_extract(metadata, '$.' || 'outreach_kind'), '') = 'creator_x_reply'));

CREATE UNIQUE INDEX "idx_x_reply_drafts_source_skill_unique" ON "x_reply_drafts" ("source_tweet_id","skill_slug") WHERE (source_tweet_id IS NOT NULL);
