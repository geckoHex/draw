"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface RenameBoardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  initialName: string
}

export function RenameBoardModal({
  isOpen,
  onClose,
  onSave,
  initialName,
}: RenameBoardModalProps) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
    }
  }, [isOpen, initialName])

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-2xl font-bold text-gray-900">Rename Board</h2>
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
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">
            Board Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter board name..."
            className="h-14 rounded-2xl text-base px-4"
            autoFocus
          />
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
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}