"use client";

import * as React from "react";
import { Loader2, Copy, Check, RotateCcw, AlertCircle, Clapperboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WaveSpinner } from "@/components/ui/wave-spinner";
import AnnotatedFrame from "@/app/AnnotatedFrame";

export type Mode = "standard" | "annotated" | "precision";
export type Frame = {
  img: string;
  label?: string;
  annotations?: { bbox?: number[]; label?: string; arrow?: string; glyph?: string }[];
};
export type Mo = {
  element?: string;
  change?: string;
  motion_class?: string;
  from?: string;
  to?: string;
  confidence?: string;
  inferred?: boolean;
  purpose?: string;
};
export type Blueprint = {
  summary?: string;
  story?: string;
  beats?: string[];
  timeline?: { t?: string; event?: string }[];
  motion?: Mo[];
  feel?: string[];
  blind_spots?: string[];
  agent_prompt?: string;
  confidence?: string;
};

const CONF: Record<string, string> = {
  high: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  low: "text-red-400 border-red-400/30 bg-red-400/10",
};

export function BlueprintView({
  blueprint,
  frames,
  mode,
  busy,
  phase,
  storyboardLoading = false,
  analysisId = null,
  savedCode,
  onReset,
  onCorrection,
}: {
  blueprint: Blueprint | null;
  frames: Frame[];
  mode: Mode;
  busy: boolean;
  phase: "idle" | "uploading" | "analyzing" | "error";
  storyboardLoading?: boolean;
  analysisId?: string | null;
  savedCode?: Record<string, string>;
  onReset: () => void;
  onCorrection: (c: unknown) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  // Enlarged storyboard frame (click a frame / ⤢ on an annotated one). For
  // annotated frames the src is the CANVAS export, so callouts + nudges show.
  const [lightbox, setLightbox] = React.useState<{ src: string; caption?: string } | null>(null);
  // Storyboard callouts on/off — off shows the clean frames (placement misses
  // become dismissible instead of trust-killers).
  const [callouts, setCallouts] = React.useState(true);
  const [framework, setFramework] = React.useState("Framer Motion");
  const [code, setCode] = React.useState("");
  const [genning, setGenning] = React.useState(false);
  const [codeCopied, setCodeCopied] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  // Code already generated for this analysis (framework → code). Seeded from the
  // saved copy on load and filled as new frameworks are generated, so we never
  // regenerate the same thing twice (reopening history is instant).
  const codeCacheRef = React.useRef<Record<string, string>>({});
  // Generation sequence: bumped on every genCode call so a stale stream (user
  // switched framework or opened another analysis mid-generation) can't write
  // interleaved code into the view or pollute the cache of the newer analysis.
  const genSeqRef = React.useRef(0);

  React.useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

  React.useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const bp = blueprint;
  const conf = bp?.confidence ? CONF[bp.confidence.toLowerCase()] ?? CONF.medium : null;

  async function genCode(fw?: string) {
    if (!bp) return;
    const seq = ++genSeqRef.current;
    const live = () => genSeqRef.current === seq; // am I still the latest request?
    const useFw = fw ?? framework;
    // Already have this framework's code? Show it instantly — no regeneration.
    const cached = codeCacheRef.current[useFw];
    if (cached) {
      setGenning(false);
      setCode(cached);
      return;
    }
    setGenning(true);
    setCode("");
    const strip = (s: string) => s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "");
    try {
      const res = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint: bp, framework: useFw, frames: frames.map((f) => f.img) }),
      });
      if (!live()) {
        res.body?.cancel().catch(() => {});
        return;
      }
      if (!res.ok || !res.body) {
        setCode("Failed to generate code.");
        return;
      }
      // Stream the code in live so it appears as it's written.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (!live()) {
          reader.cancel().catch(() => {});
          return;
        }
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setCode(strip(acc));
      }
      const final = strip(acc).trim();
      setCode(final);
      // Cache locally + persist onto the analysis so reopening never regenerates.
      if (final && final !== "Failed to generate code.") {
        codeCacheRef.current[useFw] = final;
        if (analysisId) {
          fetch("/api/save-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: analysisId, framework: useFw, code: final }),
          }).catch(() => {});
        }
      }
    } catch {
      if (live()) setCode("Failed to generate code.");
    } finally {
      if (live()) setGenning(false);
    }
  }

  // Auto-load code when an analysis loads: reuse the saved copy if present,
  // otherwise generate it once (fresh runs). Never regenerates on reopen.
  React.useEffect(() => {
    setCodeCopied(false);
    setLightbox(null); // a stale enlarged frame must not survive an analysis switch
    if (blueprint) {
      codeCacheRef.current = { ...(savedCode ?? {}) };
      void genCode();
    } else {
      genSeqRef.current++; // invalidate any in-flight generation
      codeCacheRef.current = {};
      setCode("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprint]);

  // BUSY — analysis in flight
  if (busy) {
    const mm = Math.floor(elapsed / 60);
    const ss = String(elapsed % 60).padStart(2, "0");
    const STAGES = [
      "Watching the clip…",
      "Building the Blueprint…",
      "Verifying frame-by-frame…",
      "Planning the storyboard…",
      "Drawing annotations…",
    ];
    const stage =
      phase === "uploading"
        ? "Uploading…"
        : STAGES[Math.min(STAGES.length - 1, Math.floor(elapsed / 22))];
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <WaveSpinner size="lg" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{stage}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {mm}:{ss} elapsed
            {mode === "precision" ? " · precision is multi-pass" : ""}
          </p>
        </div>
      </div>
    );
  }

  // EMPTY
  if (!bp) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-card">
          <Clapperboard className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-medium">Your Motion Blueprint will appear here</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload a clip on the right to generate it.
          </p>
        </div>
      </div>
    );
  }

  // RESULT
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <span className="text-xs text-muted-foreground capitalize">{mode} analysis</span>
        <Button variant="outline" size="sm" onClick={onReset} className="h-7 gap-1.5 text-xs">
          <RotateCcw className="size-3.5" /> New analysis
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="space-y-2">
            {conf && (
              <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] capitalize", conf)}>
                {bp.confidence} confidence
              </span>
            )}
            {bp.summary && <h2 className="text-xl leading-snug font-semibold">{bp.summary}</h2>}
            {bp.story && <p className="text-sm leading-relaxed text-muted-foreground">{bp.story}</p>}
          </div>

          {storyboardLoading && frames.length === 0 && (
            <Section title="Storyboard">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Generating storyboard…
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="aspect-[9/16] min-w-[200px] max-w-[240px] shrink-0 animate-pulse rounded-lg border bg-muted"
                  />
                ))}
              </div>
            </Section>
          )}

          {frames.length > 0 && (
            <Section title="Storyboard">
              {(mode === "annotated" || mode === "precision") && (
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCallouts((v) => !v)}
                    aria-pressed={callouts}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                      callouts
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Callouts {callouts ? "on" : "off"}
                  </button>
                </div>
              )}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {frames.map((f, i) =>
                  mode === "annotated" || mode === "precision" ? (
                    <div key={i} className="min-w-[220px] max-w-[300px]">
                      <AnnotatedFrame
                        src={f.img}
                        annotations={f.annotations}
                        index={i}
                        isLast={i === frames.length - 1}
                        onCorrection={onCorrection}
                        showCallouts={callouts}
                        onExpand={(src) =>
                          setLightbox({ src, caption: f.annotations?.[0]?.label || f.label })
                        }
                      />
                    </div>
                  ) : (
                    <div key={i} className="min-w-[200px] max-w-[280px]">
                      <button
                        type="button"
                        className="block w-full cursor-zoom-in"
                        onClick={() => setLightbox({ src: f.img, caption: f.label || `Moment ${i + 1}` })}
                        aria-label={`Enlarge frame ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.img} alt={`frame ${i + 1}`} className="w-full rounded-lg border" />
                      </button>
                      <p className="mt-1.5 text-xs text-muted-foreground">{f.label || `Moment ${i + 1}`}</p>
                    </div>
                  ),
                )}
              </div>
            </Section>
          )}

          {bp.beats && bp.beats.length > 0 && (
            <Section title="Animation flow">
              <ol className="space-y-1.5">
                {bp.beats.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {bp.motion && bp.motion.length > 0 && (
            <Section title={`Motion (${bp.motion.length})`}>
              <div className="space-y-2">
                {bp.motion.map((m, i) => {
                  const low = (m.confidence || "").toLowerCase() === "low" || m.inferred;
                  return (
                    <div key={i} className="rounded-lg border bg-card p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.element || "Element"}</span>
                        {m.motion_class && m.motion_class !== "transform" && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {m.motion_class}
                          </span>
                        )}
                        {low && (
                          <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[11px] text-amber-400">
                            inferred
                          </span>
                        )}
                      </div>
                      {m.purpose && (
                        <p className="mt-1 text-xs font-medium text-primary/85">{m.purpose}</p>
                      )}
                      {m.change && <p className="mt-1 text-muted-foreground">{m.change}</p>}
                      {(m.from || m.to) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="text-foreground/80">{m.from}</span>
                          {m.from && m.to ? " → " : ""}
                          <span className="text-foreground/80">{m.to}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {bp.feel && bp.feel.length > 0 && (
            <Section title="Feel">
              <div className="flex flex-wrap gap-2">
                {bp.feel.map((f, i) => (
                  <span key={i} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    {f}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {bp.blind_spots && bp.blind_spots.length > 0 && (
            <Section title="Blind spots">
              <ul className="space-y-1">
                {bp.blind_spots.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {bp.agent_prompt && (
            <Section title="Agent prompt">
              <div className="relative rounded-lg border bg-card p-3">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
                  {bp.agent_prompt}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-7 gap-1.5 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(bp.agent_prompt || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </Section>
          )}

          {/* Code generation */}
          <Section title="Code">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {["Framer Motion", "CSS", "GSAP", "Tailwind"].map((fw) => (
                  <button
                    key={fw}
                    disabled={genning}
                    onClick={() => {
                      setFramework(fw);
                      genCode(fw);
                    }}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs transition disabled:opacity-60",
                      framework === fw
                        ? "border-primary bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {fw}
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => genCode()}
                  disabled={genning}
                  className="ml-auto h-7 gap-1.5 text-xs"
                >
                  {genning ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}
                  {genning ? "Generating…" : "Regenerate"}
                </Button>
              </div>
              {genning && !code && (
                <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Generating + refining {framework} code…
                </div>
              )}
              {code && (
                <div className="relative rounded-lg border bg-card p-3">
                  <pre className="overflow-x-auto whitespace-pre text-xs leading-relaxed text-foreground/90">
                    {code}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 h-7 gap-1.5 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 1200);
                    }}
                  >
                    {codeCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {codeCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged storyboard frame"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.caption || "storyboard frame"}
            className="max-h-[85vh] max-w-[92vw] rounded-lg border object-contain"
          />
          {lightbox.caption && (
            <p className="max-w-xl text-center text-sm text-muted-foreground">{lightbox.caption}</p>
          )}
          <span className="text-[11px] text-muted-foreground/60">click anywhere or press Esc to close</span>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}
