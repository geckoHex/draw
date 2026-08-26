"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  triggerClassName?: string
  darkCanvas?: boolean
}

const ACCENT_COLORS = [
  { name: "Salmon", value: "#EF4444" },
  { name: "Orange", value: "#F97316" },
  { name: "Tangerine", value: "#F59E0B" },
  { name: "Lemon", value: "#EAB308" },
  { name: "Lime", value: "#84CC16" },
  { name: "Sea Foam", value: "#22C55E" },
  { name: "Mint", value: "#10B981" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Sky", value: "#06B6D4" },
  { name: "Lake", value: "#0EA5E9" },
  { name: "Ocean", value: "#3B82F6" },
  { name: "Lavender", value: "#6366F1" },
  { name: "Ube", value: "#8B5CF6" },
  { name: "Violet", value: "#A855F7" },
  { name: "Pink", value: "#D946EF" },
  { name: "Radish", value: "#EC4899" },
  { name: "Rose", value: "#F43F5E" },
]

export function ColorPicker({ value, onChange, triggerClassName, darkCanvas = false }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)
  const presetColors = React.useMemo(
    () => [
      darkCanvas
        ? { name: "White", value: "#FFFFFF" }
        : { name: "Black", value: "#000000" },
      ...ACCENT_COLORS,
    ],
    [darkCanvas]
  )
  const selectedColor = presetColors.find((color) => color.value.toLowerCase() === value.toLowerCase())

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
            <span className="flex-1 text-sm">{selectedColor?.name ?? "Color"}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width)" align="center">
        <div className="grid grid-cols-6 gap-3">
          {presetColors.map((color) => (
            <div key={color.value} className="group relative">
              <button
                className={cn(
                  "h-6 w-6 rounded border-2 transition-colors",
                  value.toLowerCase() === color.value.toLowerCase()
                    ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-popover"
                    : "border-border/60"
                )}
                style={{ backgroundColor: color.value }}
                onClick={() => handleColorChange(color.value)}
                aria-label={`Select ${color.name}`}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity delay-0 duration-150 group-hover:delay-1000 group-hover:opacity-100"
              >
                {color.name}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
