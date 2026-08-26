"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import type { AdminAccount } from "@/lib/data-types"
import { deleteAdminAccount, getAdminAccounts, signOut } from "@/lib/auth-client"
import { AccountEditorModal } from "@/components/account-editor-modal"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { Button } from "@/components/ui/button"

export function AdminPanel() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>()
  const [accountToDelete, setAccountToDelete] = useState<AdminAccount>()
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAdminAccounts()
      .then((result) => {
        if (cancelled) return
        setAccounts(result.accounts)
        setError("")
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Accounts could not be loaded.")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaved = (savedAccount: AdminAccount) => {
    setAccounts((current) => {
      const exists = current.some((account) => account.id === savedAccount.id)
      const next = exists
        ? current.map((account) => account.id === savedAccount.id ? savedAccount : account)
        : [...current, savedAccount]
      return next.sort((left, right) => {
        if (left.isRoot !== right.isRoot) return left.isRoot ? -1 : 1
        return left.username.localeCompare(right.username)
      })
    })
    setError("")
  }

  const handleDelete = async () => {
    if (!accountToDelete) return
    const account = accountToDelete
    setAccountToDelete(undefined)
    try {
      await deleteAdminAccount(account.id)
      setAccounts((current) => current.filter((item) => item.id !== account.id))
      setError("")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The account could not be deleted.")
    }
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      window.location.reload()
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Sign out failed.")
      setIsSigningOut(false)
    }
  }

  return (
    <main className="app-background min-h-screen px-6 py-8 md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/images/Gecko.png"
              alt=""
              width={1145}
              height={1374}
              className="h-10 w-auto"
              priority
            />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Gecko Draw</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" disabled={isSigningOut} onClick={handleSignOut}>
              {isSigningOut && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign out
            </Button>
            <Button type="button" onClick={() => setEditingAccount(null)}>
              <Plus className="h-4 w-4" />
              Create account
            </Button>
          </div>
        </header>

        <div className="mt-12 flex items-end justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Users</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">Username</th>
                  <th scope="col" className="px-5 py-3">Created</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {account.username}
                      {account.isRoot && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Root</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(account.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${account.username}`}
                          onClick={() => setEditingAccount(account)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!account.isRoot && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${account.username}`}
                            onClick={() => setAccountToDelete(account)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingAccount !== undefined && (
        <AccountEditorModal
          account={editingAccount ?? undefined}
          onClose={() => setEditingAccount(undefined)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmModal
        isOpen={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(undefined)}
        onConfirm={handleDelete}
        title="Delete account?"
        description={accountToDelete
          ? `Delete ${accountToDelete.username} and all of their boards, folders, and settings? This cannot be undone.`
          : ""}
        confirmText="Delete"
        variant="destructive"
      />
    </main>
  )
}
