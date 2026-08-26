import Database from "better-sqlite3"
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, "..")
const dataDirectory = path.join(projectRoot, "data")
const databasePath = path.join(dataDirectory, "geckodraw.sqlite3")
const schemaPath = path.join(projectRoot, "database", "schema.sql")

function inspectExistingDatabase() {
  if (!existsSync(databasePath)) return undefined

  try {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true })
    const tableNames = new Set(
      database
        .prepare("SELECT name FROM sqlite_schema WHERE type = 'table'")
        .all()
        .map((row) => row.name)
    )
    const counts = {
      accounts: tableNames.has("accounts") ? database.prepare("SELECT COUNT(*) AS count FROM accounts").get().count : 0,
      boards: tableNames.has("boards") ? database.prepare("SELECT COUNT(*) AS count FROM boards").get().count : 0,
      folders: tableNames.has("folders") ? database.prepare("SELECT COUNT(*) AS count FROM folders").get().count : 0,
      settings: tableNames.has("settings") ? database.prepare("SELECT COUNT(*) AS count FROM settings").get().count : 0,
    }
    database.close()
    return counts
  } catch {
    return null
  }
}

async function confirmReset(existingData) {
  if (existingData === undefined) return true

  const summary = existingData
    ? `${existingData.accounts} account(s), ${existingData.boards} board(s), ${existingData.folders} folder(s), and ${existingData.settings} setting(s)`
    : "an existing database file"

  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await prompt.question(
    `GeckoDraw found ${summary}. Reinitializing permanently deletes it.\nType RESET to continue: `
  )
  prompt.close()
  return answer.trim() === "RESET"
}

function removeDatabaseFiles() {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const filePath = `${databasePath}${suffix}`
    if (existsSync(filePath)) unlinkSync(filePath)
  }
}

const existingData = inspectExistingDatabase()
if (!(await confirmReset(existingData))) {
  console.log("Database setup cancelled. No data was changed.")
  process.exit(0)
}

mkdirSync(dataDirectory, { recursive: true })
removeDatabaseFiles()

const database = new Database(databasePath, { timeout: 5_000 })
database.pragma("journal_mode = WAL")
database.pragma("foreign_keys = ON")
database.pragma("synchronous = NORMAL")
database.exec(readFileSync(schemaPath, "utf8"))
database.close()

console.log(`GeckoDraw database initialized at ${path.relative(projectRoot, databasePath)}.`)
