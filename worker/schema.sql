CREATE TABLE IF NOT EXISTS ai_usage (
  uid TEXT NOT NULL,
  month TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER,
  PRIMARY KEY (uid, month)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_uid_month ON ai_usage(uid, month);
