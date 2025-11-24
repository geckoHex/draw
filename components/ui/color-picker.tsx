"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  triggerClassName?: string
}

const PRESET_COLORS = [
  "#000000", // Black
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#22C55E", // Green
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#0EA5E9", // Sky
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#F43F5E", // Rose
]

export function ColorPicker({ value, onChange, triggerClassName }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleColorChange = (color: string) => {
    onChange(color)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", triggerClassName)}
        >
          <div className="flex items-center gap-2 w-full">
            <div
              className="h-4 w-4 rounded border border-border"
              style={{ backgroundColor: value }}
            />
            <span className="flex-1 text-sm">Color</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)]" align="center">
        <div className="grid grid-cols-6 gap-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={cn(
                "h-6 w-6 rounded border-2 transition-all hover:scale-110",
                value === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              aria-label={color}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}