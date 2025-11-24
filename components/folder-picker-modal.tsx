"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { type Folder } from "@/lib/db"

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
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-2xl font-bold text-gray-900">Move to Folder</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl hover:bg-gray-100"
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
                ? "bg-gray-100 border-2 border-gray-300"
                : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">All Boards</div>
                <div className="text-sm text-gray-500">Move to root</div>
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
                    ? "border-2 border-gray-300"
                    : "hover:bg-gray-50 border-2 border-transparent"
                }`}
                style={{
                  backgroundColor: currentFolderId === folder.id 
                    ? `${folder.color}15` 
                    : 'transparent'
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${folder.color}20` }}
                  >
                    <svg className="w-5 h-5" fill={folder.color} viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{folder.name}</div>
                    <div className="text-sm text-gray-500">
                      {currentFolderId === folder.id ? "Current folder" : "Move here"}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
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