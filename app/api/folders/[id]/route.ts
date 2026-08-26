import { deleteFolder, getFolder, saveFolder } from "@/lib/server/database"
import { requireAuthenticatedAccount } from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"
import { parseFolder } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { id } = await context.params
    const folder = getFolder(account.id, id)
    return folder
      ? dataResponse(folder)
      : dataResponse({ error: "Folder not found." }, 404)
  } catch (error) {
    return routeError(error)
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { id } = await context.params
    const folder = parseFolder(await request.json(), id)
    const savedFolder = saveFolder(account.id, folder)
    return savedFolder
      ? dataResponse(savedFolder)
      : dataResponse({ error: "The folder could not be saved." }, 400)
  } catch (error) {
    return routeError(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { id } = await context.params
    return dataResponse({ deleted: deleteFolder(account.id, id) })
  } catch (error) {
    return routeError(error)
  }
}
