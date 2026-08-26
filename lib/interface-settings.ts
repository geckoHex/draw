"use client"

import { useSyncExternalStore } from "react"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export const DEFAULT_THEME: ThemePreference = "system"
export const DEFAULT_DARK_CANVAS = false

export const THEME_KEY = "draw.theme"
export const DARK_CANVAS_KEY = "draw.dark-canvas"

const THEME_EVENT = "draw:theme-change"
const DARK_CANVAS_EVENT = "draw:dark-canvas-change"
const DARK_MODE_QUERY = "(prefers-color-scheme: dark)"

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark"
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return DEFAULT_THEME

  const storedTheme = window.localStorage.getItem(THEME_KEY)
  return isThemePreference(storedTheme) ? storedTheme : DEFAULT_THEME
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

export function setThemePreference(theme: ThemePreference) {
  window.localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme === "system" ? undefined : theme)
  window.dispatchEvent(new Event(THEME_EVENT))
}

function subscribeToTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_MODE_QUERY)
  const handleThemeChange = () => {
    applyTheme()
    onStoreChange()
  }

  window.addEventListener("storage", handleThemeChange)
  window.addEventListener(THEME_EVENT, handleThemeChange)
  mediaQuery.addEventListener("change", handleThemeChange)

  return () => {
    window.removeEventListener("storage", handleThemeChange)
    window.removeEventListener(THEME_EVENT, handleThemeChange)
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
  if (typeof window === "undefined") return DEFAULT_DARK_CANVAS
  return window.localStorage.getItem(DARK_CANVAS_KEY) === "true"
}

export function setDarkCanvasPreference(value: boolean) {
  window.localStorage.setItem(DARK_CANVAS_KEY, String(value))
  window.dispatchEvent(new Event(DARK_CANVAS_EVENT))
}

function subscribeToDarkCanvas(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(DARK_CANVAS_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(DARK_CANVAS_EVENT, onStoreChange)
  }
}

export function useDarkCanvasPreference(): boolean {
  return useSyncExternalStore(
    subscribeToDarkCanvas,
    getDarkCanvasPreference,
    () => DEFAULT_DARK_CANVAS
  )
}

export function useDarkCanvas(): boolean {
  const preference = useDarkCanvasPreference()
  const resolvedTheme = useResolvedTheme()
  return resolvedTheme === "dark" && preference
}
