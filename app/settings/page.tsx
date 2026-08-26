"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import {
  setPenSmoothing,
  setShowSaveStatus,
  usePenSmoothing,
  useShowSaveStatus,
} from "@/lib/drawing-settings"

export default function SettingsPage() {
  const penSmoothing = usePenSmoothing()
  const showSaveStatus = useShowSaveStatus()

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-purple-50/20 px-6 py-8 md:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to boards"
            className="rounded-lg p-2 text-gray-600 hover:bg-white/70 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        </div>

        <nav aria-label="Settings groups" className="mb-10 flex border-b border-gray-200">
          <button
            type="button"
            aria-current="page"
            className="border-b-2 border-gray-900 px-4 pb-3 text-sm font-semibold text-gray-900"
          >
            Drawing
          </button>
        </nav>

        <section aria-labelledby="pen-smoothing-heading" className="max-w-xl">
          <h2 id="pen-smoothing-heading" className="mb-5 text-sm font-semibold text-gray-900">
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
            thumbClassName="border-2 border-gray-900 bg-white shadow-none hover:ring-0"
          />
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>None</span>
            <span>Heavy</span>
          </div>

          <div className="mt-8 flex items-center justify-between gap-6">
            <label htmlFor="show-save-status" className="text-sm font-semibold text-gray-900">
              Show save status
            </label>
            <button
              id="show-save-status"
              type="button"
              role="switch"
              aria-checked={showSaveStatus}
              onClick={() => setShowSaveStatus(!showSaveStatus)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                showSaveStatus ? "bg-gray-900" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  showSaveStatus ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
