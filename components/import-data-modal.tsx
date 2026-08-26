"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataImportError, importDataFile } from "@/lib/data-import"

interface ImportDataModalProps {
  onClose: () => void
}

export function ImportDataModal({ onClose }: ImportDataModalProps) {
  const [file, setFile] = useState<File>()
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [password, setPassword] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const animationFrame = requestAnimationFrame(() => fileInputRef.current?.focus())

    return () => {
      cancelAnimationFrame(animationFrame)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const close = () => {
    if (!isImporting) onClose()
  }

  const selectFile = (selectedFile?: File) => {
    setFile(selectedFile)
    setError("")
  }

  const handleImport = async () => {
    if (!file) return

    setIsImporting(true)
    setError("")

    try {
      await importDataFile(file, password)
      window.location.reload()
    } catch (importError) {
      console.error("Failed to import GeckoDraw data.", importError)
      setError(
        importError instanceof DataImportError
          ? importError.message
          : "Your data could not be imported. Please try again."
      )
      setIsImporting(false)
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="import-data-title"
        aria-describedby="import-data-warning"
        aria-busy={isImporting}
        onKeyDown={(event) => {
          if (event.key === "Escape") close()
        }}
      >
        <div className="mb-5 pr-10">
          <h2 id="import-data-title" className="text-xl font-semibold text-foreground">
            Import data
          </h2>
          <p id="import-data-warning" className="mt-2 text-sm leading-relaxed text-destructive">
            This will overwrite everything.
          </p>
        </div>

        <button
          type="button"
          onClick={close}
          disabled={isImporting}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          aria-label="Close import data dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleImport()
          }}
        >
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">
              Export file
            </span>
            <label
              htmlFor="import-file"
              onDragEnter={(event) => {
                event.preventDefault()
                if (!isImporting) setIsDraggingFile(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                if (!isImporting) event.dataTransfer.dropEffect = "copy"
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsDraggingFile(false)
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                setIsDraggingFile(false)
                if (!isImporting) selectFile(event.dataTransfer.files[0])
              }}
              className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
                isDraggingFile ? "border-primary bg-accent" : "border-border bg-background"
              } ${isImporting ? "cursor-not-allowed opacity-50" : "hover:bg-accent"}`}
            >
              <Input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept=".json,.csv,.encrypted,application/json,text/csv"
                onChange={(event) => selectFile(event.target.files?.[0])}
                disabled={isImporting}
                className="sr-only"
              />
              <span className="text-sm font-medium text-foreground">
                {file ? file.name : "Drop an export file here"}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                {file ? "Drop or click to choose a different file" : "or click to browse"}
              </span>
            </label>
          </div>

          <div className="mt-5 space-y-2">
            <label htmlFor="import-password" className="block text-sm font-medium text-foreground">
              Password <span className="font-normal text-muted-foreground">(encrypted files)</span>
            </label>
            <Input
              id="import-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isImporting}
              autoComplete="current-password"
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
              disabled={isImporting}
              className="h-10 flex-1 rounded-xl shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!file || isImporting}
              className="h-10 flex-1 rounded-xl disabled:cursor-not-allowed"
            >
              {isImporting ? "Importing…" : "Overwrite and import"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
