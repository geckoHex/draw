import "server-only"

import Database from "better-sqlite3"
import { randomUUID } from "node:crypto"
import { mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import type { Account, AdminAccount, Board, CanvasElement, Folder } from "@/lib/data-types"

interface BoardRow {
  id: string
  title: string
  created_at: number
  updated_at: number
  strokes_json: string
  folder_id: string | null
}

interface FolderRow {
  id: string
  name: string
  color: string | null
  created_at: number
  updated_at: number
}

interface CountRow {
  folder_id: string
  board_count: number
}

interface SettingRow {
  value_json: string
}

interface AccountRow {
  id: string
  username: string
  username_normalized: string
  password_hash: string
  is_root: number
  created_at: number
  updated_at: number
}

interface SessionAccountRow extends AccountRow {
  expires_at: number
}

export interface AccountCredentials extends Account {
  usernameNormalized: string
  passwordHash: string
  createdAt: number
  updatedAt: number
}

export interface AuthenticatedAccount extends AccountCredentials {
  sessionExpiresAt: number
}

const DEFAULT_SETTINGS: ReadonlyArray<readonly [string, unknown]> = [
  ["draw.theme", "system"],
  ["draw.dark-canvas", false],
  ["draw.pen-smoothing", 5],
  ["draw.show-save-status", false],
]

declare global {
  var geckoDrawDatabase: Database.Database | undefined
}

function tableExists(database: Database.Database, tableName: string) {
  return Boolean(
    database
      .prepare<[string], { found: number }>(
        "SELECT 1 AS found FROM sqlite_schema WHERE type = 'table' AND name = ?"
      )
      .get(tableName)
  )
}

function columnExists(database: Database.Database, tableName: string, columnName: string) {
  if (!tableExists(database, tableName)) return false
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
  return columns.some((column) => column.name === columnName)
}

function migrateLegacyDatabase(database: Database.Database) {
  if (!tableExists(database, "boards") || columnExists(database, "boards", "account_id")) {
    return
  }

  database.transaction(() => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        username_normalized TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_root INTEGER NOT NULL DEFAULT 0 CHECK (is_root IN (0, 1)),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      ALTER TABLE folders
      ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;

      ALTER TABLE boards
      ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE;

      ALTER TABLE settings RENAME TO legacy_settings;

      CREATE TABLE settings (
        account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value_json TEXT NOT NULL CHECK (json_valid(value_json)),
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (account_id, key)
      );

      INSERT INTO settings (account_id, key, value_json, updated_at)
      SELECT NULL, key, value_json, updated_at
      FROM legacy_settings;

      DROP TABLE legacy_settings;
      DROP INDEX IF EXISTS idx_boards_root_updated_at;
      DROP INDEX IF EXISTS idx_boards_folder_updated_at;
      DROP INDEX IF EXISTS idx_folders_updated_at;
    `)
  })()
}

function migrateAccountRoles(database: Database.Database) {
  if (!tableExists(database, "accounts") || columnExists(database, "accounts", "is_root")) {
    return
  }

  database.exec(`
    ALTER TABLE accounts
    ADD COLUMN is_root INTEGER NOT NULL DEFAULT 0 CHECK (is_root IN (0, 1));

    UPDATE accounts
    SET is_root = 1
    WHERE username_normalized = 'root';
  `)
}

function openDatabase() {
  const databasePath = process.env.GECKODRAW_DATABASE_PATH
    ? path.resolve(process.env.GECKODRAW_DATABASE_PATH)
    : path.join(process.cwd(), "data", "geckodraw.sqlite3")
  const schemaPath = path.join(process.cwd(), "database", "schema.sql")

  mkdirSync(path.dirname(databasePath), { recursive: true })

  const database = new Database(databasePath, { timeout: 5_000 })
  database.pragma("journal_mode = WAL")
  database.pragma("foreign_keys = ON")
  database.pragma("synchronous = NORMAL")
  database.pragma("busy_timeout = 5000")
  migrateLegacyDatabase(database)
  migrateAccountRoles(database)
  database.exec(readFileSync(schemaPath, "utf8"))

  return database
}

function getDatabase() {
  globalThis.geckoDrawDatabase ??= openDatabase()
  return globalThis.geckoDrawDatabase
}

function boardFromRow(row: BoardRow): Board {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    strokes: JSON.parse(row.strokes_json) as CanvasElement[],
    folderId: row.folder_id,
  }
}

function folderFromRow(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function accountFromRow(row: AccountRow): AccountCredentials {
  return {
    id: row.id,
    username: row.username,
    isRoot: row.is_root === 1,
    usernameNormalized: row.username_normalized,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function folderBelongsToAccount(accountId: string, folderId: string | null) {
  if (folderId === null) return true
  return Boolean(
    getDatabase()
      .prepare<[string, string], { found: number }>(
        "SELECT 1 AS found FROM folders WHERE account_id = ? AND id = ?"
      )
      .get(accountId, folderId)
  )
}

function seedDefaultSettings(database: Database.Database, accountId: string) {
  const insert = database.prepare(`
    INSERT OR IGNORE INTO settings (account_id, key, value_json, updated_at)
    VALUES (?, ?, ?, ?)
  `)
  const timestamp = Date.now()
  for (const [key, value] of DEFAULT_SETTINGS) {
    insert.run(accountId, key, JSON.stringify(value), timestamp)
  }
}

export function createAccount(
  username: string,
  usernameNormalized: string,
  passwordHash: string
): AccountCredentials {
  const database = getDatabase()
  const create = database.transaction(() => {
    const accountCount = (
      database.prepare<[], { account_count: number }>(
        "SELECT COUNT(*) AS account_count FROM accounts"
      ).get()?.account_count ?? 0
    )
    if (accountCount === 0) {
      throw new Error("ROOT_ACCOUNT_REQUIRED")
    }
    const timestamp = Date.now()
    const id = randomUUID()

    database.prepare(`
      INSERT INTO accounts (
        id, username, username_normalized, password_hash, is_root, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, username, usernameNormalized, passwordHash, timestamp, timestamp)

    seedDefaultSettings(database, id)
    return getAccountById(id) as AccountCredentials
  })

  return create()
}

export function createInitialRootAccount(passwordHash: string): AccountCredentials | undefined {
  const database = getDatabase()
  const create = database.transaction(() => {
    const accountCount = database
      .prepare<[], { account_count: number }>("SELECT COUNT(*) AS account_count FROM accounts")
      .get()?.account_count ?? 0
    if (accountCount !== 0) return undefined

    const timestamp = Date.now()
    const id = randomUUID()
    database.prepare(`
      INSERT INTO accounts (
        id, username, username_normalized, password_hash, is_root, created_at, updated_at
      ) VALUES (?, 'root', 'root', ?, 1, ?, ?)
    `).run(id, passwordHash, timestamp, timestamp)

    database.prepare("UPDATE folders SET account_id = ? WHERE account_id IS NULL").run(id)
    database.prepare("UPDATE boards SET account_id = ? WHERE account_id IS NULL").run(id)
    database.prepare("UPDATE settings SET account_id = ? WHERE account_id IS NULL").run(id)
    seedDefaultSettings(database, id)

    return getAccountById(id)
  })

  return create()
}

export function hasAnyAccounts() {
  return Boolean(
    getDatabase().prepare<[], { found: number }>("SELECT 1 AS found FROM accounts LIMIT 1").get()
  )
}

export function getAllAccounts(): AdminAccount[] {
  const rows = getDatabase()
    .prepare<[], AccountRow>(`
      SELECT id, username, username_normalized, password_hash, is_root, created_at, updated_at
      FROM accounts
      ORDER BY is_root DESC, username_normalized ASC
    `)
    .all()
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    isRoot: row.is_root === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export function getAccountById(id: string): AccountCredentials | undefined {
  const row = getDatabase()
    .prepare<[string], AccountRow>(`
      SELECT id, username, username_normalized, password_hash, is_root, created_at, updated_at
      FROM accounts
      WHERE id = ?
    `)
    .get(id)
  return row ? accountFromRow(row) : undefined
}

export function getAccountByNormalizedUsername(
  usernameNormalized: string
): AccountCredentials | undefined {
  const row = getDatabase()
    .prepare<[string], AccountRow>(`
      SELECT id, username, username_normalized, password_hash, is_root, created_at, updated_at
      FROM accounts
      WHERE username_normalized = ?
    `)
    .get(usernameNormalized)
  return row ? accountFromRow(row) : undefined
}

export function isUsernameAvailable(usernameNormalized: string, excludingAccountId?: string) {
  const row = getDatabase()
    .prepare<[string, string], { found: number }>(`
      SELECT 1 AS found
      FROM accounts
      WHERE username_normalized = ? AND id != ?
    `)
    .get(usernameNormalized, excludingAccountId ?? "")
  return !row
}

export function updateAccountUsername(
  accountId: string,
  username: string,
  usernameNormalized: string
): AccountCredentials | undefined {
  const result = getDatabase()
    .prepare(`
      UPDATE accounts
      SET username = ?, username_normalized = ?, updated_at = ?
      WHERE id = ? AND is_root = 0
    `)
    .run(username, usernameNormalized, Date.now(), accountId)
  return result.changes > 0 ? getAccountById(accountId) : undefined
}

export function updateAccountPassword(accountId: string, passwordHash: string) {
  return getDatabase()
    .prepare("UPDATE accounts SET password_hash = ?, updated_at = ? WHERE id = ?")
    .run(passwordHash, Date.now(), accountId).changes > 0
}

export function deleteAccount(accountId: string) {
  return getDatabase()
    .prepare("DELETE FROM accounts WHERE id = ? AND is_root = 0")
    .run(accountId).changes > 0
}

export function deleteSessionsForAccount(accountId: string) {
  getDatabase().prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId)
}

export function createSession(tokenHash: string, accountId: string, expiresAt: number) {
  const database = getDatabase()
  const timestamp = Date.now()
  database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(timestamp)
  database.prepare(`
    INSERT INTO sessions (token_hash, account_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(tokenHash, accountId, timestamp, expiresAt)
}

export function getAccountBySession(
  tokenHash: string,
  timestamp = Date.now()
): AuthenticatedAccount | undefined {
  const row = getDatabase()
    .prepare<[string, number], SessionAccountRow>(`
      SELECT
        accounts.id,
        accounts.username,
        accounts.username_normalized,
        accounts.password_hash,
        accounts.is_root,
        accounts.created_at,
        accounts.updated_at,
        sessions.expires_at
      FROM sessions
      JOIN accounts ON accounts.id = sessions.account_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `)
    .get(tokenHash, timestamp)
  return row
    ? { ...accountFromRow(row), sessionExpiresAt: row.expires_at }
    : undefined
}

export function deleteSession(tokenHash: string) {
  getDatabase().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash)
}

export function deleteOtherSessions(accountId: string, currentTokenHash: string) {
  getDatabase()
    .prepare("DELETE FROM sessions WHERE account_id = ? AND token_hash != ?")
    .run(accountId, currentTokenHash)
}

export function getBoard(accountId: string, id: string): Board | undefined {
  const row = getDatabase()
    .prepare<[string, string], BoardRow>(`
      SELECT id, title, created_at, updated_at, strokes_json, folder_id
      FROM boards
      WHERE account_id = ? AND id = ?
    `)
    .get(accountId, id)

  return row ? boardFromRow(row) : undefined
}

export function saveBoard(accountId: string, board: Board): Board | undefined {
  if (!folderBelongsToAccount(accountId, board.folderId)) return undefined

  getDatabase()
    .prepare(`
      INSERT INTO boards (
        id, account_id, title, created_at, updated_at, strokes_json, folder_id
      ) VALUES (@id, @accountId, @title, @createdAt, @updatedAt, @strokesJson, @folderId)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at,
        strokes_json = excluded.strokes_json,
        folder_id = excluded.folder_id
      WHERE boards.account_id = excluded.account_id
        AND excluded.updated_at >= boards.updated_at
    `)
    .run({
      id: board.id,
      accountId,
      title: board.title,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      strokesJson: JSON.stringify(board.strokes),
      folderId: board.folderId,
    })

  return getBoard(accountId, board.id)
}

export function getRootBoards(accountId: string, limit: number, offset: number): Board[] {
  const rows = getDatabase()
    .prepare<[string, number, number], BoardRow>(`
      SELECT id, title, created_at, updated_at, strokes_json, folder_id
      FROM boards
      WHERE account_id = ? AND folder_id IS NULL
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(accountId, limit, offset)

  return rows.map(boardFromRow)
}

export function getBoardsByFolder(accountId: string, folderId: string): Board[] {
  const rows = getDatabase()
    .prepare<[string, string], BoardRow>(`
      SELECT id, title, created_at, updated_at, strokes_json, folder_id
      FROM boards
      WHERE account_id = ? AND folder_id = ?
      ORDER BY updated_at DESC
    `)
    .all(accountId, folderId)

  return rows.map(boardFromRow)
}

export function deleteBoard(accountId: string, id: string): boolean {
  return getDatabase()
    .prepare("DELETE FROM boards WHERE account_id = ? AND id = ?")
    .run(accountId, id).changes > 0
}

export function updateBoard(
  accountId: string,
  id: string,
  changes: { title?: string; folderId?: string | null }
): Board | undefined {
  if (changes.folderId !== undefined && !folderBelongsToAccount(accountId, changes.folderId)) {
    return undefined
  }

  const assignments = ["updated_at = MAX(updated_at + 1, ?)"]
  const parameters: Array<string | number | null> = [Date.now()]

  if (changes.title !== undefined) {
    assignments.push("title = ?")
    parameters.push(changes.title)
  }
  if (changes.folderId !== undefined) {
    assignments.push("folder_id = ?")
    parameters.push(changes.folderId)
  }

  parameters.push(accountId, id)
  const result = getDatabase()
    .prepare(`UPDATE boards SET ${assignments.join(", ")} WHERE account_id = ? AND id = ?`)
    .run(...parameters)

  return result.changes > 0 ? getBoard(accountId, id) : undefined
}

export function getAllFolders(accountId: string): Folder[] {
  const rows = getDatabase()
    .prepare<[string], FolderRow>(`
      SELECT id, name, color, created_at, updated_at
      FROM folders
      WHERE account_id = ?
      ORDER BY updated_at DESC
    `)
    .all(accountId)

  return rows.map(folderFromRow)
}

export function getFolder(accountId: string, id: string): Folder | undefined {
  const row = getDatabase()
    .prepare<[string, string], FolderRow>(`
      SELECT id, name, color, created_at, updated_at
      FROM folders
      WHERE account_id = ? AND id = ?
    `)
    .get(accountId, id)

  return row ? folderFromRow(row) : undefined
}

export function saveFolder(accountId: string, folder: Folder): Folder | undefined {
  getDatabase()
    .prepare(`
      INSERT INTO folders (id, account_id, name, color, created_at, updated_at)
      VALUES (@id, @accountId, @name, @color, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        color = excluded.color,
        updated_at = excluded.updated_at
      WHERE folders.account_id = excluded.account_id
        AND excluded.updated_at >= folders.updated_at
    `)
    .run({
      id: folder.id,
      accountId,
      name: folder.name,
      color: folder.color ?? null,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    })

  return getFolder(accountId, folder.id)
}

export function deleteFolder(accountId: string, id: string): boolean {
  const database = getDatabase()
  const removeFolder = database.transaction(() => {
    database.prepare(`
      UPDATE boards
      SET folder_id = NULL, updated_at = ?
      WHERE account_id = ? AND folder_id = ?
    `).run(Date.now(), accountId, id)
    return database
      .prepare("DELETE FROM folders WHERE account_id = ? AND id = ?")
      .run(accountId, id).changes > 0
  })

  return removeFolder()
}

export function getFolderBoardCounts(accountId: string): Record<string, number> {
  const rows = getDatabase()
    .prepare<[string], CountRow>(`
      SELECT folder_id, COUNT(*) AS board_count
      FROM boards
      WHERE account_id = ? AND folder_id IS NOT NULL
      GROUP BY folder_id
    `)
    .all(accountId)

  return Object.fromEntries(rows.map((row) => [row.folder_id, row.board_count]))
}

export function getSettingValue(
  accountId: string,
  key: string
): { found: boolean; value?: unknown } {
  const row = getDatabase()
    .prepare<[string, string], SettingRow>(`
      SELECT value_json
      FROM settings
      WHERE account_id = ? AND key = ?
    `)
    .get(accountId, key)

  return row
    ? { found: true, value: JSON.parse(row.value_json) as unknown }
    : { found: false }
}

export function saveSettingValue(accountId: string, key: string, value: unknown): void {
  getDatabase()
    .prepare(`
      INSERT INTO settings (account_id, key, value_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `)
    .run(accountId, key, JSON.stringify(value), Date.now())
}
