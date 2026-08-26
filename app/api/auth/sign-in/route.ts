import { getAccountByNormalizedUsername } from "@/lib/server/database"
import {
  issueSession,
  parsePassword,
  parseUsername,
  publicAccount,
  setSignedInCookies,
  verifyPassword,
} from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"
import { RequestValidationError } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!isRecord(body)) throw new RequestValidationError("The sign-in details are invalid.")

    const { usernameNormalized } = parseUsername(body.username)
    const password = parsePassword(body.password)
    const account = getAccountByNormalizedUsername(usernameNormalized)
    if (!account || !verifyPassword(password, account.passwordHash)) {
      return dataResponse({ error: "Username or password is incorrect." }, 401)
    }

    const session = issueSession(account.id)
    const response = dataResponse({ account: publicAccount(account) })
    setSignedInCookies(response, session, account.id)
    return response
  } catch (error) {
    return routeError(error)
  }
}
