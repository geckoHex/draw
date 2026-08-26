import { createAccount, isUsernameAvailable } from "@/lib/server/database"
import {
  hashPassword,
  issueSession,
  parsePassword,
  parseUsername,
  publicAccount,
  setSignedInCookies,
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!isRecord(body)) throw new RequestValidationError("The account details are invalid.")

    const { username, usernameNormalized } = parseUsername(body.username)
    const password = parsePassword(body.password)
    if (!isUsernameAvailable(usernameNormalized)) {
      return dataResponse({ error: "That username is already taken." }, 409)
    }

    const account = createAccount(username, usernameNormalized, hashPassword(password))
    const session = issueSession(account.id)
    const response = dataResponse({ account: publicAccount(account) }, 201)
    setSignedInCookies(response, session, account.id)
    return response
  } catch (error) {
    if (isUniqueUsernameError(error)) {
      return dataResponse({ error: "That username is already taken." }, 409)
    }
    return routeError(error)
  }
}
