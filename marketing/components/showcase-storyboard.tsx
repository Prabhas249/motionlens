"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { Section } from "@marketing/components/page-shell";

type Frame = { img: string; label?: string; annotations?: { label?: string }[] };

// Storyboard frames live as a JSON blob in R2 (multi-MB of base64 stills) —
// streamed client-side so the page itself stays instant, same pattern the
// dashboard uses.
export function StoryboardStrip({ framesUrl }: { framesUrl: string }) {
  const [frames, setFrames] = useState<Frame[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(framesUrl)
      .then((r) => (r.ok ? r.json() : []))
      .then((f) => alive && setFrames(Array.isArray(f) ? f : []))
      .catch(() => alive && setFrames([]));
    return () => {
      alive = false;
    };
  }, [framesUrl]);

  if (frames === null)
    return (
      <Section title="Storyboard">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[9/16] w-48 shrink-0 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      </Section>
    );
  if (!frames.length) return null;

  return (
    <Section title="Storyboard">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {frames.map((f, i) => (
          <figure key={`${i}-${f.label ?? ""}`} className="w-56 shrink-0">
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
    </Section>
  );
}
