import {
  deleteAccount,
  deleteOtherSessions,
  deleteSessionsForAccount,
  getAccountById,
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
  requireRootAccount,
} from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"
import { RequestValidationError } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isUniqueUsernameError(error: unknown) {
  return error instanceof Error
    && error.message.includes("UNIQUE constraint failed: accounts.username_normalized")
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const rootAccount = requireRootAccount(request)
    const { id } = await context.params
    const existingAccount = getAccountById(id)
    if (!existingAccount) return dataResponse({ error: "Account not found." }, 404)

    const body = await request.json()
    if (!isRecord(body)) throw new RequestValidationError("The account update is invalid.")
    const hasUsername = "username" in body
    const hasPassword = "password" in body
    if (!hasUsername && !hasPassword) {
      throw new RequestValidationError("Change the username, password, or both.")
    }

    let usernameUpdate: ReturnType<typeof parseUsername> | undefined
    if (hasUsername) {
      if (existingAccount.isRoot) {
        return dataResponse({ error: "The root username cannot be changed." }, 403)
      }
      usernameUpdate = parseUsername(body.username)
      if (usernameUpdate.usernameNormalized === "root") {
        return dataResponse({ error: "The root username is reserved." }, 409)
      }
      if (!isUsernameAvailable(usernameUpdate.usernameNormalized, id)) {
        return dataResponse({ error: "That username is already taken." }, 409)
      }
    }

    const password = hasPassword ? parsePassword(body.password) : undefined
    if (usernameUpdate) {
      updateAccountUsername(id, usernameUpdate.username, usernameUpdate.usernameNormalized)
    }
    if (password !== undefined) {
      updateAccountPassword(id, hashPassword(password))
      const currentToken = getSessionToken(request)
      if (id === rootAccount.id && currentToken) {
        deleteOtherSessions(id, hashSessionToken(currentToken))
      } else {
        deleteSessionsForAccount(id)
      }
    }

    const account = getAccountById(id)
    return account
      ? dataResponse({
          account: {
            id: account.id,
            username: account.username,
            isRoot: account.isRoot,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
        })
      : dataResponse({ error: "Account not found." }, 404)
  } catch (error) {
    if (isUniqueUsernameError(error)) {
      return dataResponse({ error: "That username is already taken." }, 409)
    }
    return routeError(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireRootAccount(request)
    const { id } = await context.params
    const account = getAccountById(id)
    if (!account) return dataResponse({ error: "Account not found." }, 404)
    if (account.isRoot) {
      return dataResponse({ error: "The root account cannot be deleted." }, 403)
    }

    return dataResponse({ deleted: deleteAccount(id) })
  } catch (error) {
    return routeError(error)
  }
}
