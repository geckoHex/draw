import "server-only"

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import type { NextResponse } from "next/server"
import type { Account } from "@/lib/data-types"
import {
  createSession,
  getAccountBySession,
  type AuthenticatedAccount,
} from "@/lib/server/database"
import { RequestValidationError } from "@/lib/server/validation"

export const SESSION_COOKIE_NAME = "geckodraw_session"
export const LAST_ACCOUNT_COOKIE_NAME = "geckodraw_last_account"
export const SESSION_DURATION_SECONDS = 24 * 60 * 60

const LAST_ACCOUNT_DURATION_SECONDS = 400 * 24 * 60 * 60
const MAX_USERNAME_LENGTH = 80
const MAX_PASSWORD_LENGTH = 1024

export class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}

function parseCookies(request: Request) {
  const cookies = new Map<string, string>()
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=")
    if (separator < 0) continue
    const key = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    try {
      cookies.set(key, decodeURIComponent(value))
    } catch {
      cookies.set(key, value)
    }
  }
  return cookies
}

export function normalizeUsername(username: string) {
  return username.trim().normalize("NFKC").toLocaleLowerCase("en-US")
}

export function parseUsername(value: unknown) {
  if (typeof value !== "string") {
    throw new RequestValidationError("Enter a username.")
  }
  const username = value.trim()
  if (username.length === 0 || username.length > MAX_USERNAME_LENGTH) {
    throw new RequestValidationError("Enter a username between 1 and 80 characters.")
  }
  return { username, usernameNormalized: normalizeUsername(username) }
}

export function parsePassword(value: unknown) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_PASSWORD_LENGTH) {
    throw new RequestValidationError("Enter a password.")
  }
  return value
}

export function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derivedKey = scryptSync(password, salt, 64)
  return `scrypt:${salt.toString("base64url")}:${derivedKey.toString("base64url")}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, encodedSalt, encodedHash] = storedHash.split(":")
  if (algorithm !== "scrypt" || !encodedSalt || !encodedHash) return false

  try {
    const salt = Buffer.from(encodedSalt, "base64url")
    const expected = Buffer.from(encodedHash, "base64url")
    const actual = scryptSync(password, salt, expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64url")
}

export function getSessionToken(request: Request) {
  return parseCookies(request).get(SESSION_COOKIE_NAME)
}

export function getLastAccountId(request: Request) {
  return parseCookies(request).get(LAST_ACCOUNT_COOKIE_NAME)
}

export function getAuthenticatedAccount(request: Request): AuthenticatedAccount | undefined {
  const token = getSessionToken(request)
  return token ? getAccountBySession(hashSessionToken(token)) : undefined
}

export function requireAuthenticatedAccount(request: Request) {
  const account = getAuthenticatedAccount(request)
  if (!account) throw new AuthenticationError("Sign in to continue.")
  return account
}

export function requireRootAccount(request: Request) {
  const account = requireAuthenticatedAccount(request)
  if (!account.isRoot) throw new AuthorizationError("Root access is required.")
  return account
}

export function publicAccount(account: Account): Account {
  return { id: account.id, username: account.username, isRoot: account.isRoot }
}

export function issueSession(accountId: string) {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000
  createSession(hashSessionToken(token), accountId, expiresAt)
  return { token, expiresAt }
}

export function setSignedInCookies(
  response: NextResponse,
  session: { token: string; expiresAt: number },
  accountId: string
) {
  response.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  })
  response.cookies.set(LAST_ACCOUNT_COOKIE_NAME, accountId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: LAST_ACCOUNT_DURATION_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}
