"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, color: string) => void
  initialName?: string
  initialColor?: string
  title?: string
}

const FOLDER_COLORS = [
  { name: "Black (Default)", value: "#000000" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Yellow", value: "#eab308" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#a855f7" },
]

export function FolderModal({
  isOpen,
  onClose,
  onSave,
  initialName = "",
  initialColor = "#000000",
  title = "Create New Folder",
}: FolderModalProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const animationFrame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [isOpen])

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), color)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-modal-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose()
        }}
      >
        <div className="mb-5 pr-10">
          <h2
            id="folder-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            {title}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Close folder dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSave()
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor="folder-name"
              className="block text-sm font-medium text-gray-700"
            >
              Folder Name
            </label>
            <Input
              ref={inputRef}
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work Projects, Personal, Archive..."
              className="h-11 rounded-xl px-3.5 text-base"
            />
          </div>

          <fieldset className="mt-5 space-y-2">
            <legend className="text-sm font-medium text-gray-700">
              Choose Color
            </legend>
            <div className="grid grid-cols-7 gap-2 rounded-xl bg-gray-50 p-3">
              {FOLDER_COLORS.map((folderColor) => (
                <button
                  key={folderColor.value}
                  type="button"
                  onClick={() => setColor(folderColor.value)}
                  className={`aspect-square w-full rounded-lg transition-opacity hover:opacity-85 ${
                    color === folderColor.value
                      ? "ring-2 ring-gray-900 ring-offset-2 ring-offset-gray-50"
                      : ""
                  }`}
                  style={{ backgroundColor: folderColor.value }}
                  aria-label={`Select ${folderColor.name}`}
                  aria-pressed={color === folderColor.value}
                />
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 flex-1 rounded-xl shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="h-10 flex-1 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:cursor-not-allowed"
            >
              {initialName ? "Save Changes" : "Create Folder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
