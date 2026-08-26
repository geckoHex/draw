"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SettingToggle } from "@/components/ui/setting-toggle"
import { Slider } from "@/components/ui/slider"
import { ThemeSelect } from "@/components/ui/theme-select"
import { cn } from "@/lib/utils"
import {
  setPenSmoothing,
  setShowSaveStatus,
  usePenSmoothing,
  useShowSaveStatus,
} from "@/lib/drawing-settings"
import {
  setDarkCanvasPreference,
  setThemePreference,
  useDarkCanvasPreference,
  useResolvedTheme,
  useThemePreference,
} from "@/lib/interface-settings"

type SettingsTab = "drawing" | "interface"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("drawing")
  const penSmoothing = usePenSmoothing()
  const showSaveStatus = useShowSaveStatus()
  const theme = useThemePreference()
  const resolvedTheme = useResolvedTheme()
  const darkCanvasPreference = useDarkCanvasPreference()
  const darkCanvasAvailable = resolvedTheme === "dark"
  const darkCanvas = darkCanvasAvailable && darkCanvasPreference

  return (
    <main className="app-background min-h-screen px-6 py-8 md:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to boards"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        </div>

        <nav aria-label="Settings groups" className="mb-10 flex border-b border-border">
          {(["drawing", "interface"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "border-b-2 px-4 pb-3 text-sm font-semibold capitalize transition-colors",
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "drawing" && (
          <section aria-labelledby="pen-smoothing-heading" className="max-w-xl">
            <h2 id="pen-smoothing-heading" className="mb-5 text-sm font-semibold text-foreground">
              Pen smoothing
            </h2>
            <Slider
              aria-label="Pen smoothing"
              value={[penSmoothing]}
              onValueChange={([value]) => setPenSmoothing(value)}
              min={1}
              max={10}
              step={1}
              className="w-full"
              thumbClassName="border-2 border-foreground bg-background shadow-none hover:ring-0"
            />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>None</span>
              <span>Heavy</span>
            </div>

            <div className="mt-8 flex items-center justify-between gap-6">
              <label htmlFor="show-save-status" className="text-sm font-semibold text-foreground">
                Show save status
              </label>
              <SettingToggle
                id="show-save-status"
                label="Show save status"
                checked={showSaveStatus}
                onCheckedChange={setShowSaveStatus}
              />
            </div>
          </section>
        )}

        {activeTab === "interface" && (
          <section aria-labelledby="interface-heading" className="max-w-xl">
            <h2 id="interface-heading" className="sr-only">Interface</h2>

            <div className="flex items-center justify-between gap-6">
              <label className="text-sm font-semibold text-foreground">Theme</label>
              <ThemeSelect value={theme} onValueChange={setThemePreference} />
            </div>

            <div className="mt-8 flex items-center justify-between gap-6">
              <label
                htmlFor="dark-canvas"
                className={cn(
                  "text-sm font-semibold",
                  darkCanvasAvailable ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Dark canvas
              </label>
              <SettingToggle
                id="dark-canvas"
                label="Dark canvas"
                checked={darkCanvas}
                disabled={!darkCanvasAvailable}
                onCheckedChange={setDarkCanvasPreference}
              />
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
