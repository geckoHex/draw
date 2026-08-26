"use client"

import { useState } from "react"
import { Check, ChevronDown, Laptop, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ThemePreference } from "@/lib/interface-settings"

interface ThemeSelectProps {
  value: ThemePreference
  onValueChange: (value: ThemePreference) => void
}

const options = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] satisfies Array<{
  value: ThemePreference
  label: string
  icon: typeof Laptop
}>

export function ThemeSelect({ value, onValueChange }: ThemeSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value) ?? options[0]
  const SelectedIcon = selected.icon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Theme"
          className="h-11 w-48 justify-between rounded-xl bg-card/70 px-3.5 shadow-none"
        >
          <span className="flex items-center gap-2.5">
            <SelectedIcon className="h-4 w-4 text-muted-foreground" />
            {selected.label}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-(--radix-popover-trigger-width) rounded-xl p-1.5">
        {options.map((option) => {
          const Icon = option.icon
          const isSelected = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onValueChange(option.value)
                setOpen(false)
              }}
              className={cn(
                "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                isSelected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/70"
              )}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{option.label}</span>
              {isSelected && <Check className="h-4 w-4" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
