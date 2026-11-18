CREATE TABLE IF NOT EXISTS visitor_log_entries (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  visitor_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS visitor_log_entries_created_at_idx
  ON visitor_log_entries(created_at_ms DESC);

CREATE INDEX IF NOT EXISTS visitor_log_entries_visitor_hash_idx
  ON visitor_log_entries(visitor_hash, created_at_ms DESC);
