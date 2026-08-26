import { getBoardsByFolder, getRootBoards } from "@/lib/server/database"
import { requireAuthenticatedAccount } from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function parseNonNegativeInteger(value: string | null, fallback: number) {
  if (value === null) return fallback
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback
}

export async function GET(request: Request) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get("folder")

    if (folder && folder !== "root") {
      return dataResponse(getBoardsByFolder(account.id, folder))
    }

    const limit = Math.min(100, Math.max(1, parseNonNegativeInteger(searchParams.get("limit"), 20)))
    const offset = parseNonNegativeInteger(searchParams.get("offset"), 0)
    return dataResponse(getRootBoards(account.id, limit, offset))
  } catch (error) {
    return routeError(error)
  }
}
