"use client"

import { useSyncExternalStore } from "react"

export const DEFAULT_PEN_SMOOTHING = 5
export const DEFAULT_SHOW_SAVE_STATUS = false

const PEN_SMOOTHING_KEY = "draw.pen-smoothing"
const PEN_SMOOTHING_EVENT = "draw:pen-smoothing-change"
const SHOW_SAVE_STATUS_KEY = "draw.show-save-status"
const SHOW_SAVE_STATUS_EVENT = "draw:show-save-status-change"

function normalizePenSmoothing(value: number) {
  return Math.min(10, Math.max(1, Math.round(value)))
}

export function getPenSmoothing() {
  if (typeof window === "undefined") return DEFAULT_PEN_SMOOTHING

  const storedValue = Number(window.localStorage.getItem(PEN_SMOOTHING_KEY))
  return Number.isFinite(storedValue)
    ? normalizePenSmoothing(storedValue)
    : DEFAULT_PEN_SMOOTHING
}

export function setPenSmoothing(value: number) {
  const normalizedValue = normalizePenSmoothing(value)
  window.localStorage.setItem(PEN_SMOOTHING_KEY, String(normalizedValue))
  window.dispatchEvent(new Event(PEN_SMOOTHING_EVENT))
}

function subscribeToPenSmoothing(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(PEN_SMOOTHING_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(PEN_SMOOTHING_EVENT, onStoreChange)
  }
}

export function usePenSmoothing() {
  return useSyncExternalStore(
    subscribeToPenSmoothing,
    getPenSmoothing,
    () => DEFAULT_PEN_SMOOTHING
  )
}

export function getShowSaveStatus() {
  if (typeof window === "undefined") return DEFAULT_SHOW_SAVE_STATUS

  return window.localStorage.getItem(SHOW_SAVE_STATUS_KEY) === "true"
}

export function setShowSaveStatus(value: boolean) {
  window.localStorage.setItem(SHOW_SAVE_STATUS_KEY, String(value))
  window.dispatchEvent(new Event(SHOW_SAVE_STATUS_EVENT))
}

function subscribeToShowSaveStatus(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener(SHOW_SAVE_STATUS_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener(SHOW_SAVE_STATUS_EVENT, onStoreChange)
  }
}

export function useShowSaveStatus() {
  return useSyncExternalStore(
    subscribeToShowSaveStatus,
    getShowSaveStatus,
    () => DEFAULT_SHOW_SAVE_STATUS
  )
}

export function getSmoothingFactor(level: number) {
  if (level <= 1) return 0
  if (level <= DEFAULT_PEN_SMOOTHING) {
    return ((level - 1) / (DEFAULT_PEN_SMOOTHING - 1)) * 0.15
  }

  return 0.15 + ((level - DEFAULT_PEN_SMOOTHING) / (10 - DEFAULT_PEN_SMOOTHING)) * 0.6
}
