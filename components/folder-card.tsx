"use client"

import { Folder, MoreVertical, Trash2, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface FolderCardProps {
  id: string
  name: string
  color?: string
  boardCount: number
  onClick: () => void
  onDelete: () => void
  onRename: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

export function FolderCard({
  id,
  name,
  color = "#3b82f6",
  boardCount,
  onClick,
  onDelete,
  onRename,
  onDragOver,
  onDrop,
}: FolderCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDragOver) onDragOver(e)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDrop) onDrop(e)
  }

  return (
    <div
      className="group relative flex items-center gap-3 p-4 w-full rounded-2xl bg-white border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer"
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-folder-id={id}
    >
      {/* Folder Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}15` }}
      >
        <Folder className="h-6 w-6" style={{ color }} />
      </div>

      {/* Folder Info */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <h3 className="text-base font-semibold text-gray-900 truncate leading-tight" title={name}>
          {name}
        </h3>
        <span className="text-xs text-gray-500 font-medium">
          {boardCount} board{boardCount !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Menu */}
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setIsMenuOpen(!isMenuOpen)
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="end">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={(e) => {
                e.stopPropagation()
                setIsMenuOpen(false)
                onRename()
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation()
                setIsMenuOpen(false)
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}