"use client"

import { useEffect, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { AnalysisInput } from "@/components/analysis-input"
import {
  BlueprintView,
  type Blueprint,
  type Frame,
  type Mode,
} from "@/components/blueprint-view"
import { CopilotChat } from "@/components/copilot-chat"

export default function Page() {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [mode, setMode] = useState<Mode>("standard")
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [storyboardLoading, setStoryboardLoading] = useState(false)

  // Reopen a saved analysis from the sidebar history (/dashboard?a=<id>).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("a")
    if (!id) return
    ;(async () => {
      try {
        const r = await fetch(`/api/history/${id}`, { cache: "no-store" })
        if (!r.ok) return
        const data = await r.json()
        if (data?.blueprint) {
          setBlueprint(data.blueprint as Blueprint)
          if (data.mode) setMode(data.mode as Mode)
          setFrames([])
          setPhase("idle")
        }
      } catch {
        /* ignore */
      }
    })()
  }, [])

  const busy = phase === "uploading" || phase === "analyzing"

  function analyze(file: File, context: string, screenshot?: File | null) {
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file (mp4, mov, webm).")
      setPhase("error")
      return
    }
    setBlueprint(null)
    setFrames([])
    setProgress(0)
    setError("")
    setStoryboardLoading(false)
    setPhase("uploading")

    const form = new FormData()
    form.set("video", file)
    form.set("mode", mode)
    if (context.trim()) form.set("context", context.trim())
    if (screenshot) form.set("screenshot", screenshot)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/analyze")
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const p = Math.round((ev.loaded / ev.total) * 100)
        setProgress(p)
        if (p >= 100) setPhase("analyzing")
      }
    }
    // Read the NDJSON stream incrementally: {type:"blueprint"} arrives first → show it + auto-gen code;
    // {type:"frames"} arrives after → fill in the storyboard. (XHR gives us both upload progress AND
    // streamed response text via onprogress.)
    let handled = 0
    let gotBlueprint = false
    const pump = () => {
      if (xhr.status >= 400) return
      const parts = xhr.responseText.split("\n")
      for (let i = handled; i < parts.length - 1; i++) {
        const line = parts[i].trim()
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          if (msg.type === "blueprint") {
            gotBlueprint = true
            setBlueprint(msg.blueprint as Blueprint)
            setFrames([])
            setStoryboardLoading(true)
            setPhase("idle")
            // credits were just spent — refresh the credits badge
            window.dispatchEvent(new Event("credits-updated"))
          } else if (msg.type === "frames") {
            setFrames(Array.isArray(msg.frames) ? msg.frames : [])
            setStoryboardLoading(false)
          }
        } catch {}
      }
      handled = parts.length - 1
    }
    xhr.onprogress = pump
    xhr.onload = () => {
      if (xhr.status >= 400) {
        try {
          setError(JSON.parse(xhr.responseText)?.error || `Error ${xhr.status}`)
        } catch {
          setError(`Error ${xhr.status}`)
        }
        setPhase("error")
        // a failed run may have been refunded (or was a no-credit 402) — resync the badge
        window.dispatchEvent(new Event("credits-updated"))
        return
      }
      pump()
      if (!gotBlueprint) {
        setError("Unexpected response from the engine.")
        setPhase("error")
      }
    }
    xhr.onerror = () => {
      setError("Upload failed — is the dev server running?")
      setStoryboardLoading(false)
      setPhase("error")
    }
    xhr.send(form)
  }

  function reset() {
    setBlueprint(null)
    setFrames([])
    setError("")
    setStoryboardLoading(false)
    setPhase("idle")
  }

  function onCorrection(c: unknown) {
    fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correction: c, summary: blueprint?.summary, mode }),
    }).catch(() => {})
  }

  return (
    <AppShell>
      {/* Cap to viewport (sticky h-14 header + content padding) so the middle scrolls
          internally and the right column stays fixed instead of the whole page scrolling. */}
      <div className="flex h-[calc(100dvh-6rem)] gap-4 md:h-[calc(100dvh-7rem)]">
        {/* MIDDLE — result only */}
        <main className="min-w-0 flex-1 overflow-hidden rounded-xl border bg-card">
          <BlueprintView
            blueprint={blueprint}
            frames={frames}
            mode={mode}
            busy={busy}
            phase={phase}
            storyboardLoading={storyboardLoading}
            onReset={reset}
            onCorrection={onCorrection}
          />
        </main>

        {/* RIGHT — analysis input + copilot */}
        <aside className="flex w-[360px] shrink-0 flex-col gap-4 min-h-0">
          <AnalysisInput
            mode={mode}
            setMode={setMode}
            busy={busy}
            phase={phase}
            progress={progress}
            error={error}
            onAnalyze={analyze}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border">
            <CopilotChat blueprint={blueprint} />
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
