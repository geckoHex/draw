import { NextResponse } from "next/server"
import { AuthenticationError } from "@/lib/server/auth"
import { RequestValidationError } from "@/lib/server/validation"

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
}

export function dataResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE_HEADERS })
}

export function routeError(error: unknown) {
  if (error instanceof AuthenticationError) {
    return dataResponse({ error: error.message }, 401)
  }

  if (error instanceof RequestValidationError) {
    return dataResponse({ error: error.message }, 400)
  }

  if (error instanceof SyntaxError) {
    return dataResponse({ error: "The request body is not valid JSON." }, 400)
  }

  if (
    error instanceof Error
    && (error.message.includes("FOREIGN KEY constraint failed")
      || error.message.includes("CHECK constraint failed"))
  ) {
    return dataResponse({ error: "The request references invalid data." }, 400)
  }

  console.error("GeckoDraw data request failed.", error)
  return dataResponse({ error: "The database request failed." }, 500)
}
