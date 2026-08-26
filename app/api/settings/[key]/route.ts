import { getSettingValue, saveSettingValue } from "@/lib/server/database"
import { requireAuthenticatedAccount } from "@/lib/server/auth"
import { dataResponse, routeError } from "@/lib/server/http"
import { parseSetting, RequestValidationError } from "@/lib/server/validation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ key: string }>
}

function validateKey(key: string) {
  if (key.length === 0 || key.length > 200) {
    throw new RequestValidationError("The setting key is invalid.")
  }
  return key
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { key } = await context.params
    return dataResponse(getSettingValue(account.id, validateKey(key)))
  } catch (error) {
    return routeError(error)
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const account = requireAuthenticatedAccount(request)
    const { key } = await context.params
    saveSettingValue(account.id, validateKey(key), parseSetting(await request.json()))
    return dataResponse({ saved: true })
  } catch (error) {
    return routeError(error)
  }
}
