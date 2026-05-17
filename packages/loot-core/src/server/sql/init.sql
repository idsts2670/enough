CREATE TABLE created_budgets (month TEXT PRIMARY KEY);

CREATE TABLE spreadsheet_cells
 (name TEXT PRIMARY KEY,
  expr TEXT,
  cachedValue TEXT);

CREATE TABLE banks
 (id TEXT PRIMARY KEY,
  bank_id TEXT,
  name TEXT,
  tombstone INTEGER DEFAULT 0);

CREATE TABLE accounts
   (id TEXT PRIMARY KEY,
    account_id TEXT,
    name TEXT,
    balance_current INTEGER,
    balance_available INTEGER,
    balance_limit INTEGER,
    mask TEXT,
    official_name TEXT,
    type TEXT,
    subtype TEXT,
    bank TEXT,
    offbudget INTEGER DEFAULT 0,
    closed INTEGER DEFAULT 0,
    tombstone INTEGER DEFAULT 0);

CREATE TABLE pending_transactions
  (id TEXT PRIMARY KEY,
   acct INTEGER,
   amount INTEGER,
   description TEXT,
   date TEXT,
   FOREIGN KEY(acct) REFERENCES accounts(id));

CREATE TABLE transactions
  (id TEXT PRIMARY KEY,
   isParent INTEGER DEFAULT 0,
   isChild INTEGER DEFAULT 0,
   acct TEXT,
   category TEXT,
   amount INTEGER,
   description TEXT,
   notes TEXT,
   date INTEGER,
   financial_id TEXT,
   type TEXT,
   location TEXT,
   error TEXT,
   imported_description TEXT,
   starting_balance_flag INTEGER DEFAULT 0,
   transferred_id TEXT,
   sort_order REAL,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE ai_category_suggestions
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

CREATE INDEX ai_category_suggestions_transaction_idx
  ON ai_category_suggestions(transaction_id);

CREATE INDEX ai_category_suggestions_status_idx
  ON ai_category_suggestions(status);

CREATE TABLE categories
 (id TEXT PRIMARY KEY,
  name TEXT,
  is_income INTEGER DEFAULT 0,
  cat_group TEXT,
  sort_order REAL,
  tombstone INTEGER DEFAULT 0);

CREATE TABLE category_groups
   (id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    is_income INTEGER DEFAULT 0,
    sort_order REAL,
    tombstone INTEGER DEFAULT 0);

CREATE TABLE messages_crdt
 (id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL UNIQUE,
  dataset TEXT NOT NULL,
  row TEXT NOT NULL,
  column TEXT NOT NULL,
  value BLOB NOT NULL);

CREATE TABLE category_mapping
  (id TEXT PRIMARY KEY,
   transferId TEXT);

CREATE TABLE messages_clock (id INTEGER PRIMARY KEY, clock TEXT);

CREATE TABLE db_version (version TEXT PRIMARY KEY);
CREATE TABLE __migrations__ (id INT PRIMARY KEY NOT NULL);
