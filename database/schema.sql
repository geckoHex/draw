PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  strokes_json TEXT NOT NULL CHECK (json_valid(strokes_json)),
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, key)
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_boards_account_root_updated_at
ON boards(account_id, updated_at DESC)
WHERE folder_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_boards_account_folder_updated_at
ON boards(account_id, folder_id, updated_at DESC)
WHERE folder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_folders_account_updated_at
ON folders(account_id, updated_at DESC);

PRAGMA user_version = 2;
PRAGMA optimize;
