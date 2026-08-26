"use client"

import type { Account } from "@/lib/data-types"

export type AuthState =
  | { authenticated: true; account: Account }
  | { authenticated: false; returningAccount?: Account }

async function authRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { error?: string } | undefined
    throw new Error(body?.error ?? `GeckoDraw request failed with status ${response.status}.`)
  }

  return response.json() as Promise<T>
}

export function getAuthState() {
  return authRequest<AuthState>("/api/auth/session")
}

export function signIn(username: string, password: string) {
  return authRequest<{ account: Account }>("/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

export function signUp(username: string, password: string) {
  return authRequest<{ account: Account }>("/api/auth/sign-up", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

export function checkUsernameAvailability(username: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ username })
  return authRequest<{ available: boolean }>(`/api/auth/username?${query}`, { signal })
}

export function changeUsername(username: string) {
  return authRequest<{ account: Account }>("/api/auth/account", {
    method: "PATCH",
    body: JSON.stringify({ username }),
  })
}

export function changePassword(password: string) {
  return authRequest<{ saved: true }>("/api/auth/account", {
    method: "PATCH",
    body: JSON.stringify({ password }),
  })
}

export function signOut() {
  return authRequest<{ signedOut: true }>("/api/auth/sign-out", { method: "POST" })
}
