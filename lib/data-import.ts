"use client"

import { replaceDatabase, type ImportedDatabaseStore } from "@/lib/db"
import type { DataExportFormat } from "@/lib/data-export"

interface EncryptedExport {
  application: "GeckoDraw"
  encryptionVersion: 1
  format: DataExportFormat
  algorithm: "AES-GCM-256"
  keyDerivation: "PBKDF2-SHA-256"
  iterations: number
  salt: string
  iv: string
  data: string
}

const ENCRYPTION_ITERATIONS = 250_000

export class DataImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DataImportError"
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonExport(contents: string): ImportedDatabaseStore[] {
  let data: unknown

  try {
    data = JSON.parse(contents)
  } catch {
    throw new DataImportError("This is not a valid GeckoDraw JSON export.")
  }

  if (
    !isObject(data) ||
    data.application !== "GeckoDraw" ||
    data.database !== "GeckoDrawDB" ||
    data.exportVersion !== 1 ||
    !Array.isArray(data.stores) ||
    data.stores.length === 0
  ) {
    throw new DataImportError("This is not a supported GeckoDraw export.")
  }

  const seenStoreNames = new Set<string>()

  return data.stores.map((store): ImportedDatabaseStore => {
    if (!isObject(store) || typeof store.name !== "string" || !Array.isArray(store.records)) {
      throw new DataImportError("This GeckoDraw export contains invalid store data.")
    }
    if (seenStoreNames.has(store.name)) {
      throw new DataImportError("This GeckoDraw export contains duplicate store data.")
    }
    seenStoreNames.add(store.name)

    return {
      name: store.name,
      records: store.records.map((record) => {
        if (!isObject(record) || !("key" in record) || !("value" in record)) {
          throw new DataImportError("This GeckoDraw export contains an invalid record.")
        }

        return {
          key: record.key as IDBValidKey,
          value: record.value,
        }
      }),
    }
  })
}

function parseCsvRows(contents: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index]

    if (inQuotes) {
      if (character === '"' && contents[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        inQuotes = false
      } else {
        field += character
      }
    } else if (character === '"') {
      inQuotes = true
    } else if (character === ",") {
      row.push(field)
      field = ""
    } else if (character === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (character !== "\r") {
      field += character
    }
  }

  if (inQuotes) throw new DataImportError("This is not a valid GeckoDraw CSV export.")
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function parseCsvExport(contents: string): ImportedDatabaseStore[] {
  const rows = parseCsvRows(contents)

  if (
    rows.length === 0 ||
    rows[0].length !== 3 ||
    rows[0][0] !== "store" ||
    rows[0][1] !== "key" ||
    rows[0][2] !== "value"
  ) {
    throw new DataImportError("This is not a valid GeckoDraw CSV export.")
  }

  const stores = new Map<string, ImportedDatabaseStore>()

  for (const row of rows.slice(1)) {
    if (row.length !== 3 || !row[0]) {
      throw new DataImportError("This GeckoDraw CSV export contains an invalid record.")
    }

    let key: unknown
    let value: unknown
    try {
      key = JSON.parse(row[1])
      value = JSON.parse(row[2])
    } catch {
      throw new DataImportError("This GeckoDraw CSV export contains invalid record data.")
    }

    const store = stores.get(row[0]) ?? { name: row[0], records: [] }
    store.records.push({ key: key as IDBValidKey, value })
    stores.set(row[0], store)
  }

  if (stores.size === 0) {
    throw new DataImportError("This GeckoDraw CSV export does not contain any data stores.")
  }

  return Array.from(stores.values())
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  let binary: string
  try {
    binary = atob(value)
  } catch {
    throw new DataImportError("This encrypted GeckoDraw export is damaged.")
  }

  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function parseEncryptedExport(contents: string): EncryptedExport | undefined {
  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    return undefined
  }

  if (!isObject(value) || value.encryptionVersion === undefined) return undefined
  if (
    value.application !== "GeckoDraw" ||
    value.encryptionVersion !== 1 ||
    (value.format !== "json" && value.format !== "csv") ||
    value.algorithm !== "AES-GCM-256" ||
    value.keyDerivation !== "PBKDF2-SHA-256" ||
    value.iterations !== ENCRYPTION_ITERATIONS ||
    typeof value.salt !== "string" ||
    typeof value.iv !== "string" ||
    typeof value.data !== "string"
  ) {
    throw new DataImportError("This encrypted GeckoDraw export is not supported.")
  }

  return value as unknown as EncryptedExport
}

async function decryptExport(exportFile: EncryptedExport, password: string): Promise<string> {
  if (!password) {
    throw new DataImportError("Enter the password used to encrypt this export.")
  }

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(exportFile.salt),
      iterations: exportFile.iterations,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  )

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(exportFile.iv) },
      key,
      base64ToBytes(exportFile.data)
    )
    return new TextDecoder("utf-8", { fatal: true }).decode(decrypted)
  } catch {
    throw new DataImportError("The password is incorrect or the encrypted export is damaged.")
  }
}

function formatFromFileName(fileName: string): DataExportFormat | undefined {
  const unencryptedName = fileName.replace(/\.encrypted$/i, "").toLowerCase()
  if (unencryptedName.endsWith(".json")) return "json"
  if (unencryptedName.endsWith(".csv")) return "csv"
  return undefined
}

export async function importDataFile(file: File, password: string): Promise<void> {
  const fileContents = await file.text()
  const encryptedExport = parseEncryptedExport(fileContents)
  const format = encryptedExport?.format ?? formatFromFileName(file.name)
  const contents = encryptedExport
    ? await decryptExport(encryptedExport, password)
    : fileContents

  if (!format) {
    throw new DataImportError("Choose a GeckoDraw JSON, CSV, or encrypted export file.")
  }

  const stores = format === "json" ? parseJsonExport(contents) : parseCsvExport(contents)

  try {
    await replaceDatabase(stores)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The import contains")) {
      throw new DataImportError(error.message)
    }
    throw new DataImportError("The import could not be saved. Your current data was not changed.")
  }
}
