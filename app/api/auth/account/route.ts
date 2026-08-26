import {
  deleteOtherSessions,
  isUsernameAvailable,
  updateAccountPassword,
  updateAccountUsername,
} from "@/lib/server/database"
import {
  getSessionToken,
  hashPassword,
  hashSessionToken,
  parsePassword,
  parseUsername,
  publicAccount,
  requireAuthenticatedAccount,
} from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"
import { RequestValidationError } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isUniqueUsernameError(error: unknown) {
  return error instanceof Error
    && error.message.includes("UNIQUE constraint failed: accounts.username_normalized")
}

export async function PATCH(request: Request) {
  try {
    const account = requireAuthenticatedAccount(request)
    const body = await request.json()
    if (!isRecord(body)) throw new RequestValidationError("The account update is invalid.")

    if ("username" in body && !("password" in body)) {
      if (account.isRoot) {
        return dataResponse({ error: "The root username cannot be changed." }, 403)
      }
      const { username, usernameNormalized } = parseUsername(body.username)
      if (!isUsernameAvailable(usernameNormalized, account.id)) {
        return dataResponse({ error: "That username is already taken." }, 409)
      }
      const updatedAccount = updateAccountUsername(account.id, username, usernameNormalized)
      return updatedAccount
        ? dataResponse({ account: publicAccount(updatedAccount) })
        : dataResponse({ error: "Account not found." }, 404)
    }

    if ("password" in body && !("username" in body)) {
      const password = parsePassword(body.password)
      if (!updateAccountPassword(account.id, hashPassword(password))) {
        return dataResponse({ error: "Account not found." }, 404)
      }
      const token = getSessionToken(request)
      if (token) deleteOtherSessions(account.id, hashSessionToken(token))
      return dataResponse({ saved: true })
    }

    throw new RequestValidationError("Change either the username or the password.")
  } catch (error) {
    if (isUniqueUsernameError(error)) {
      return dataResponse({ error: "That username is already taken." }, 409)
    }
    return routeError(error)
  }
}
