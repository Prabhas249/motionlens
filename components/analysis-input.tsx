"use client";

import * as React from "react";
import { UploadCloud, AlertCircle, Sparkles, ImagePlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FilePreview } from "@/components/ui/file-preview";
import { WaveSpinner } from "@/components/ui/wave-spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import type { Mode } from "@/components/blueprint-view";

const MODES: { value: Mode; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "annotated", label: "Annotated" },
  { value: "precision", label: "Precision" },
];

export function AnalysisInput({
  mode,
  setMode,
  busy,
  phase,
  progress,
  error,
  onAnalyze,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  busy: boolean;
  phase: "idle" | "uploading" | "analyzing" | "error";
  progress: number;
  error: string;
  onAnalyze: (file: File, context: string, screenshot?: File | null) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [context, setContext] = React.useState("");
  const [screenshot, setScreenshot] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const shotRef = React.useRef<HTMLInputElement>(null);

  // object URL for the screenshot thumbnail (created once per file, revoked on change/unmount)
  const shotUrl = React.useMemo(
    () => (screenshot ? URL.createObjectURL(screenshot) : null),
    [screenshot],
  );
  React.useEffect(() => {
    return () => {
      if (shotUrl) URL.revokeObjectURL(shotUrl);
    };
  }, [shotUrl]);

  function clearAll() {
    setFile(null);
    setScreenshot(null);
    setContext("");
  }

  // ---- BUSY ----
  if (busy) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center">
        <WaveSpinner size="md" />
        <p className="text-sm font-medium">
          {phase === "uploading" ? "Uploading clip…" : "Analyzing…"}
        </p>
      </div>
    );
  }

  // ---- FILE SELECTED → preview + optional screenshot + context + analyze ----
  if (file) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-3">
        <FilePreview
          files={[{ id: "clip", name: file.name, type: file.type }]}
          onRemove={clearAll}
        />

        {/* Optional final-frame screenshot → exact colors / sizes / fonts */}
        {screenshot ? (
          <FilePreview
            files={[{ id: "shot", name: screenshot.name, type: screenshot.type, url: shotUrl ?? undefined }]}
            onRemove={() => setScreenshot(null)}
          />
        ) : (
          <button
            type="button"
            onClick={() => shotRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
          >
            <ImagePlus className="size-4" /> Add final-frame screenshot — sharper colors &amp; sizes
          </button>
        )}

        <Textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Add context (optional) — e.g. “focus on the card hover, ignore the cursor”"
          className="min-h-16 resize-none text-sm"
        />

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          variant="segment"
          className="w-full"
        >
          <TabsList className="w-full">
            {MODES.map((m) => (
              <TabsTrigger key={m.value} value={m.value} className="flex-1 text-xs">
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Button onClick={() => onAnalyze(file, context, screenshot)} className="w-full gap-1.5">
          <Sparkles className="size-4" /> Analyze
        </Button>

        {phase === "error" && error && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5 shrink-0" /> {error}
          </p>
        )}

        <input
          ref={shotRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setScreenshot(f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  // ---- EMPTY → dropzone ----
  return (
    <div className="rounded-xl border bg-card p-3">
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition",
          dragging ? "border-primary bg-primary/5" : "hover:border-foreground/30 hover:bg-accent/40",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Drop a clip to analyze</p>
        <p className="text-xs text-muted-foreground">mp4 · mov · webm — or click</p>
      </div>

      {phase === "error" && error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
