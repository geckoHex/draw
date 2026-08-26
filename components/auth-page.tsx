"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import type { Account } from "@/lib/data-types"
import { signIn, signUp } from "@/lib/auth-client"
import { useUsernameAvailability } from "@/lib/use-username-availability"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AuthPageProps {
  returningAccount?: Account
  onAuthenticated: () => void
}

export function AuthPage({ returningAccount, onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [useReturningAccount, setUseReturningAccount] = useState(Boolean(returningAccount))
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const availability = useUsernameAvailability(username, mode === "sign-up")
  const returning = mode === "sign-in" && useReturningAccount ? returningAccount : undefined

  const switchMode = (nextMode: "sign-in" | "sign-up") => {
    setMode(nextMode)
    setUseReturningAccount(false)
    setUsername("")
    setPassword("")
    setError("")
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const submittedUsername = returning?.username ?? username
      if (mode === "sign-up") {
        await signUp(submittedUsername, password)
      } else {
        await signIn(submittedUsername, password)
      }
      onAuthenticated()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The request failed.")
      setIsSubmitting(false)
    }
  }

  const signUpDisabled = mode === "sign-up" && availability !== "available"

  return (
    <main className="app-background flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-12 flex items-center justify-center gap-3.5">
          <Image
            src="/images/Gecko.png"
            alt="Gecko Draw"
            width={1145}
            height={1374}
            className="h-12 w-auto"
            priority
          />
          <span className="text-2xl font-bold tracking-tight text-foreground">Gecko Draw</span>
        </div>

        <h1 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground">
          {returning
            ? `Welcome back, ${returning.username}`
            : mode === "sign-up"
              ? "Create account"
              : "Sign in"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!returning && (
            <div className="space-y-2.5">
              <label htmlFor="auth-username" className="block text-sm font-semibold text-foreground">
                Username
              </label>
              <Input
                id="auth-username"
                name="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                  setError("")
                }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={80}
                autoFocus
                className="h-14 rounded-2xl bg-background px-4 text-base shadow-xs"
              />
              {mode === "sign-up" && (
                <div className="min-h-4">
                  {username.trim() && (
                    <p
                      aria-live="polite"
                      className={availability === "available"
                        ? "text-xs text-emerald-600 dark:text-emerald-400"
                        : availability === "taken" || availability === "error"
                          ? "text-xs text-destructive"
                          : "text-xs text-muted-foreground"}
                    >
                      {availability === "checking" && "Checking username…"}
                      {availability === "available" && "Username is available."}
                      {availability === "taken" && "Username is already taken."}
                      {availability === "error" && "Could not check this username."}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <label htmlFor="auth-password" className="block text-sm font-semibold text-foreground">
              Password
            </label>
            <Input
              id="auth-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError("")
              }}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              maxLength={1024}
              autoFocus={Boolean(returning)}
              className="h-14 rounded-2xl bg-background px-4 text-base shadow-xs"
            />
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={isSubmitting || signUpDisabled}
            className="h-14 w-full rounded-2xl text-base"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-9 text-center">
          {returning ? (
            <button
              type="button"
              onClick={() => {
                setUseReturningAccount(false)
                setPassword("")
                setError("")
              }}
              className="inline-flex h-11 items-center px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Switch account
            </button>
          ) : mode === "sign-in" ? (
            <button
              type="button"
              onClick={() => switchMode("sign-up")}
              className="inline-flex h-11 items-center px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Sign up instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode("sign-in")}
              className="inline-flex h-11 items-center px-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Sign in instead
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
