"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "end"
}

export function DropdownMenu({ trigger, children, align = "end" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={(e) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
      }}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 w-48 rounded-xl bg-white shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in-0 zoom-in-95",
            align === "end" ? "right-0" : "left-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
                onClick: (e: React.MouseEvent) => {
                  e.stopPropagation()
                  const childProps = child.props as { onClick?: (e: React.MouseEvent) => void }
                  if (childProps.onClick) {
                    childProps.onClick(e)
                  }
                  setIsOpen(false)
                }
              })
            }
            return child
          })}
        </div>
      )}
    </div>
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-3",
        variant === "destructive"
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-50"
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}