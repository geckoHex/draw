import "server-only"

import Database from "better-sqlite3"
import { mkdirSync, readFileSync } from "node:fs"
import path from "node:path"
import type { Board, Folder, Stroke } from "@/lib/data-types"

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

declare global {
  var geckoDrawDatabase: Database.Database | undefined
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
    strokes: JSON.parse(row.strokes_json) as Stroke[],
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

export function getBoard(id: string): Board | undefined {
  const row = getDatabase()
    .prepare<[string], BoardRow>(`
      SELECT id, title, created_at, updated_at, strokes_json, folder_id
      FROM boards
      WHERE id = ?
    `)
    .get(id)

  return row ? boardFromRow(row) : undefined
}

export function saveBoard(board: Board): Board {
  getDatabase()
    .prepare(`
      INSERT INTO boards (id, title, created_at, updated_at, strokes_json, folder_id)
      VALUES (@id, @title, @createdAt, @updatedAt, @strokesJson, @folderId)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at,
        strokes_json = excluded.strokes_json,
        folder_id = excluded.folder_id
      WHERE excluded.updated_at >= boards.updated_at
    `)
    .run({
      id: board.id,
      title: board.title,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      strokesJson: JSON.stringify(board.strokes),
      folderId: board.folderId,
    })

  return getBoard(board.id) as Board
}

export function getRootBoards(limit: number, offset: number): Board[] {
  const rows = getDatabase()
    .prepare<[number, number], BoardRow>(`
      SELECT id, title, created_at, updated_at, strokes_json, folder_id
      FROM boards
      WHERE folder_id IS NULL
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset)

  return rows.map(boardFromRow)
}

export function getBoardsByFolder(folderId: string): Board[] {
  const rows = getDatabase()
    .prepare<[string], BoardRow>(`
      SELECT id, title, created_at, updated_at, strokes_json, folder_id
      FROM boards
      WHERE folder_id = ?
      ORDER BY updated_at DESC
    `)
    .all(folderId)

  return rows.map(boardFromRow)
}

export function deleteBoard(id: string): boolean {
  return getDatabase().prepare("DELETE FROM boards WHERE id = ?").run(id).changes > 0
}

export function updateBoard(
  id: string,
  changes: { title?: string; folderId?: string | null }
): Board | undefined {
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

  parameters.push(id)
  const result = getDatabase()
    .prepare(`UPDATE boards SET ${assignments.join(", ")} WHERE id = ?`)
    .run(...parameters)

  return result.changes > 0 ? getBoard(id) : undefined
}

export function getAllFolders(): Folder[] {
  const rows = getDatabase()
    .prepare<[], FolderRow>(`
      SELECT id, name, color, created_at, updated_at
      FROM folders
      ORDER BY updated_at DESC
    `)
    .all()

  return rows.map(folderFromRow)
}

export function getFolder(id: string): Folder | undefined {
  const row = getDatabase()
    .prepare<[string], FolderRow>(`
      SELECT id, name, color, created_at, updated_at
      FROM folders
      WHERE id = ?
    `)
    .get(id)

  return row ? folderFromRow(row) : undefined
}

export function saveFolder(folder: Folder): Folder {
  getDatabase()
    .prepare(`
      INSERT INTO folders (id, name, color, created_at, updated_at)
      VALUES (@id, @name, @color, @createdAt, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        color = excluded.color,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= folders.updated_at
    `)
    .run({
      id: folder.id,
      name: folder.name,
      color: folder.color ?? null,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    })

  return getFolder(folder.id) as Folder
}

export function deleteFolder(id: string): boolean {
  const database = getDatabase()
  const removeFolder = database.transaction(() => {
    database
      .prepare("UPDATE boards SET folder_id = NULL, updated_at = ? WHERE folder_id = ?")
      .run(Date.now(), id)
    return database.prepare("DELETE FROM folders WHERE id = ?").run(id).changes > 0
  })

  return removeFolder()
}

export function getFolderBoardCounts(): Record<string, number> {
  const rows = getDatabase()
    .prepare<[], CountRow>(`
      SELECT folder_id, COUNT(*) AS board_count
      FROM boards
      WHERE folder_id IS NOT NULL
      GROUP BY folder_id
    `)
    .all()

  return Object.fromEntries(rows.map((row) => [row.folder_id, row.board_count]))
}

export function getSettingValue(key: string): { found: boolean; value?: unknown } {
  const row = getDatabase()
    .prepare<[string], SettingRow>("SELECT value_json FROM settings WHERE key = ?")
    .get(key)

  return row
    ? { found: true, value: JSON.parse(row.value_json) as unknown }
    : { found: false }
}

export function saveSettingValue(key: string, value: unknown): void {
  getDatabase()
    .prepare(`
      INSERT INTO settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `)
    .run(key, JSON.stringify(value), Date.now())
}
