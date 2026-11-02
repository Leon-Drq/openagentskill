-- Private Worker binding only. No public SQL endpoint or browser credential.
-- Integer millionths of a US dollar avoid floating-point budget drift.
CREATE TABLE skill_analysis_ledger (
  id TEXT PRIMARY KEY NOT NULL,
  request_key TEXT NOT NULL CHECK(length(request_key) = 64),
  feature TEXT NOT NULL CHECK(length(feature) BETWEEN 1 AND 120),
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved', 'complete', 'failed')),
  reserved_microusd INTEGER NOT NULL CHECK(reserved_microusd BETWEEN 1 AND 100000),
  input_tokens INTEGER CHECK(input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK(output_tokens IS NULL OR output_tokens >= 0),
  response TEXT, error_code TEXT,
  created_at INTEGER NOT NULL, finished_at INTEGER,
  cache_until INTEGER NOT NULL
);
CREATE INDEX skill_analysis_key_idx ON skill_analysis_ledger(request_key, created_at DESC);
CREATE INDEX skill_analysis_date_idx ON skill_analysis_ledger(created_at);
