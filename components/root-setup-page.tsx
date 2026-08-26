"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { setupRootAccount } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function RootSetupPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    if (password !== confirmation) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await setupRootAccount(password)
      onAuthenticated()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Root setup failed.")
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-background flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-center gap-3">
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

        <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
          Create root account
        </h1>
        <p className="mb-8 mt-3 text-center text-sm text-muted-foreground">
          Choose the password for the administrator account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="setup-username" className="text-sm font-semibold text-foreground">
              Username
            </label>
            <Input
              id="setup-username"
              value="root"
              disabled
              className="h-12 rounded-xl bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="setup-password" className="text-sm font-semibold text-foreground">
              Password
            </label>
            <Input
              id="setup-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError("")
              }}
              autoComplete="new-password"
              maxLength={1024}
              autoFocus
              className="h-12 rounded-xl bg-background"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="setup-confirm-password" className="text-sm font-semibold text-foreground">
              Confirm password
            </label>
            <Input
              id="setup-confirm-password"
              type="password"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value)
                setError("")
              }}
              autoComplete="new-password"
              maxLength={1024}
              className="h-12 rounded-xl bg-background"
            />
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={isSubmitting || password.length === 0 || confirmation.length === 0}
            className="h-12 w-full rounded-xl"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create root account
          </Button>
        </form>
      </div>
    </main>
  )
}
