"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { changePassword, changeUsername, signOut } from "@/lib/auth-client"
import { useUsernameAvailability } from "@/lib/use-username-availability"
import { useAuth } from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SaveState = "idle" | "saving" | "saved" | "error"

export function AccountSettings() {
  const { account, setAccount } = useAuth()
  const [username, setUsername] = useState(account.username)
  const [password, setPassword] = useState("")
  const [usernameState, setUsernameState] = useState<SaveState>("idle")
  const [passwordState, setPasswordState] = useState<SaveState>("idle")
  const [usernameError, setUsernameError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isSigningOut, setIsSigningOut] = useState(false)
  const availability = useUsernameAvailability(username)

  const saveUsername = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUsernameState("saving")
    setUsernameError("")
    try {
      const result = await changeUsername(username)
      setAccount(result.account)
      setUsername(result.account.username)
      setUsernameState("saved")
    } catch (error) {
      setUsernameState("error")
      setUsernameError(error instanceof Error ? error.message : "The username could not be changed.")
    }
  }

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordState("saving")
    setPasswordError("")
    try {
      await changePassword(password)
      setPassword("")
      setPasswordState("saved")
    } catch (error) {
      setPasswordState("error")
      setPasswordError(error instanceof Error ? error.message : "The password could not be changed.")
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      window.location.reload()
    } catch {
      setIsSigningOut(false)
    }
  }

  return (
    <section aria-labelledby="account-heading" className="max-w-xl">
      <h2 id="account-heading" className="sr-only">Account</h2>

      <form onSubmit={saveUsername}>
        <label htmlFor="account-username" className="text-sm font-semibold text-foreground">
          Username
        </label>
        <div className="mt-3 flex gap-3">
          <Input
            id="account-username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value)
              setUsernameState("idle")
              setUsernameError("")
            }}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={80}
            className="h-10 bg-background"
          />
          <Button
            type="submit"
            disabled={usernameState === "saving" || availability !== "available"}
            className="min-w-24"
          >
            {usernameState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
        <p
          aria-live="polite"
          className={availability === "available" || usernameState === "saved"
            ? "mt-2 min-h-5 text-xs text-emerald-600 dark:text-emerald-400"
            : availability === "taken" || availability === "error" || usernameState === "error"
              ? "mt-2 min-h-5 text-xs text-destructive"
              : "mt-2 min-h-5 text-xs text-muted-foreground"}
        >
          {usernameError
            || (usernameState === "saved" ? "Username changed."
              : availability === "checking" ? "Checking username…"
                : availability === "available" ? "Username is available."
                  : availability === "taken" ? "Username is already taken."
                    : availability === "error" ? "Could not check this username."
                      : "")}
        </p>
      </form>

      <form onSubmit={savePassword} className="mt-8">
        <label htmlFor="account-password" className="text-sm font-semibold text-foreground">
          New password
        </label>
        <div className="mt-3 flex gap-3">
          <Input
            id="account-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setPasswordState("idle")
              setPasswordError("")
            }}
            autoComplete="new-password"
            maxLength={1024}
            className="h-10 bg-background"
          />
          <Button
            type="submit"
            disabled={passwordState === "saving"}
            className="min-w-24"
          >
            {passwordState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
        <p
          role={passwordState === "error" ? "alert" : undefined}
          className={passwordState === "error"
            ? "mt-2 min-h-5 text-xs text-destructive"
            : "mt-2 min-h-5 text-xs text-emerald-600 dark:text-emerald-400"}
        >
          {passwordError || (passwordState === "saved" ? "Password changed." : "")}
        </p>
      </form>

      <Button
        type="button"
        variant="outline"
        disabled={isSigningOut}
        onClick={handleSignOut}
        className="mt-8"
      >
        {isSigningOut && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign out
      </Button>
    </section>
  )
}
