"use client";

import { useCallback, useEffect, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Shows the signed-in user's remaining credits in the app header.
// Refetches on mount, on window focus, and whenever a run fires the
// "credits-updated" event (dispatched by the dashboard after an analysis).
export function CreditsBadge({ className }: { className?: string }) {
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("free");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/credits", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setCredits(typeof d.credits === "number" ? d.credits : null);
      setPlan(typeof d.plan === "string" ? d.plan : "free");
    } catch {
      /* ignore — badge just won't render */
    }
  }, []);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener("credits-updated", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("credits-updated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [load]);

  if (credits === null) return null;

  const out = credits <= 0;
  const paid = plan !== "free";

  return (
    <a
      href="/settings/billing"
      title={
        out
          ? "Out of credits — upgrade"
          : `${credits} credit${credits === 1 ? "" : "s"} left${paid ? ` · ${plan} plan` : ""}`
      }
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
        out
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <SparklesIcon className="size-3.5 text-primary" />
      {out ? (
        <span>Out of credits · Upgrade</span>
      ) : (
        <span>
          <b className="text-foreground">{credits}</b> credit{credits === 1 ? "" : "s"}
        </span>
      )}
    </a>
  );
}
