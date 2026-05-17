CREATE TABLE IF NOT EXISTS ai_category_suggestions
  (id TEXT PRIMARY KEY,
   transaction_id TEXT NOT NULL,
   normalized_payee TEXT,
   suggested_category TEXT,
   confidence REAL NOT NULL,
   source TEXT NOT NULL,
   reason TEXT,
   suggested_rule TEXT,
   should_auto_apply INTEGER DEFAULT 0,
   status TEXT DEFAULT 'pending',
   model TEXT,
   prompt_version TEXT,
   created_at TEXT NOT NULL,
   applied_at TEXT);

CREATE INDEX IF NOT EXISTS ai_category_suggestions_transaction_idx
  ON ai_category_suggestions(transaction_id);

CREATE INDEX IF NOT EXISTS ai_category_suggestions_status_idx
  ON ai_category_suggestions(status);
