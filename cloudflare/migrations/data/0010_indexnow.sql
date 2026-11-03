-- Private delivery ledger: never exposed through the public database adapter.
CREATE TABLE IF NOT EXISTS indexnow_queue (
  url TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  pending INTEGER NOT NULL DEFAULT 1,
  requested_at INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  last_submitted_at INTEGER
);
CREATE INDEX IF NOT EXISTS indexnow_queue_due ON indexnow_queue(pending, available_at);
CREATE TABLE IF NOT EXISTS indexnow_delivery (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_owner TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  last_status INTEGER,
  last_attempt_at INTEGER,
  last_success_at INTEGER
);
INSERT OR IGNORE INTO indexnow_delivery(id) VALUES (1);
