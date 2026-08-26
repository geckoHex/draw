import {
  deleteBoard,
  getBoard,
  saveBoard,
  updateBoard,
} from "@/lib/server/database"
import { dataResponse, routeError } from "@/lib/server/http"
import { parseBoard, parseBoardChanges } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const board = getBoard(id)
    return board
      ? dataResponse(board)
      : dataResponse({ error: "Board not found." }, 404)
  } catch (error) {
    return routeError(error)
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const board = parseBoard(await request.json(), id)
    return dataResponse(saveBoard(board))
  } catch (error) {
    return routeError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const board = updateBoard(id, parseBoardChanges(await request.json()))
    return board
      ? dataResponse(board)
      : dataResponse({ error: "Board not found." }, 404)
  } catch (error) {
    return routeError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    return dataResponse({ deleted: deleteBoard(id) })
  } catch (error) {
    return routeError(error)
  }
}
