import { getAuthenticatedAccount, normalizeUsername } from "@/lib/server/auth"
import { isUsernameAvailable } from "@/lib/server/database"
import { dataResponse, routeError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const username = new URL(request.url).searchParams.get("username") ?? ""
    const normalized = normalizeUsername(username)
    const account = getAuthenticatedAccount(request)
    return dataResponse({
      available: normalized.length > 0
        && username.trim().length <= 80
        && isUsernameAvailable(normalized, account?.id),
    })
  } catch (error) {
    return routeError(error)
  }
}
