import { getFolderBoardCounts } from "@/lib/server/database"
import { dataResponse, routeError } from "@/lib/server/http"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    return dataResponse(getFolderBoardCounts())
  } catch (error) {
    return routeError(error)
  }
}
