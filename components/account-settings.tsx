"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { signOut } from "@/lib/auth-client"
import { useAuth } from "@/components/auth-gate"
import { AccountChangeModal, type AccountChange } from "@/components/account-change-modal"
import { Button } from "@/components/ui/button"

export function AccountSettings() {
  const { account, setAccount } = useAuth()
  const [activeChange, setActiveChange] = useState<AccountChange>()
  const [isSigningOut, setIsSigningOut] = useState(false)

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

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-semibold text-foreground">Username</span>
          <Button type="button" variant="outline" onClick={() => setActiveChange("username")}>
            Change username
          </Button>
        </div>

        <div className="flex items-center justify-between gap-6">
          <span className="text-sm font-semibold text-foreground">Password</span>
          <Button type="button" variant="outline" onClick={() => setActiveChange("password")}>
            Change password
          </Button>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={isSigningOut}
        onClick={handleSignOut}
        className="mt-10"
      >
        {isSigningOut && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign out
      </Button>

      {activeChange && (
        <AccountChangeModal
          change={activeChange}
          currentUsername={account.username}
          onClose={() => setActiveChange(undefined)}
          onUsernameChanged={setAccount}
        />
      )}
    </section>
  )
}
