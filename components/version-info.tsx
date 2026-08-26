"use client"

import { useEffect, useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type VersionInfo = {
  version: string
  commit_message: string
  authored_by: string
}

function isVersionInfo(value: unknown): value is VersionInfo {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.version === "string" &&
    typeof candidate.commit_message === "string" &&
    typeof candidate.authored_by === "string"
  )
}

export function VersionInfo() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)

  useEffect(() => {
    fetch("/version.json")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load version information")
        return response.json() as Promise<unknown>
      })
      .then((data) => {
        if (!isVersionInfo(data)) throw new Error("Invalid version information")
        setVersionInfo(data)
      })
      .catch((error) => console.error("Failed to load version information:", error))
  }, [])

  if (!versionInfo) return null

  const copyCommitMessage = () => {
    navigator.clipboard.writeText(versionInfo.commit_message).catch((error) => {
      console.error("Failed to copy commit message:", error)
    })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`View details for version ${versionInfo.version}`}
          className="mt-1 w-fit cursor-pointer text-left text-[9px] font-normal leading-none tracking-[0.12em] text-muted-foreground underline-offset-2 tabular-nums hover:underline data-[state=open]:underline [font-family:var(--font-satoshi)] sm:text-[10px]"
        >
          {versionInfo.version}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        className="w-72 rounded-2xl border-border/80 bg-popover/95 p-4 shadow-lg backdrop-blur-xl"
      >
        <dl className="space-y-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Version
            </dt>
            <dd className="mt-1 text-base font-bold tracking-tight tabular-nums">
              {versionInfo.version}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Commit
            </dt>
            <dd>
              <button
                type="button"
                aria-label="Copy commit message"
                onClick={copyCommitMessage}
                className="mt-1 block w-full text-left text-sm leading-relaxed text-foreground"
              >
                {versionInfo.commit_message}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Author
            </dt>
            <dd className="mt-1 text-sm text-foreground">{versionInfo.authored_by}</dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  )
}
