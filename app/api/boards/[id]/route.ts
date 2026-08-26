import {
  deleteBoard,
  getBoard,
  saveBoard,
  updateBoard,
} from "@/lib/server/database"
import { requireAuthenticatedAccount } from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"
import { parseBoard, parseBoardChanges } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { id } = await context.params
    const board = getBoard(account.id, id)
    return board
      ? dataResponse(board)
      : dataResponse({ error: "Board not found." }, 404)
  } catch (error) {
    return routeError(error)
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { id } = await context.params
    const board = parseBoard(await request.json(), id)
    const savedBoard = saveBoard(account.id, board)
    return savedBoard
      ? dataResponse(savedBoard)
      : dataResponse({ error: "The board could not be saved." }, 400)
  } catch (error) {
    return routeError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { id } = await context.params
    const board = updateBoard(account.id, id, parseBoardChanges(await request.json()))
    return board
      ? dataResponse(board)
      : dataResponse({ error: "Board not found." }, 404)
  } catch (error) {
    return routeError(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { id } = await context.params
    return dataResponse({ deleted: deleteBoard(account.id, id) })
  } catch (error) {
    return routeError(error)
  }
}
