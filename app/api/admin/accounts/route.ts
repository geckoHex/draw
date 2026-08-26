import { createAccount, getAllAccounts, isUsernameAvailable } from "@/lib/server/database"
import {
  hashPassword,
  parsePassword,
  parseUsername,
  requireRootAccount,
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

export async function GET(request: Request) {
  try {
    requireRootAccount(request)
    return dataResponse({ accounts: getAllAccounts() })
  } catch (error) {
    return routeError(error)
  }
}

export async function POST(request: Request) {
  try {
    requireRootAccount(request)
    const body = await request.json()
    if (!isRecord(body)) throw new RequestValidationError("The account details are invalid.")

    const { username, usernameNormalized } = parseUsername(body.username)
    const password = parsePassword(body.password)
    if (usernameNormalized === "root") {
      return dataResponse({ error: "The root username is reserved." }, 409)
    }
    if (!isUsernameAvailable(usernameNormalized)) {
      return dataResponse({ error: "That username is already taken." }, 409)
    }

    const account = createAccount(username, usernameNormalized, hashPassword(password))
    return dataResponse({
      account: {
        id: account.id,
        username: account.username,
        isRoot: account.isRoot,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    }, 201)
  } catch (error) {
    if (isUniqueUsernameError(error)) {
      return dataResponse({ error: "That username is already taken." }, 409)
    }
    return routeError(error)
  }
}
