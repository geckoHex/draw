"use client"

import type { Board, Folder } from "@/lib/data-types"

interface SettingResponse<T> {
  found: boolean
  value?: T
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })

  if (response.status === 401) {
    window.location.reload()
    throw new Error("Your sign-in has expired.")
  }

  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { error?: string } | undefined
    throw new Error(body?.error ?? `GeckoDraw request failed with status ${response.status}.`)
  }

  return response.json() as Promise<T>
}

export async function getSettingValue<T>(key: string): Promise<T | undefined> {
  const response = await request<SettingResponse<T>>(`/api/settings/${encodeURIComponent(key)}`)
  return response.found ? response.value : undefined
}

export function saveSettingValue<T>(key: string, value: T): Promise<void> {
  return request<void>(`/api/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  })
}

export function saveBoard(board: Board): Promise<Board> {
  return request<Board>(`/api/boards/${encodeURIComponent(board.id)}`, {
    method: "PUT",
    body: JSON.stringify(board),
  })
}

export async function getBoard(id: string): Promise<Board | undefined> {
  const response = await fetch(`/api/boards/${encodeURIComponent(id)}`, { cache: "no-store" })
  if (response.status === 401) {
    window.location.reload()
    throw new Error("Your sign-in has expired.")
  }
  if (response.status === 404) return undefined
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { error?: string } | undefined
    throw new Error(body?.error ?? `GeckoDraw request failed with status ${response.status}.`)
  }
  return response.json() as Promise<Board>
}

export function getRootBoardsPaginated(limit: number, offset: number): Promise<Board[]> {
  const query = new URLSearchParams({
    folder: "root",
    limit: String(limit),
    offset: String(offset),
  })
  return request<Board[]>(`/api/boards?${query}`)
}

export function getFolderBoardCounts(): Promise<Record<string, number>> {
  return request<Record<string, number>>("/api/folders/counts")
}

export function deleteBoard(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/boards/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export function renameBoard(boardId: string, newTitle: string): Promise<Board> {
  return request<Board>(`/api/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title: newTitle }),
  })
}

export function moveBoardToFolder(boardId: string, folderId: string | null): Promise<Board> {
  return request<Board>(`/api/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    body: JSON.stringify({ folderId }),
  })
}

export function saveFolder(folder: Folder): Promise<Folder> {
  return request<Folder>(`/api/folders/${encodeURIComponent(folder.id)}`, {
    method: "PUT",
    body: JSON.stringify(folder),
  })
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  const response = await fetch(`/api/folders/${encodeURIComponent(id)}`, { cache: "no-store" })
  if (response.status === 401) {
    window.location.reload()
    throw new Error("Your sign-in has expired.")
  }
  if (response.status === 404) return undefined
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { error?: string } | undefined
    throw new Error(body?.error ?? `GeckoDraw request failed with status ${response.status}.`)
  }
  return response.json() as Promise<Folder>
}

export function getAllFolders(): Promise<Folder[]> {
  return request<Folder[]>("/api/folders")
}

export function deleteFolder(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/api/folders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

export function getBoardsByFolder(folderId: string): Promise<Board[]> {
  const query = new URLSearchParams({ folder: folderId })
  return request<Board[]>(`/api/boards?${query}`)
}

export type { Board, Folder, Point, Stroke } from "@/lib/data-types"
