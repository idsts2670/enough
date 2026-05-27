ALTER TABLE manual_recurring_entries ADD COLUMN end_month TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS manual_recurring_entries_end_month_idx
  ON manual_recurring_entries(end_month);
