PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  strokes_json TEXT NOT NULL CHECK (json_valid(strokes_json)),
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boards_root_updated_at
ON boards(updated_at DESC)
WHERE folder_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_boards_folder_updated_at
ON boards(folder_id, updated_at DESC)
WHERE folder_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_folders_updated_at
ON folders(updated_at DESC);

INSERT OR IGNORE INTO settings (key, value_json, updated_at)
VALUES
  ('draw.theme', '"system"', CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('draw.dark-canvas', 'false', CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('draw.pen-smoothing', '5', CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  ('draw.show-save-status', 'false', CAST(strftime('%s', 'now') AS INTEGER) * 1000);

PRAGMA user_version = 1;
PRAGMA optimize;
