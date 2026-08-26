import { getAllFolders } from "@/lib/server/database"
import { requireAuthenticatedAccount } from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const account = requireAuthenticatedAccount(request)
    return dataResponse(getAllFolders(account.id))
  } catch (error) {
    return routeError(error)
  }
}
