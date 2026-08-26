"use client"

import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import type { AdminAccount } from "@/lib/data-types"
import { createAdminAccount, updateAdminAccount } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AccountEditorModalProps {
  account?: AdminAccount
  onClose: () => void
  onSaved: (account: AdminAccount) => void
}

export function AccountEditorModal({ account, onClose, onSaved }: AccountEditorModalProps) {
  const [username, setUsername] = useState(account?.username ?? "")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(account)

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
      const result = account
        ? await updateAdminAccount(account.id, {
            ...(!account.isRoot && username.trim() !== account.username
              ? { username }
              : {}),
            ...(password ? { password } : {}),
          })
        : await createAdminAccount(username, password)
      onSaved(result.account)
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The account could not be saved.")
      setIsSaving(false)
    }
  }

  const hasChanges = account
    ? password.length > 0 || (!account.isRoot && username.trim() !== account.username)
    : username.trim().length > 0 && password.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-editor-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close account editor"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="account-editor-title" className="pr-8 text-xl font-semibold text-foreground">
          {isEditing ? "Edit account" : "Create account"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="admin-username" className="text-sm font-semibold text-foreground">
              Username
            </label>
            <Input
              id="admin-username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setError("")
              }}
              disabled={account?.isRoot}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={80}
              autoFocus={!account?.isRoot}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-sm font-semibold text-foreground">
              {isEditing ? "New password" : "Password"}
            </label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError("")
              }}
              autoComplete="new-password"
              maxLength={1024}
              autoFocus={Boolean(account?.isRoot)}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">Leave blank to keep the current password.</p>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !hasChanges} className="flex-1">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
