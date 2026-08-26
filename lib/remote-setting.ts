"use client"

import { getSettingValue, saveSettingValue } from "@/lib/data-client"

export function createRemoteSetting<T>(
  key: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T
) {
  const eventName = `geckodraw:setting-change:${key}`
  let currentValue = defaultValue
  let loaded = false
  let loadPromise: Promise<void> | undefined

  const emitChange = () => window.dispatchEvent(new Event(eventName))

  const load = () => {
    if (loaded) return Promise.resolve()

    loadPromise ??= getSettingValue<unknown>(key)
      .then((storedValue) => {
        currentValue = isValid(storedValue) ? storedValue : defaultValue
        loaded = true
        emitChange()
      })
      .catch((error) => {
        loadPromise = undefined
        console.error(`Failed to load GeckoDraw setting "${key}".`, error)
      })

    return loadPromise
  }

  return {
    getSnapshot: () => currentValue,
    load,
    set: async (value: T) => {
      await load()
      await saveSettingValue(key, value)
      currentValue = value
      emitChange()
    },
    subscribe: (onStoreChange: () => void) => {
      window.addEventListener(eventName, onStoreChange)
      void load()

      return () => window.removeEventListener(eventName, onStoreChange)
    },
  }
}
