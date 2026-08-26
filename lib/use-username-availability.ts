"use client"

import { useEffect, useState } from "react"
import { checkUsernameAvailability } from "@/lib/auth-client"

export type UsernameAvailability = "idle" | "checking" | "available" | "taken" | "error"

export function useUsernameAvailability(username: string, enabled = true) {
  const [result, setResult] = useState<{
    username: string
    status: Exclude<UsernameAvailability, "idle" | "checking">
  }>({ username: "", status: "error" })
  const trimmedUsername = username.trim()
  const shouldCheck = enabled && trimmedUsername.length > 0 && trimmedUsername.length <= 80

  useEffect(() => {
    if (!shouldCheck) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      checkUsernameAvailability(trimmedUsername, controller.signal)
        .then(({ available }) => setResult({
          username: trimmedUsername,
          status: available ? "available" : "taken",
        }))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          setResult({ username: trimmedUsername, status: "error" })
        })
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [shouldCheck, trimmedUsername])

  if (!shouldCheck) return "idle"
  return result.username === trimmedUsername ? result.status : "checking"
}
