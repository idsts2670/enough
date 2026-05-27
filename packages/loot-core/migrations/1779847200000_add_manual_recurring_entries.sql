CREATE TABLE IF NOT EXISTS manual_recurring_entries
  (id TEXT PRIMARY KEY,
   name TEXT,
   amount INTEGER,
   category TEXT,
   start_month TEXT,
   day_of_month INTEGER,
   cadence TEXT DEFAULT 'monthly',
   active INTEGER DEFAULT 1,
   created_at TEXT,
   updated_at TEXT,
   tombstone INTEGER DEFAULT 0);

CREATE INDEX IF NOT EXISTS manual_recurring_entries_category_idx
  ON manual_recurring_entries(category);

CREATE INDEX IF NOT EXISTS manual_recurring_entries_start_month_idx
  ON manual_recurring_entries(start_month);
