"use client"

import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import type { Account } from "@/lib/data-types"
import { changePassword, changeUsername } from "@/lib/auth-client"
import { useUsernameAvailability } from "@/lib/use-username-availability"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type AccountChange = "username" | "password"

interface AccountChangeModalProps {
  change: AccountChange
  currentUsername: string
  onClose: () => void
  onUsernameChanged: (account: Account) => void
}

export function AccountChangeModal({
  change,
  currentUsername,
  onClose,
  onUsernameChanged,
}: AccountChangeModalProps) {
  const [value, setValue] = useState(change === "username" ? currentUsername : "")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const isUsernameChange = change === "username"
  const trimmedValue = value.trim()
  const availability = useUsernameAvailability(value, isUsernameChange)
  const usernameUnchanged = isUsernameChange && trimmedValue === currentUsername

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [onClose])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    try {
      if (isUsernameChange) {
        const result = await changeUsername(value)
        onUsernameChanged(result.account)
      } else {
        await changePassword(value)
      }
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `The ${change} could not be changed.`)
      setIsSaving(false)
    }
  }

  const usernameUnavailable = isUsernameChange
    && (usernameUnchanged || availability !== "available")

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-5 py-8 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-change-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close change ${change} dialog`}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="account-change-title" className="pr-10 text-xl font-semibold text-foreground">
          Change {change}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6">
          <div className="space-y-2">
            <label htmlFor={`new-${change}`} className="block text-sm font-medium text-foreground">
              New {change}
            </label>
            <Input
              id={`new-${change}`}
              type={isUsernameChange ? "text" : "password"}
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setError("")
              }}
              autoComplete={isUsernameChange ? "username" : "new-password"}
              autoCapitalize={isUsernameChange ? "none" : undefined}
              spellCheck={isUsernameChange ? false : undefined}
              maxLength={isUsernameChange ? 80 : 1024}
              autoFocus
              className="h-11 rounded-xl px-3.5 text-base"
            />
          </div>

          {isUsernameChange && !usernameUnchanged && trimmedValue && (
            <p
              aria-live="polite"
              className={availability === "available"
                ? "mt-2 text-xs text-emerald-600 dark:text-emerald-400"
                : availability === "taken" || availability === "error"
                  ? "mt-2 text-xs text-destructive"
                  : "mt-2 text-xs text-muted-foreground"}
            >
              {availability === "checking" && "Checking username…"}
              {availability === "available" && "Username is available."}
              {availability === "taken" && "Username is already taken."}
              {availability === "error" && "Could not check this username."}
            </p>
          )}

          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 flex-1 rounded-xl shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || usernameUnavailable}
              className="h-10 flex-1 rounded-xl"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
