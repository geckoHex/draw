"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ContextMenuPoint {
  x: number
  y: number
}

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "end"
  contextMenuPoint?: ContextMenuPoint | null
  onContextMenuClose?: () => void
}

const DropdownMenuContext = React.createContext<(() => void) | null>(null)

export function DropdownMenu({
  trigger,
  children,
  align = "start",
  contextMenuPoint = null,
  onContextMenuClose,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const virtualAnchorRef = React.useMemo(
    () => ({
      current: contextMenuPoint
        ? {
            getBoundingClientRect: () =>
              new DOMRect(contextMenuPoint.x, contextMenuPoint.y, 0, 0),
          }
        : null,
    }),
    [contextMenuPoint]
  )

  const closeMenu = React.useCallback(() => {
    setIsOpen(false)
    onContextMenuClose?.()
  }, [onContextMenuClose])

  return (
    <Popover
      open={contextMenuPoint !== null || isOpen}
      onOpenChange={(open) => {
        if (open) {
          setIsOpen(true)
        } else {
          closeMenu()
        }
      }}
    >
      {contextMenuPoint && <PopoverAnchor virtualRef={virtualAnchorRef} />}
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align={align}
        sideOffset={8}
        collisionPadding={8}
        className="w-48 rounded-xl p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuContext.Provider value={closeMenu}>
          <div className="flex flex-col gap-1">
            {children}
          </div>
        </DropdownMenuContext.Provider>
      </PopoverContent>
    </Popover>
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  variant?: "default" | "destructive"
  icon?: React.ReactNode
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  variant = "default",
  icon 
}: DropdownMenuItemProps) {
  const closeMenu = React.useContext(DropdownMenuContext)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.(event)
        closeMenu?.()
      }}
      className={cn(
        "flex h-8 w-full items-center justify-start gap-1.5 rounded-md px-3 text-left text-sm font-medium transition-colors",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
          : "text-popover-foreground hover:bg-accent"
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
