"use client"

import { exportDatabase, type ExportedDatabase } from "@/lib/db"

export type DataExportFormat = "json" | "csv"

interface DownloadDataExportOptions {
  fileName: string
  format: DataExportFormat
  password: string
}

const ENCRYPTION_ITERATIONS = 250_000

function csvCell(value: unknown): string {
  return `"${String(value).replaceAll('"', '""')}"`
}

function serializeAsCsv(data: ExportedDatabase): string {
  const rows = [["store", "key", "value"]]

  for (const store of data.stores) {
    for (const record of store.records) {
      rows.push([store.name, JSON.stringify(record.key), JSON.stringify(record.value)])
    }
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
}

function serializeExport(data: ExportedDatabase, format: DataExportFormat): string {
  return format === "json" ? JSON.stringify(data, null, 2) : serializeAsCsv(data)
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ""

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  return btoa(binary)
}

async function encryptExport(contents: string, format: DataExportFormat, password: string) {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
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
      salt,
      iterations: ENCRYPTION_ITERATIONS,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(contents)
  )

  return JSON.stringify(
    {
      application: "GeckoDraw",
      encryptionVersion: 1,
      format,
      algorithm: "AES-GCM-256",
      keyDerivation: "PBKDF2-SHA-256",
      iterations: ENCRYPTION_ITERATIONS,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted)),
    },
    null,
    2
  )
}

function normalizedFileName(fileName: string): string {
  const withoutKnownExtension = fileName.trim().replace(/(?:\.(?:json|csv))?(?:\.encrypted)?$/i, "")
  const safeName = withoutKnownExtension
    .replace(/[\\/:*?"<>|%]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")

  return safeName || "geckodraw-backup"
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function downloadDataExport({
  fileName,
  format,
  password,
}: DownloadDataExportOptions): Promise<void> {
  const data = await exportDatabase()
  const serialized = serializeExport(data, format)
  const encrypted = password.length > 0
  const contents = encrypted ? await encryptExport(serialized, format, password) : serialized
  const extension = encrypted ? `${format}.encrypted` : format
  const mimeType = encrypted
    ? "application/octet-stream"
    : format === "json"
      ? "application/json"
      : "text/csv"

  downloadBlob(
    new Blob([contents], { type: `${mimeType};charset=utf-8` }),
    `${normalizedFileName(fileName)}.${extension}`
  )
}
