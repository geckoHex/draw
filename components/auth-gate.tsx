"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { Account } from "@/lib/data-types"
import { getAuthState } from "@/lib/auth-client"
import { AuthPage } from "@/components/auth-page"
import { RootSetupPage } from "@/components/root-setup-page"
import { AdminPanel } from "@/components/admin-panel"
import { ThemeManager } from "@/components/theme-manager"

interface AuthContextValue {
  account: Account
  setAccount: (account: Account) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthGate.")
  return context
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account>()
  const [returningAccount, setReturningAccount] = useState<Account>()
  const [setupRequired, setSetupRequired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    getAuthState()
      .then((state) => {
        if (state.authenticated) setAccount(state.account)
        else {
          setReturningAccount(state.returningAccount)
          setSetupRequired(state.setupRequired)
        }
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <main className="app-background flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    )
  }

  if (!account) {
    if (setupRequired) {
      return <RootSetupPage onAuthenticated={() => window.location.reload()} />
    }

    return (
      <>
        {loadFailed && (
          <p role="alert" className="fixed inset-x-6 top-6 z-10 text-center text-sm text-destructive">
            Gecko Draw could not reach the account database. Try reloading the page.
          </p>
        )}
        <AuthPage
          returningAccount={returningAccount}
          onAuthenticated={() => window.location.reload()}
        />
      </>
    )
  }

  return (
    <AuthContext.Provider value={{ account, setAccount }}>
      <ThemeManager />
      {account.isRoot ? <AdminPanel /> : children}
    </AuthContext.Provider>
  )
}
