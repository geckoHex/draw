"use client"

import { Folder, MoreVertical, Trash2, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { getFolderAccent, getFolderTint } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuItem,
  type ContextMenuPoint,
} from "@/components/ui/dropdown-menu"

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
  const [contextMenuPoint, setContextMenuPoint] = useState<ContextMenuPoint | null>(null)
  const accentColor = getFolderAccent(color)

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
      className="group relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card/90 p-4 shadow-sm transition-colors duration-200 hover:border-ring/45"
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setContextMenuPoint({ x: event.clientX, y: event.clientY })
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-folder-id={id}
    >
      {/* Folder Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: getFolderTint(color) }}
      >
        <Folder className="h-6 w-6" fill="currentColor" style={{ color: accentColor }} />
      </div>

      {/* Folder Info */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <h3 className="truncate text-base font-semibold leading-tight text-card-foreground" title={name}>
          {name}
        </h3>
        <span className="text-xs font-medium text-muted-foreground">
          {boardCount} board{boardCount !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Menu */}
      <DropdownMenu
        contextMenuPoint={contextMenuPoint}
        onContextMenuClose={() => setContextMenuPoint(null)}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="ipad-options-trigger h-9 w-9 shrink-0 rounded-xl text-muted-foreground opacity-0 transition-colors hover:bg-accent hover:text-foreground group-hover:opacity-100"
            aria-label={`Folder options for ${name}`}
            title="Folder options"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        }
      >
        <DropdownMenuItem icon={<Edit2 className="h-4 w-4" />} onClick={onRename}>
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={<Trash2 className="h-4 w-4" />}
          variant="destructive"
          onClick={onDelete}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  )
}
