import type { Board, Folder, Point, Stroke } from "@/lib/data-types"

export class RequestValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isTimestamp(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function parsePoint(value: unknown): Point {
  if (!isRecord(value) || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RequestValidationError("A stroke contains an invalid point.")
  }
  return { x: Number(value.x), y: Number(value.y) }
}

function parseStroke(value: unknown): Stroke {
  if (
    !isRecord(value)
    || !Array.isArray(value.points)
    || typeof value.color !== "string"
    || value.color.length > 100
    || !Number.isFinite(value.size)
    || Number(value.size) <= 0
    || (value.tool !== "pen" && value.tool !== "eraser")
  ) {
    throw new RequestValidationError("The board contains an invalid stroke.")
  }

  return {
    points: value.points.map(parsePoint),
    color: value.color,
    size: Number(value.size),
    tool: value.tool,
  }
}

export function parseBoard(value: unknown, expectedId: string): Board {
  if (
    !isRecord(value)
    || value.id !== expectedId
    || typeof value.title !== "string"
    || value.title.length > 500
    || !isTimestamp(value.createdAt)
    || !isTimestamp(value.updatedAt)
    || !Array.isArray(value.strokes)
    || !(value.folderId === null || typeof value.folderId === "string")
  ) {
    throw new RequestValidationError("The board data is invalid.")
  }

  return {
    id: expectedId,
    title: value.title,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    strokes: value.strokes.map(parseStroke),
    folderId: value.folderId,
  }
}

export function parseFolder(value: unknown, expectedId: string): Folder {
  if (
    !isRecord(value)
    || value.id !== expectedId
    || typeof value.name !== "string"
    || value.name.trim().length === 0
    || value.name.length > 500
    || !(value.color === undefined || typeof value.color === "string")
    || !isTimestamp(value.createdAt)
    || !isTimestamp(value.updatedAt)
  ) {
    throw new RequestValidationError("The folder data is invalid.")
  }

  return {
    id: expectedId,
    name: value.name,
    color: value.color,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

export function parseBoardChanges(value: unknown): { title?: string; folderId?: string | null } {
  if (!isRecord(value)) throw new RequestValidationError("The board update is invalid.")

  const changes: { title?: string; folderId?: string | null } = {}

  if ("title" in value) {
    if (typeof value.title !== "string" || value.title.trim().length === 0 || value.title.length > 500) {
      throw new RequestValidationError("The board title is invalid.")
    }
    changes.title = value.title
  }

  if ("folderId" in value) {
    if (!(value.folderId === null || typeof value.folderId === "string")) {
      throw new RequestValidationError("The folder selection is invalid.")
    }
    changes.folderId = value.folderId
  }

  if (!("title" in changes) && !("folderId" in changes)) {
    throw new RequestValidationError("The board update is empty.")
  }

  return changes
}

export function parseSetting(value: unknown): unknown {
  if (!isRecord(value) || !("value" in value) || value.value === undefined) {
    throw new RequestValidationError("The setting value is invalid.")
  }
  return value.value
}
