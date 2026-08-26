import { deleteFolder, getFolder, saveFolder } from "@/lib/server/database"
import { dataResponse, routeError } from "@/lib/server/http"
import { parseFolder } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const folder = getFolder(id)
    return folder
      ? dataResponse(folder)
      : dataResponse({ error: "Folder not found." }, 404)
  } catch (error) {
    return routeError(error)
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const folder = parseFolder(await request.json(), id)
    return dataResponse(saveFolder(folder))
  } catch (error) {
    return routeError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    return dataResponse({ deleted: deleteFolder(id) })
  } catch (error) {
    return routeError(error)
  }
}
