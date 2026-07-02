"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HistoryIcon } from "lucide-react";

type Item = { id: string; title: string | null; mode: string; created_at: string };

function ago(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 7) return `${dd}d`;
  return `${Math.floor(dd / 7)}w`;
}

export function NavHistory() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/history", { cache: "no-store" });
      if (r.ok) setItems((await r.json()).items ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    setActiveId(new URLSearchParams(window.location.search).get("a"));
    load();
    const onUpdate = () => load();
    // dashboard announces the open analysis (fresh run / reset) → keep the highlight in sync
    const onActive = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string | null }>).detail;
      setActiveId(detail?.id ?? null);
    };
    window.addEventListener("credits-updated", onUpdate); // fires after each run
    window.addEventListener("history-updated", onUpdate);
    window.addEventListener("analysis-active", onActive as EventListener);
    return () => {
      window.removeEventListener("credits-updated", onUpdate);
      window.removeEventListener("history-updated", onUpdate);
      window.removeEventListener("analysis-active", onActive as EventListener);
    };
  }, [load]);

  return (
    <SidebarGroup className="min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center gap-1.5">
        <HistoryIcon className="size-3.5" />
        History
      </SidebarGroupLabel>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.id}>
              <SidebarMenuButton
                size="sm"
                isActive={activeId === it.id}
                className="h-auto items-start gap-2 py-1.5"
                render={<Link href={`/dashboard?a=${it.id}`} />}
                onClick={(e: MouseEvent) => {
                  // Let cmd/ctrl/middle-click open a new tab normally.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                  // Only the dashboard listens for load-analysis. From any other
                  // page (settings etc.) let the link navigate normally — the
                  // dashboard's ?a= deep-link loader takes it from there.
                  if (window.location.pathname !== "/dashboard") return;
                  e.preventDefault();
                  setActiveId(it.id);
                  window.history.replaceState(null, "", `/dashboard?a=${it.id}`);
                  window.dispatchEvent(
                    new CustomEvent("load-analysis", { detail: { id: it.id } }),
                  );
                }}
              >
                <span className="min-w-0 flex-1 truncate text-foreground/75">
                  {it.title || "Untitled analysis"}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {ago(it.created_at)}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {loaded && items.length === 0 && (
            <p className={cn("px-2 py-1.5 text-xs text-muted-foreground")}>
              No analyses yet — run one to see it here.
            </p>
          )}
        </SidebarMenu>
      </div>
    </SidebarGroup>
  );
}
