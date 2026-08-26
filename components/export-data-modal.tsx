"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { downloadDataExport, type DataExportFormat } from "@/lib/data-export"

interface ExportDataModalProps {
  onClose: () => void
}

function defaultFileName() {
  return `geckodraw-backup-${new Date().toISOString().slice(0, 10)}`
}

export function ExportDataModal({ onClose }: ExportDataModalProps) {
  const [fileName, setFileName] = useState(defaultFileName)
  const [format, setFormat] = useState<DataExportFormat>("json")
  const [password, setPassword] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState("")
  const fileNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const animationFrame = requestAnimationFrame(() => {
      fileNameRef.current?.focus()
      fileNameRef.current?.select()
    })

    return () => {
      cancelAnimationFrame(animationFrame)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const close = () => {
    if (!isExporting) onClose()
  }

  const handleExport = async () => {
    if (!fileName.trim()) return

    setIsExporting(true)
    setError("")

    try {
      await downloadDataExport({ fileName, format, password })
      onClose()
    } catch (exportError) {
      console.error("Failed to export GeckoDraw data.", exportError)
      setError("Your data could not be exported. Please try again.")
      setIsExporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-data-title"
        aria-busy={isExporting}
        onKeyDown={(event) => {
          if (event.key === "Escape") close()
        }}
      >
        <div className="mb-5 pr-10">
          <h2 id="export-data-title" className="text-xl font-semibold text-foreground">
            Export data
          </h2>
        </div>

        <button
          type="button"
          onClick={close}
          disabled={isExporting}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          aria-label="Close export data dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleExport()
          }}
        >
          <div className="space-y-2">
            <label htmlFor="export-file-name" className="block text-sm font-medium text-foreground">
              File name
            </label>
            <Input
              ref={fileNameRef}
              id="export-file-name"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              disabled={isExporting}
              className="h-11 rounded-xl px-3.5 text-base"
            />
          </div>

          <div className="mt-5 space-y-2">
            <label htmlFor="export-format" className="block text-sm font-medium text-foreground">
              Format
            </label>
            <div className="relative">
              <select
                id="export-format"
                value={format}
                onChange={(event) => setFormat(event.target.value as DataExportFormat)}
                disabled={isExporting}
                className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-3.5 pr-10 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <label htmlFor="export-password" className="block text-sm font-medium text-foreground">
              Password <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="export-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isExporting}
              autoComplete="new-password"
              className="h-11 rounded-xl px-3.5 text-base"
            />
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isExporting}
              className="h-10 flex-1 rounded-xl shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!fileName.trim() || isExporting}
              className="h-10 flex-1 rounded-xl disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting…" : "Export"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
