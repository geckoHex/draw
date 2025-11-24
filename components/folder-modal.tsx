"use client"

import { useState, useEffect } from "react"
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
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // green
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
]

export function FolderModal({
  isOpen,
  onClose,
  onSave,
  initialName = "",
  initialColor = "#3b82f6",
  title = "Create New Folder",
}: FolderModalProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)

  // Reset state when modal opens
  const handleOpen = () => {
    setName(initialName)
    setColor(initialColor)
  }

  useEffect(() => {
    if (isOpen) {
      handleOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), color)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Folder Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Work Projects, Personal, Archive..."
              className="h-14 rounded-2xl text-base px-4"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Choose Color
            </label>
            <div className="grid grid-cols-8 gap-3 p-4 bg-gray-50 rounded-2xl">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-12 h-12 rounded-xl transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-gray-50 scale-110 shadow-lg"
                      : "hover:scale-105 hover:shadow-md"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-14 rounded-2xl text-base font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 h-14 rounded-2xl text-base font-medium bg-gradient-to-r from-gray-900 to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialName ? "Save Changes" : "Create Folder"}
          </Button>
        </div>
      </div>
    </div>
  )
}