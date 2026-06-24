"use client";
import { useEffect, useRef, useState } from "react";
import AnnotatedFrame from "./AnnotatedFrame";

type El = { name?: string; count?: number; shape?: string; color?: string; approx_size?: string };
type Mo = {
  element?: string; change?: string; motion_class?: string; from?: string; to?: string;
  duration_ms?: number; easing?: string; stagger_ms?: number; direction?: string;
  layer?: string; concurrent_with?: string; micro?: boolean;
  confidence?: string; inferred?: boolean;
};
type Blueprint = {
  summary?: string; story?: string; beats?: string[]; trigger?: string; anchor?: string; spatial?: string;
  elements?: (El | string)[]; timeline?: { t?: string; event?: string }[];
  motion?: Mo[]; feel?: string[]; blind_spots?: string[]; agent_prompt?: string; confidence?: string;
};
type Frame = { img: string; label: string; annotations?: { bbox?: number[]; label?: string; arrow?: string; glyph?: string }[] };
type Phase = "idle" | "uploading" | "analyzing" | "done";
type Mode = "standard" | "precision" | "annotated";

const CONF: Record<string, { pct: number; color: string; dot: string; label: string }> = {
  high: { pct: 92, color: "#7CFFB2", dot: "🟢", label: "High" },
  medium: { pct: 65, color: "#ffd166", dot: "🟡", label: "Medium" },
  low: { pct: 40, color: "#ff6b6b", dot: "🔴", label: "Low" },
};

// Motion layers — so primary / secondary / ambient / micro is scannable in the Behavior list.
const LAYER: Record<string, { tag: string; mark: string; color: string; border: string; order: number }> = {
  primary: { tag: "PRIMARY", mark: "●", color: "#FFE000", border: "#5a5320", order: 0 },
  secondary: { tag: "SECONDARY", mark: "◐", color: "#9fb0c0", border: "#33424f", order: 1 },
  enter: { tag: "IN", mark: "↘", color: "#7CFFB2", border: "#1f4d33", order: 2 },
  exit: { tag: "OUT", mark: "↗", color: "#ff9b9b", border: "#5a2424", order: 3 },
  ambient: { tag: "AMBIENT", mark: "◌", color: "#6f7d8c", border: "#2a343d", order: 4 },
  micro: { tag: "MICRO", mark: "⚡", color: "#7fd1ff", border: "#234a5a", order: 5 },
};

const STEPS: Record<Mode, string[]> = {
  standard: ["Watching the clip…", "Building the Motion Blueprint…"],
  precision: ["Watching the clip…", "Drafting the Blueprint…", "Cross-checking against the video…", "Refining for accuracy…"],
  annotated: ["Watching the clip…", "Building the Blueprint…", "Planning storyboard moments…", "Drawing annotations…"],
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<Mode>("standard");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deviceFrame, setDeviceFrame] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ctxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase !== "analyzing") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  function runAnalysis(m: Mode) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a clip first.");
      return;
    }
    setError(null);
    // Upload cap (client-side): Precision = 10s (short, high-detail interactions), others = 30s
    const maxSec = m === "precision" ? 10 : 30;
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (probe.duration && probe.duration > maxSec + 1) {
        setError(
          m === "precision"
            ? "Precision is for short, high-detail interactions — 10 seconds max. Trim to the moment you care about."
            : "Clip is too long — 30 seconds max. Trim it and try again."
        );
        return;
      }
      send(m, file);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(url);
      send(m, file);
    };
    probe.src = url;
  }

  function send(m: Mode, file: File) {
    setBp(null);
    setRaw(null);
    setFrames([]);
    setProgress(0);
    setMode(m);
    setPhase("uploading");

    const form = new FormData();
    form.set("video", file);
    form.set("mode", m);
    if (ctxRef.current?.value) form.set("context", ctxRef.current.value);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/analyze");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const p = Math.round((ev.loaded / ev.total) * 100);
        setProgress(p);
        if (p >= 100) setPhase("analyzing");
      }
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const blueprint = (data.blueprint ?? data) as Blueprint;
          setRaw(blueprint);
          setBp(blueprint);
          setFrames(Array.isArray(data.frames) ? data.frames : []);
          setPhase("done");
        } else {
          setError((data as { error?: string }).error || `Error ${xhr.status}`);
          setPhase("idle");
        }
      } catch {
        setError("Unexpected response from server.");
        setPhase("idle");
      }
    };
    xhr.onerror = () => {
      setError("Network error — is the dev server running?");
      setPhase("idle");
    };
    xhr.send(form);
  }

  const busy = phase === "uploading" || phase === "analyzing";
  const conf = bp ? CONF[(bp.confidence || "").toLowerCase()] || CONF.medium : null;
  const steps = STEPS[mode];
  const curStep = Math.min(Math.floor(elapsed / 6), steps.length - 1);

  function copyPrompt() {
    if (!bp?.agent_prompt) return;
    navigator.clipboard.writeText(bp.agent_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // capture drag-to-fix nudges → corrections dataset (the moat)
  function onCorrection(c: unknown) {
    fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correction: c, summary: bp?.summary, mode }),
    }).catch(() => {});
  }

  return (
    <main className="legacy-ui" style={{ maxWidth: 820, margin: "48px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 4 }}>MotionLens</h1>
      <p style={{ opacity: 0.6, marginTop: 0 }}>
        Upload a short UI animation clip → get a Motion Blueprint your AI agent can use.
      </p>

      <div style={{ marginTop: 24 }}>
        <input ref={fileRef} type="file" accept="video/*,image/gif" disabled={busy} />
        <textarea
          ref={ctxRef}
          rows={2}
          disabled={busy}
          placeholder="Optional — anything to focus on? e.g. 'just the button', 'I use Framer Motion'"
          style={inputStyle}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {["Primary animation", "The click / tap effect", "Hover state", "Entrance animation", "Button only", "Text only"].map((c) => (
            <button
              key={c}
              type="button"
              disabled={busy}
              onClick={() => { if (ctxRef.current) ctxRef.current.value = c; }}
              style={focusChip}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={() => runAnalysis("standard")} disabled={busy}>
            {busy && mode === "standard" ? "Working…" : "Analyze Motion"}
          </button>
          <button onClick={() => runAnalysis("precision")} disabled={busy} style={secondaryBtn}>
            {busy && mode === "precision" ? "Working…" : "🎯 Precision"}
          </button>
          <button onClick={() => runAnalysis("annotated")} disabled={busy} style={secondaryBtn}>
            {busy && mode === "annotated" ? "Working…" : "📝 Annotated Storyboard"}
          </button>
        </div>
        <div style={{ fontSize: 12, opacity: 0.45, marginTop: 8 }}>
          Standard = fast (≤30s) · Annotated = storyboard with arrows & labels (≤30s) · Precision = the works: multi-pass accuracy + annotated storyboard (≤10s)
        </div>
      </div>

      {phase === "uploading" && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, opacity: 0.8 }}>Uploading… {progress}%</div>
          <div style={barTrack}><div style={{ ...barFill, width: `${progress}%` }} /></div>
        </div>
      )}
      {phase === "analyzing" && (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid #1c1c1c", borderRadius: 10, background: "#0d0d0d" }}>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 10 }}>
            {mode === "standard" ? "Analyzing" : mode === "precision" ? "🎯 Precision analysis" : "📝 Annotated storyboard"} · {elapsed}s
          </div>
          {steps.map((s, i) => {
            const state = i < curStep ? "done" : i === curStep ? "active" : "pending";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", fontSize: 14, opacity: state === "pending" ? 0.4 : 1 }}>
                {state === "done" ? <span style={{ color: "#7CFFB2" }}>✓</span> : state === "active" ? <span className="spinner" /> : <span>○</span>}
                <span>{s}</span>
              </div>
            );
          })}
        </div>
      )}
      {error && <p style={{ color: "#ff6b6b", marginTop: 20 }}>⚠️ {error}</p>}

      {bp && conf && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 13, letterSpacing: 1, opacity: 0.5 }}>🎥 ANALYSIS COMPLETE</div>
          <h2 style={{ margin: "8px 0 0", fontSize: 22, lineHeight: 1.3 }}>{bp.summary}</h2>
          {bp.story && (
            <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, opacity: 0.75 }}>{bp.story}</p>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Motion Confidence — {conf.dot} {conf.label}</div>
            <div style={barTrack}><div style={{ ...barFill, width: `${conf.pct}%`, background: conf.color }} /></div>
          </div>

          {bp.beats && bp.beats.length > 0 && (
            <Section title="🎬 Animation Flow">
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", counterReset: "beat" }}>
                {bp.beats.map((b, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 14, lineHeight: 1.45 }}>
                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 11, background: "#11131c", border: "1px solid #2a48f0", color: "#7f9bff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <span style={{ opacity: 0.9 }}>{b}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {frames.length > 0 && (
            <Section title="📸 Storyboard">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: -4, marginBottom: 10 }}>
                <span style={{ fontSize: 12, opacity: 0.5 }}>
                  {mode === "annotated" || mode === "precision" ? "Drag a circle to fix its spot, then Save / Copy the annotated frame." : ""}
                </span>
                <label style={{ fontSize: 12, opacity: 0.65, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={deviceFrame} onChange={(e) => setDeviceFrame(e.target.checked)} />
                  📱 Device frame
                </label>
              </div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
                {frames.map((f, i) =>
                  mode === "annotated" || mode === "precision" ? (
                    <DeviceFrame key={i} on={deviceFrame}>
                      <AnnotatedFrame src={f.img} annotations={f.annotations} index={i} isLast={i === frames.length - 1} onCorrection={onCorrection} />
                    </DeviceFrame>
                  ) : (
                    <div key={i} style={{ minWidth: 200, maxWidth: 280 }}>
                      <DeviceFrame on={deviceFrame}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.img} alt={`storyboard frame ${i + 1}`} style={{ width: "100%", borderRadius: 8, border: "1px solid #222", display: "block" }} />
                      </DeviceFrame>
                      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6, lineHeight: 1.35 }}>{f.label || `Moment ${i + 1}`}</div>
                    </div>
                  )
                )}
              </div>
            </Section>
          )}

          {bp.timeline && bp.timeline.length > 0 && (
            <Section title="🕒 Timeline">
              {bp.timeline.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "4px 0", fontSize: 14 }}>
                  <span style={{ color: "#2a48f0", fontVariantNumeric: "tabular-nums", minWidth: 52 }}>{t.t}</span>
                  <span style={{ opacity: 0.9 }}>{t.event}</span>
                </div>
              ))}
              <div style={{ fontSize: 12, opacity: 0.4, marginTop: 8 }}>
                ⏱ Timings are AI estimates — fine-tune to taste.
              </div>
            </Section>
          )}

          <Section title="📝 Motion Blueprint">
            <Row label="Trigger" value={bp.trigger} />
            {bp.anchor && <Row label="Origin" value={bp.anchor} />}
            {bp.spatial && <Row label="Arrangement" value={bp.spatial} />}
            {bp.elements && bp.elements.length > 0 && <Row label="Elements" value={bp.elements.map(elName).join(", ")} />}
            {bp.motion && bp.motion.length > 0 && (() => {
              const layerOf = (m: Mo) => (m.micro ? "micro" : (m.layer || "").toLowerCase());
              const ord = (m: Mo) => LAYER[layerOf(m)]?.order ?? 9;
              // group simultaneous motions by their concurrent_with anchor; old flat data → one per moment
              const groups = new Map<string, { m: Mo; i: number }[]>();
              bp.motion.forEach((m, i) => {
                const key = (m.concurrent_with && String(m.concurrent_with).trim()) || `__solo_${i}`;
                const arr = groups.get(key);
                if (arr) arr.push({ m, i }); else groups.set(key, [{ m, i }]);
              });
              const tally: Record<string, number> = {};
              bp.motion.forEach((m) => { const l = layerOf(m); if (l) tally[l] = (tally[l] || 0) + 1; });
              const parts = ["primary", "secondary", "ambient", "micro"].filter((k) => tally[k]).map((k) => `${tally[k]} ${k}`);
              const countLine = `${bp.motion.length} motions across ${groups.size} moment${groups.size === 1 ? "" : "s"}` + (parts.length ? ` — ${parts.join(" · ")}` : "");
              return (
                <div style={{ marginTop: 8 }}>
                  <div style={rowLabel}>Behavior</div>
                  <div style={{ fontSize: 12, opacity: 0.55, margin: "2px 0 8px" }}>{countLine}</div>
                  {[...groups.values()].map((rows, gi) => {
                    const sorted = [...rows].sort((a, b) => ord(a.m) - ord(b.m));
                    const anchor = sorted.find((r) => r.m.concurrent_with)?.m.concurrent_with;
                    const isMoment = sorted.length > 1;
                    return (
                      <div key={gi} style={isMoment ? { borderLeft: "2px solid #2a343d", paddingLeft: 10, margin: "8px 0" } : { margin: "2px 0" }}>
                        {isMoment && (
                          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>
                            {anchor ? String(anchor) : `Moment ${gi + 1}`}{" "}
                            <span style={{ opacity: 0.7 }}>
                              {[...new Set(sorted.map((r) => layerOf(r.m)))].filter((l) => LAYER[l]).map((l) => LAYER[l].mark).join(" ")}
                            </span>
                          </div>
                        )}
                        {sorted.map(({ m, i }) => {
                          const low = (m.confidence || "").toLowerCase() === "low" || m.inferred;
                          const lc = LAYER[layerOf(m)];
                          return (
                            <div key={i} style={{ fontSize: 14, opacity: low ? 0.6 : 0.9, padding: "2px 0" }}>
                              {lc && (
                                <span style={{ display: "inline-block", minWidth: 78, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: lc.color, border: `1px solid ${lc.border}`, borderRadius: 4, padding: "0 5px", marginRight: 6, textAlign: "center" }}>
                                  {lc.mark} {lc.tag}
                                </span>
                              )}
                              {[m.change, m.element].filter(Boolean).join(" ")}: {m.from} → {m.to}{" "}
                              <span style={{ opacity: 0.6 }}>
                                ({[m.duration_ms ? `~${m.duration_ms}ms` : "", m.easing, m.stagger_ms ? `~${m.stagger_ms}ms stagger` : ""].filter(Boolean).join(", ")})
                              </span>
                              {m.motion_class && m.motion_class !== "transform" && (
                                <span style={{ marginLeft: 6, fontSize: 11, color: "#7fd1ff", border: "1px solid #234a5a", borderRadius: 4, padding: "0 5px" }}>
                                  {m.motion_class}
                                </span>
                              )}
                              {low && (
                                <span style={{ marginLeft: 6, fontSize: 11, color: "#ffd166", border: "1px solid #5a4d1f", borderRadius: 4, padding: "0 5px" }}>
                                  {m.inferred ? "likely · low" : "low"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {bp.feel && bp.feel.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={rowLabel}>Feel</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {bp.feel.map((f, i) => <span key={i} style={chip}>{f}</span>)}
                </div>
              </div>
            )}
            {bp.blind_spots && bp.blind_spots.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={rowLabel}>Can&apos;t know from the video</div>
                {bp.blind_spots.map((b, i) => (
                  <div key={i} style={{ fontSize: 13, opacity: 0.6, padding: "2px 0", lineHeight: 1.4 }}>◦ {b}</div>
                ))}
              </div>
            )}
          </Section>

          <Section title="🤖 For your AI coding agent">
            <button type="button" onClick={copyPrompt}>{copied ? "✓ Copied!" : "Copy for Claude Code"}</button>
            <p style={{ fontSize: 13, opacity: 0.55, marginTop: 8 }}>{bp.agent_prompt}</p>
          </Section>

          <details style={{ marginTop: 24 }}>
            <summary style={{ cursor: "pointer", opacity: 0.6, fontSize: 13 }}>📄 View raw JSON</summary>
            <pre style={rawPre}>{JSON.stringify(raw, null, 2)}</pre>
          </details>
        </div>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28, borderTop: "1px solid #1c1c1c", paddingTop: 20 }}>
      <div style={{ fontSize: 13, letterSpacing: 1, opacity: 0.5, marginBottom: 12 }}>{title.toUpperCase()}</div>
      {children}
    </div>
  );
}
function DeviceFrame({ on, children }: { on: boolean; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <div style={{ position: "relative", padding: 7, background: "#0a0a0a", border: "3px solid #2b2b2e", borderRadius: 30, boxShadow: "0 10px 34px rgba(0,0,0,0.5)" }}>
      <div style={{ position: "absolute", top: 13, left: "50%", transform: "translateX(-50%)", width: 64, height: 15, background: "#000", borderRadius: 999, zIndex: 2 }} />
      <div style={{ borderRadius: 24, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 12, padding: "3px 0", fontSize: 14 }}>
      <span style={{ ...rowLabel, minWidth: 96 }}>{label}</span>
      <span style={{ opacity: 0.9 }}>{value}</span>
    </div>
  );
}
function elName(e: El | string): string {
  if (typeof e === "string") return e;
  const bits = [e.count && e.count > 1 ? `${e.count}×` : "", e.color, e.shape || e.name].filter(Boolean).join(" ");
  return bits || e.name || "element";
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", marginTop: 12, padding: 10, borderRadius: 8,
  background: "#111", color: "#e8e4da", border: "1px solid #333", fontFamily: "inherit", fontSize: 14,
};
const secondaryBtn: React.CSSProperties = { background: "#15151a", border: "1px solid #2a2a33" };
const focusChip: React.CSSProperties = { background: "#101014", border: "1px solid #2a2a33", color: "#9a9aa5", borderRadius: 999, padding: "4px 11px", fontSize: 12, cursor: "pointer" };
const barTrack: React.CSSProperties = { height: 8, background: "#1a1a1a", borderRadius: 4, marginTop: 6, overflow: "hidden" };
const barFill: React.CSSProperties = { height: 8, background: "#2a48f0", borderRadius: 4, transition: "width 0.3s" };
const rowLabel: React.CSSProperties = { fontSize: 13, opacity: 0.5, textTransform: "uppercase", letterSpacing: 0.5 };
const chip: React.CSSProperties = { background: "#15151a", border: "1px solid #2a2a33", borderRadius: 999, padding: "4px 12px", fontSize: 13 };
const rawPre: React.CSSProperties = { background: "#050505", color: "#7CFFB2", padding: 16, borderRadius: 8, overflow: "auto", marginTop: 8, fontSize: 12, lineHeight: 1.5 };
