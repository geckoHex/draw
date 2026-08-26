import { cn } from "@/lib/utils"

interface SettingToggleProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label: string
}

export function SettingToggle({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  label,
}: SettingToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        checked ? "bg-primary" : "bg-muted-foreground/35"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform",
          checked
            ? "translate-x-5 bg-primary-foreground"
            : "translate-x-0 bg-background dark:bg-foreground"
        )}
      />
    </button>
  )
}
