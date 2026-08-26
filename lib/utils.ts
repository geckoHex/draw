import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFolderAccent(color?: string) {
  return !color || color.toLowerCase() === "#000000" ? "var(--foreground)" : color
}

export function getFolderTint(color?: string, amount = 9) {
  return `color-mix(in oklab, ${getFolderAccent(color)} ${amount}%, transparent)`
}
