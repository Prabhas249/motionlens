"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { AppShell } from "@/components/app-shell"
import { AnalysisInput } from "@/components/analysis-input"
import {
  BlueprintView,
  type Blueprint,
  type Frame,
  type Mode,
} from "@/components/blueprint-view"
import { CopilotChat } from "@/components/copilot-chat"

// PUT a file to a presigned URL, reporting upload progress.
function putWithProgress(
  url: string,
  file: File,
  onProgress: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload ${xhr.status}`))
    xhr.onerror = () => reject(new Error("network"))
    xhr.send(file)
  })
}

export default function Page() {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [mode, setMode] = useState<Mode>("annotated")
  // Mode of the DISPLAYED result — snapshotted when a run starts / a saved
  // analysis loads. Flipping the input selector must not restyle the result.
  const [viewMode, setViewMode] = useState<Mode>("annotated")
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")
  const [storyboardLoading, setStoryboardLoading] = useState(false)
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [savedCode, setSavedCode] = useState<Record<string, string>>({})

  // Run token: every new run/load/reset bumps it and aborts the in-flight
  // stream, and every async continuation checks it before touching state — so
  // a stale history fetch or a still-streaming analysis can never clobber a
  // newer view (the classic "clicked another item mid-run" races).
  const runRef = useRef(0)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  // Synchronous double-submit guard (two Analyze clicks in one tick would both
  // see phase === "idle" and each burn a credit).
  const startingRef = useRef(false)
  const beginRun = useCallback(() => {
    runRef.current += 1
    xhrRef.current?.abort()
    xhrRef.current = null
    startingRef.current = false
    return runRef.current
  }, [])

  // Reflect the open analysis in the URL + sidebar highlight (deep-linkable).
  const markActive = useCallback((id: string) => {
    window.history.replaceState(null, "", `/dashboard?a=${id}`)
    window.dispatchEvent(new CustomEvent("analysis-active", { detail: { id } }))
  }, [])

  // Load a saved analysis into the view — no page reload, so no flicker.
  const loadAnalysis = useCallback(async (id: string) => {
    const run = beginRun()
    try {
      const r = await fetch(`/api/history/${id}`, { cache: "no-store" })
      if (runRef.current !== run) return
      const data = r.ok ? await r.json() : null
      if (runRef.current !== run) return
      if (!data?.blueprint) throw new Error("missing")
      setBlueprint(data.blueprint as Blueprint)
      if (data.mode) {
        setViewMode(data.mode as Mode)
        // the input selector only offers the live modes — an old "standard"
        // analysis renders fine but must not leave the selector on a dead value
        if (data.mode === "annotated" || data.mode === "precision") setMode(data.mode as Mode)
      }
      setFrames(Array.isArray(data.frames) ? (data.frames as Frame[]) : [])
      setClipUrl(typeof data.clipUrl === "string" ? data.clipUrl : null)
      setAnalysisId(data.id ?? id)
      setSavedCode(data.code && typeof data.code === "object" ? data.code : {})
      setStoryboardLoading(false)
      setError("")
      setPhase("idle")
    } catch {
      if (runRef.current !== run) return
      setError("Couldn't open that analysis — it may have been deleted.")
      setPhase("error")
    }
  }, [beginRun])

  // Open from a deep link (?a=<id>) and from sidebar clicks (a custom event, so
  // there's no navigation → no flicker and the history list doesn't reload).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("a")
    if (id) void loadAnalysis(id)
    const onLoad = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string }>).detail
      if (detail?.id) void loadAnalysis(detail.id)
    }
    window.addEventListener("load-analysis", onLoad as EventListener)
    return () => window.removeEventListener("load-analysis", onLoad as EventListener)
  }, [loadAnalysis])

  const busy = phase === "uploading" || phase === "analyzing"

  async function analyze(file: File, context: string, screenshot?: File | null) {
    if (startingRef.current || busy) return // double-submit guard
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file (mp4, mov, webm).")
      setPhase("error")
      return
    }
    const run = beginRun()
    startingRef.current = true
    const sentMode = mode // snapshot — the selector can move on while we run
    setBlueprint(null)
    setFrames([])
    setClipUrl(null)
    setAnalysisId(null)
    setSavedCode({})
    setProgress(0)
    setError("")
    setStoryboardLoading(false)
    setViewMode(sentMode)
    setPhase("uploading")

    // 1) Presigned upload straight to R2 — no size limit, real upload progress.
    let clipKey: string
    try {
      const r = await fetch("/api/clip-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name }),
      })
      const d = await r.json()
      if (!r.ok || !d.url || !d.key) throw new Error(d.error || "no url")
      clipKey = d.key
      if (runRef.current !== run) return
      await putWithProgress(d.url, file, (p) => {
        if (runRef.current === run) setProgress(p)
      })
    } catch {
      if (runRef.current !== run) return
      startingRef.current = false
      setError("Upload failed — please try again.")
      setPhase("error")
      return
    }
    if (runRef.current !== run) return
    setPhase("analyzing")

    // 2) Analyze by key — tiny body, streams the NDJSON result back.
    const form = new FormData()
    form.set("clipKey", clipKey)
    form.set("mode", sentMode)
    if (context.trim()) form.set("context", context.trim())
    if (screenshot) form.set("screenshot", screenshot)

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open("POST", "/api/analyze")
    // Read the NDJSON stream incrementally: {type:"blueprint"} arrives first → show it;
    // {type:"frames"} arrives after → fill in the storyboard.
    let handled = 0
    let gotBlueprint = false
    const pump = () => {
      if (runRef.current !== run || xhr.status >= 400) return
      const parts = xhr.responseText.split("\n")
      for (let i = handled; i < parts.length - 1; i++) {
        const line = parts[i].trim()
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          if (msg.type === "blueprint") {
            gotBlueprint = true
            startingRef.current = false
            setBlueprint(msg.blueprint as Blueprint)
            setFrames([])
            setStoryboardLoading(true)
            setPhase("idle")
            const id = typeof msg.analysisId === "string" ? msg.analysisId : null
            setAnalysisId(id)
            setSavedCode({})
            if (id) markActive(id) // deep-linkable + sidebar highlight
            // credits were just spent — refresh the credits badge + history
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
      if (runRef.current !== run) return
      startingRef.current = false
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
      if (runRef.current !== run) return
      startingRef.current = false
      setStoryboardLoading(false)
      // If the blueprint already arrived, keep it — only the storyboard was interrupted.
      if (gotBlueprint) return
      setError("Analysis failed — please try again.")
      setPhase("error")
    }
    xhr.send(form)
  }

  function reset() {
    beginRun() // cancel any in-flight stream so it can't resurrect the view
    setBlueprint(null)
    setFrames([])
    setClipUrl(null)
    setAnalysisId(null)
    setSavedCode({})
    setError("")
    setStoryboardLoading(false)
    setPhase("idle")
    window.history.replaceState(null, "", "/dashboard")
    window.dispatchEvent(new CustomEvent("analysis-active", { detail: { id: null } }))
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
            mode={viewMode}
            busy={busy}
            phase={phase}
            storyboardLoading={storyboardLoading}
            analysisId={analysisId}
            savedCode={savedCode}
            onReset={reset}
            onCorrection={onCorrection}
          />
        </main>

        {/* RIGHT — replay (if any) + analysis input + copilot */}
        <aside className="flex w-[360px] shrink-0 flex-col gap-4 min-h-0">
          {clipUrl && (
            <div className="shrink-0 overflow-hidden rounded-xl border bg-card">
              <div className="flex h-9 items-center justify-between border-b px-3">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  Original clip
                </span>
              </div>
              <video
                src={clipUrl}
                controls
                playsInline
                className="max-h-56 w-full bg-black object-contain"
              />
            </div>
          )}
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
            {/* key: opening a different analysis resets the conversation, so the
                copilot never answers about A while B is on screen */}
            <CopilotChat key={analysisId ?? "fresh"} blueprint={blueprint} />
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
