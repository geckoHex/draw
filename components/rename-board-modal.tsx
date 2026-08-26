"use client"

import { useEffect, useRef, useState } from "react"
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const animationFrame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [initialName, isOpen])

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
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
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-board-title"
      >
        <div className="mb-5 pr-10">
          <h2
            id="rename-board-title"
            className="text-xl font-semibold text-foreground"
          >
            Rename Board
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close rename board dialog"
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
              htmlFor="board-name"
              className="block text-sm font-medium text-foreground"
            >
              Board Name
            </label>
            <Input
              ref={inputRef}
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter board name..."
              className="h-11 rounded-xl px-3.5 text-base"
            />
          </div>

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
              className="h-10 flex-1 rounded-xl disabled:cursor-not-allowed"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
