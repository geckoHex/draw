import { createInitialRootAccount } from "@/lib/server/database"
import {
  hashPassword,
  issueSession,
  parsePassword,
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!isRecord(body)) throw new RequestValidationError("The root account details are invalid.")

    const password = parsePassword(body.password)
    const account = createInitialRootAccount(hashPassword(password))
    if (!account) {
      return dataResponse({ error: "Root setup is no longer available." }, 409)
    }

    const session = issueSession(account.id)
    const response = dataResponse({ account: publicAccount(account) }, 201)
    setSignedInCookies(response, session, account.id)
    return response
  } catch (error) {
    return routeError(error)
  }
}
