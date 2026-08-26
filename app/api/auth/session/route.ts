import { getAccountById, hasAnyAccounts } from "@/lib/server/database"
import {
  clearSessionCookie,
  getAuthenticatedAccount,
  getLastAccountId,
  getSessionToken,
  publicAccount,
} from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const account = getAuthenticatedAccount(request)
    if (account) {
      return dataResponse({ authenticated: true, account: publicAccount(account) })
    }

    const lastAccountId = getLastAccountId(request)
    const returningAccount = lastAccountId ? getAccountById(lastAccountId) : undefined
    const response = dataResponse({
      authenticated: false,
      setupRequired: !hasAnyAccounts(),
      returningAccount: returningAccount ? publicAccount(returningAccount) : undefined,
    })
    if (getSessionToken(request)) clearSessionCookie(response)
    return response
  } catch (error) {
    return routeError(error)
  }
}
