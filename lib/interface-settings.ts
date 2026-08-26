"use client"

import { useSyncExternalStore } from "react"
import { createIndexedDBSetting } from "@/lib/indexeddb-setting"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export const DEFAULT_THEME: ThemePreference = "system"
export const DEFAULT_DARK_CANVAS = false

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)"

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark"
}

const themeSetting = createIndexedDBSetting<ThemePreference>(
  "draw.theme",
  DEFAULT_THEME,
  isThemePreference
)

const darkCanvasSetting = createIndexedDBSetting<boolean>(
  "draw.dark-canvas",
  DEFAULT_DARK_CANVAS,
  (value): value is boolean => typeof value === "boolean"
)

export function getThemePreference(): ThemePreference {
  return themeSetting.getSnapshot()
}

export function getResolvedTheme(): ResolvedTheme {
  const preference = getThemePreference()
  if (preference !== "system") return preference
  if (typeof window === "undefined") return "light"

  return window.matchMedia(DARK_MODE_QUERY).matches ? "dark" : "light"
}

export function applyTheme(theme = getResolvedTheme()) {
  if (typeof document === "undefined") return

  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.dataset.theme = theme
  root.style.colorScheme = theme

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  themeColor?.setAttribute("content", theme === "dark" ? "#15171d" : "#f8fafc")
}

export async function setThemePreference(theme: ThemePreference) {
  await themeSetting.set(theme)
  applyTheme(theme === "system" ? undefined : theme)
}

function subscribeToTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_MODE_QUERY)
  const handleThemeChange = () => {
    applyTheme()
    onStoreChange()
  }

  const unsubscribe = themeSetting.subscribe(handleThemeChange)
  mediaQuery.addEventListener("change", handleThemeChange)

  return () => {
    unsubscribe()
    mediaQuery.removeEventListener("change", handleThemeChange)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeToTheme, getThemePreference, () => DEFAULT_THEME)
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribeToTheme,
    getResolvedTheme,
    (): ResolvedTheme => "light"
  )
}

export function getDarkCanvasPreference() {
  return darkCanvasSetting.getSnapshot()
}

export function setDarkCanvasPreference(value: boolean) {
  return darkCanvasSetting.set(value)
}

export function useDarkCanvasPreference(): boolean {
  return useSyncExternalStore(
    darkCanvasSetting.subscribe,
    darkCanvasSetting.getSnapshot,
    () => DEFAULT_DARK_CANVAS
  )
}

export function useDarkCanvas(): boolean {
  const preference = useDarkCanvasPreference()
  const resolvedTheme = useResolvedTheme()
  return resolvedTheme === "dark" && preference
}
