"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ChevronDown } from "lucide-react";
import { cn } from "@marketing/lib/utils";
import type { Showcase } from "@/lib/showcase";

type Frame = { img: string; label?: string; annotations?: { label?: string }[] };

const TABS = ["Overview", "Motion", "Storyboard", "Code"] as const;
type Tab = (typeof TABS)[number];

// Tabbed showcase. Every tab's content stays in the DOM (CSS-toggled) so
// crawlers index the whole page; only the storyboard is client-fetched
// (multi-MB of frames living in R2).
export function ShowcaseView({ showcase }: { showcase: Showcase }) {
  const s = showcase;
  const bp = s.blueprint;
  const [tab, setTab] = useState<Tab>("Overview");
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const frameworks = Object.keys(s.code);
  const [fw, setFw] = useState(frameworks[0] ?? "");
  const [codeOpen, setCodeOpen] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!s.framesUrl) {
      setFrames([]);
      return;
    }
    let alive = true;
    fetch(s.framesUrl)
      .then((r) => (r.ok ? r.json() : []))
      .then((f) => alive && setFrames(Array.isArray(f) ? f : []))
      .catch(() => alive && setFrames([]));
    return () => {
      alive = false;
    };
  }, [s.framesUrl]);

  // ONE button → the entire context an AI agent needs: summary, choreography,
  // measured motion, the agent prompt, and every generated code variant.
  function copyEverything() {
    const parts: string[] = [
      `# ${s.title}`,
      bp.summary ? `\n${bp.summary}` : "",
      bp.story ? `\n## What happens\n${bp.story}` : "",
      bp.beats?.length ? `\n## Choreography\n${bp.beats.map((b, i) => `${i + 1}. ${b}`).join("\n")}` : "",
      bp.motion?.length
        ? `\n## Measured motion\n${JSON.stringify(bp.motion, null, 2)}`
        : "",
      bp.blind_spots?.length ? `\n## Blind spots (not determinable from video)\n${bp.blind_spots.map((b) => `- ${b}`).join("\n")}` : "",
      bp.agent_prompt ? `\n## Agent prompt\n${bp.agent_prompt}` : "",
      ...frameworks.map((f) => `\n## ${f} implementation\n\`\`\`\n${s.code[f]}\n\`\`\``),
      `\n— Motion Blueprint by MotionLens · https://motionlens.dev/animations/${s.slug}`,
    ];
    navigator.clipboard.writeText(parts.filter(Boolean).join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* tab bar + the one button that matters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <nav className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t
                  ? "border-[#2A48F0] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={copyEverything}
          className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#2A48F0] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {copiedAll ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiedAll ? "Copied!" : "Copy full context"}
        </button>
      </div>

      {/* OVERVIEW */}
      <div className={cn("flex-col gap-6", tab === "Overview" ? "flex" : "hidden")}>
        {s.clipUrl && (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video
            src={s.clipUrl}
            controls
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full rounded-xl border border-border bg-black"
          />
        )}
        {bp.story && <p className="text-[15px] leading-relaxed text-muted-foreground">{bp.story}</p>}
        {(bp.beats?.length ?? 0) > 0 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
              Choreography, beat by beat
            </h2>
            <ol className="ml-5 list-decimal space-y-1.5 text-[15px] text-muted-foreground">
              {bp.beats!.map((b, i) => (
                <li key={`${i}-${b.slice(0, 20)}`}>{b}</li>
              ))}
            </ol>
          </div>
        )}
        {(bp.feel?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">feel</span>
            {bp.feel!.map((f) => (
              <span key={f} className="rounded-full border border-border px-2.5 py-0.5 text-sm text-foreground/80">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* MOTION */}
      <div className={cn("flex-col gap-6", tab === "Motion" ? "flex" : "hidden")}>
        {(bp.motion?.length ?? 0) > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 font-mono text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Element</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">From → To</th>
                  <th className="px-3 py-2">Timing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bp.motion!.map((m, i) => (
                  <tr key={`${i}-${m.element ?? ""}`}>
                    <td className="px-3 py-2 font-medium text-foreground">{m.element}</td>
                    <td className="px-3 py-2 text-muted-foreground">{m.motion_class ?? m.change}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{m.from} → {m.to}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {[m.duration_ms ? `${m.duration_ms}ms` : null, m.easing].filter(Boolean).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(bp.blind_spots?.length ?? 0) > 0 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
              What video honestly can&apos;t tell you
            </h2>
            <ul className="ml-5 list-disc space-y-1 text-[15px] text-muted-foreground">
              {bp.blind_spots!.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* STORYBOARD */}
      <div className={cn("flex-col gap-4", tab === "Storyboard" ? "flex" : "hidden")}>
        {frames === null ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[9/16] w-48 shrink-0 animate-pulse rounded-lg border border-border bg-muted" />
            ))}
          </div>
        ) : frames.length ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {frames.map((f, i) => (
              <figure key={`${i}-${f.label ?? ""}`} className="w-64 shrink-0">
                <img
                  src={f.img}
                  alt={f.label || f.annotations?.[0]?.label || `Moment ${i + 1}`}
                  loading="lazy"
                  className="w-full rounded-lg border border-border"
                />
                <figcaption className="mt-1.5 text-xs text-muted-foreground">
                  {f.label || f.annotations?.[0]?.label || `Moment ${i + 1}`}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No storyboard for this analysis.</p>
        )}
      </div>

      {/* CODE */}
      <div className={cn("flex-col gap-4", tab === "Code" ? "flex" : "hidden")}>
        {frameworks.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {frameworks.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFw(f)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      fw === f
                        ? "border-[#2A48F0] bg-[#2A48F0]/10 text-[#2A48F0]"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(s.code[fw] ?? "");
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {copiedCode ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copiedCode ? "Copied" : "Copy code"}
              </button>
            </div>
            <div className="relative">
              <pre
                className={cn(
                  "overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed text-foreground",
                  !codeOpen && "max-h-80 overflow-y-hidden",
                )}
              >
                {s.code[fw]}
              </pre>
              {!codeOpen && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-lg bg-gradient-to-t from-background to-transparent" />
              )}
              <button
                type="button"
                onClick={() => setCodeOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#2A48F0] hover:underline"
              >
                <ChevronDown className={cn("size-4 transition-transform", codeOpen && "rotate-180")} />
                {codeOpen ? "Collapse" : "Expand full code"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No exported code on this one yet — open it in the{" "}
            <Link href="/login" className="font-medium text-[#2A48F0] hover:underline">
              dashboard
            </Link>{" "}
            to generate Framer Motion, CSS, GSAP, or Tailwind.
          </p>
        )}
      </div>
    </div>
  );
}
