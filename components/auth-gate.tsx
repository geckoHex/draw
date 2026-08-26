"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Image from "next/image"
import { GlobeX, Loader2 } from "lucide-react"
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
    if (loadFailed) {
      return (
        <main className="app-background flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-center gap-3.5">
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

            <section
              aria-labelledby="server-offline-title"
              className="glass-surface rounded-3xl border px-8 py-10 text-center backdrop-blur-xl sm:px-10"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background/70">
                <GlobeX className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
              </div>
              <h1
                id="server-offline-title"
                className="mt-7 text-3xl font-bold tracking-tight text-foreground"
              >
                Service Offline
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
                Either the server is offline or can&apos;t be reached right now.
              </p>
            </section>
          </div>
        </main>
      )
    }

    if (setupRequired) {
      return <RootSetupPage onAuthenticated={() => window.location.reload()} />
    }

    return (
      <AuthPage
        returningAccount={returningAccount}
        onAuthenticated={() => window.location.reload()}
      />
    )
  }

  return (
    <AuthContext.Provider value={{ account, setAccount }}>
      <ThemeManager />
      {account.isRoot ? <AdminPanel /> : children}
    </AuthContext.Provider>
  )
}
