"use client"

import { useEffect } from "react"
import { applyTheme, useResolvedTheme } from "@/lib/interface-settings"

export function ThemeManager() {
  const theme = useResolvedTheme()

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return null
}
