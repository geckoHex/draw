"use client"

import { useSyncExternalStore } from "react"
import { createIndexedDBSetting } from "@/lib/indexeddb-setting"

export const DEFAULT_PEN_SMOOTHING = 5
export const DEFAULT_SHOW_SAVE_STATUS = false

const penSmoothingSetting = createIndexedDBSetting<number>(
  "draw.pen-smoothing",
  DEFAULT_PEN_SMOOTHING,
  (value): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 10
)

const showSaveStatusSetting = createIndexedDBSetting<boolean>(
  "draw.show-save-status",
  DEFAULT_SHOW_SAVE_STATUS,
  (value): value is boolean => typeof value === "boolean"
)

function normalizePenSmoothing(value: number) {
  return Math.min(10, Math.max(1, Math.round(value)))
}

export function getPenSmoothing() {
  return penSmoothingSetting.getSnapshot()
}

export function setPenSmoothing(value: number) {
  return penSmoothingSetting.set(normalizePenSmoothing(value))
}

export function usePenSmoothing() {
  return useSyncExternalStore(
    penSmoothingSetting.subscribe,
    penSmoothingSetting.getSnapshot,
    () => DEFAULT_PEN_SMOOTHING
  )
}

export function getShowSaveStatus() {
  return showSaveStatusSetting.getSnapshot()
}

export function setShowSaveStatus(value: boolean) {
  return showSaveStatusSetting.set(value)
}

export function useShowSaveStatus() {
  return useSyncExternalStore(
    showSaveStatusSetting.subscribe,
    showSaveStatusSetting.getSnapshot,
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
