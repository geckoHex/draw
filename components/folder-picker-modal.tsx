"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { type Folder } from "@/lib/db"
import { getFolderAccent, getFolderTint } from "@/lib/utils"

interface FolderPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (folderId: string | null) => void
  folders: Folder[]
  currentFolderId: string | null
}

export function FolderPickerModal({
  isOpen,
  onClose,
  onSelect,
  folders,
  currentFolderId,
}: FolderPickerModalProps) {
  const handleSelect = (folderId: string | null) => {
    onSelect(folderId)
    onClose()
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
      <div className="relative mx-4 w-full max-w-lg space-y-6 rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-2xl font-bold text-foreground">Move to Folder</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Folder List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {/* Root option */}
          <button
            onClick={() => handleSelect(null)}
            className={`w-full p-4 rounded-2xl text-left transition-all ${
              currentFolderId === null
                ? "border-2 border-ring/45 bg-accent"
                : "border-2 border-transparent bg-muted/45 hover:bg-accent/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <svg className="h-5 w-5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-foreground">All Boards</div>
                <div className="text-sm text-muted-foreground">Move to root</div>
              </div>
            </div>
          </button>

          {/* Folders */}
          {folders.length > 0 ? (
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleSelect(folder.id)}
                className={`w-full p-4 rounded-2xl text-left transition-all ${
                  currentFolderId === folder.id
                    ? "border-2 border-ring/45"
                    : "border-2 border-transparent hover:bg-accent/55"
                }`}
                style={{
                  backgroundColor: currentFolderId === folder.id 
                    ? getFolderTint(folder.color)
                    : 'transparent'
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: getFolderTint(folder.color, 13) }}
                  >
                    <svg className="w-5 h-5" fill={getFolderAccent(folder.color)} viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{folder.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {currentFolderId === folder.id ? "Current folder" : "Move here"}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No folders available</p>
              <p className="text-sm mt-1">Create a folder first to organize your boards</p>
            </div>
          )}
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
        </div>
      </div>
    </div>
  )
}
