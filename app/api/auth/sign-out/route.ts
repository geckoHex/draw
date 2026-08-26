import { clearSessionCookie, getSessionToken, hashSessionToken } from "@/lib/server/auth"
import { deleteSession } from "@/lib/server/database"
import { dataResponse, routeError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const token = getSessionToken(request)
    if (token) deleteSession(hashSessionToken(token))
    const response = dataResponse({ signedOut: true })
    clearSessionCookie(response)
    return response
  } catch (error) {
    return routeError(error)
  }
}
