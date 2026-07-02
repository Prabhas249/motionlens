"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  TerminalIcon,
  Trash2Icon,
} from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
};

const MCP_URL = "https://motionlens.dev/api/mcp";

const TOOLS = [
  {
    name: "analyze_clip",
    what: "Direct video URL → full Motion Blueprint, saved to your History",
    cost: "1–3 credits",
  },
  {
    name: "get_analysis",
    what: "Pull a saved blueprint + generated code by id",
    cost: "free",
  },
  {
    name: "list_analyses",
    what: "Your recent analyses (id, title, mode)",
    cost: "free",
  },
] as const;

function snippetFor(client: string, key: string): { label: string; text: string } {
  const json = JSON.stringify(
    { mcpServers: { motionlens: { url: MCP_URL, headers: { Authorization: `Bearer ${key}` } } } },
    null,
    2,
  );
  switch (client) {
    case "claude":
      return {
        label: "Run in any terminal",
        text: `claude mcp add --transport http motionlens ${MCP_URL} --header "Authorization: Bearer ${key}"`,
      };
    case "cursor":
      return { label: "~/.cursor/mcp.json", text: json };
    default:
      return { label: "mcp.json (any MCP client)", text: json };
  }
}

function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className={className}
      aria-label="Copy"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <CheckIcon className="size-3.5 text-emerald-400" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border bg-muted font-mono text-[10px] text-muted-foreground">
        {n}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export function McpView() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [client, setClient] = useState("claude");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/keys", { cache: "no-store" });
      if (r.ok) setKeys(((await r.json()).keys as ApiKey[]) ?? []);
    } catch {
      /* list just stays empty */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey() {
    setCreating(true);
    setError("");
    try {
      const r = await fetch("/api/keys", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Couldn't create the key");
      setFreshKey(d.key as string);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the key");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setRevoking(id);
    setError("");
    try {
      await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } finally {
      setRevoking(null);
    }
  }

  const snippet = snippetFor(client, freshKey ?? "YOUR_API_KEY");

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* page header — one eyebrow, one title, one line of copy, one endpoint pill */}
      <header className="mb-5">
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          model context protocol
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Use MotionLens in your editor</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {MCP_URL.replace("https://", "")}
            <CopyButton value={MCP_URL} className="size-4 [&_svg]:size-3" />
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Connect once, and Claude Code or Cursor can analyze clips and read your saved
          blueprints straight from the terminal. Three steps, two minutes.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* LEFT — connect flow */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* keys */}
          <section className="rounded-xl border bg-card">
            <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
                <Step n={1}>
                  <span className="font-medium">Create an API key</span>
                </Step>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {keys.length}/3
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={createKey}
                disabled={creating || keys.length >= 3}
              >
                {creating ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <PlusIcon className="size-3.5" />
                )}
                New key
              </Button>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                You signed in here with Google — but your terminal has no login screen. An API
                key is its login: your editor sends it with every request, and MotionLens uses
                it to match the request to <i className="text-foreground not-italic">your</i>{" "}
                account, credits and History. Treat it like a password — anyone holding it can
                spend your credits. Revoke it here if it ever leaks.
              </p>
              {freshKey && (
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-primary">
                    copy now — shown only once
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-xs">{freshKey}</code>
                    <CopyButton value={freshKey} />
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
              {loaded && keys.length === 0 && !freshKey && (
                <p className="text-sm text-muted-foreground">
                  No keys yet — create one to connect your editor.
                </p>
              )}
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border bg-card px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{k.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {k.prefix}… · created {new Date(k.created_at).toLocaleDateString()}
                        {k.last_used_at
                          ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}`
                          : " · never used"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Revoke ${k.name}`}
                    onClick={() => revoke(k.id)}
                    disabled={revoking === k.id}
                  >
                    {revoking === k.id ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2Icon className="size-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* setup — lights up cobalt once a key exists and the snippet is real */}
          <section className={cn("rounded-xl border bg-card", freshKey && "border-primary/40")}>
            <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
              <Step n={2}>
                <span className="font-medium">Add it to your editor</span>
              </Step>
              <Tabs value={client} onValueChange={setClient} variant="segment">
                <TabsList>
                  <TabsTrigger value="claude" className="text-xs">Claude Code</TabsTrigger>
                  <TabsTrigger value="cursor" className="text-xs">Cursor</TabsTrigger>
                  <TabsTrigger value="other" className="text-xs">Other</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="p-4">
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {snippet.label}
              </p>
              <div className="relative rounded-lg border bg-muted/40">
                <pre className="overflow-x-auto p-3 pr-10 text-xs leading-relaxed whitespace-pre-wrap break-all">
                  {snippet.text}
                </pre>
                <CopyButton value={snippet.text} className="absolute top-1.5 right-1.5" />
              </div>
              {!freshKey && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Create a key above and the snippet fills itself in.
                </p>
              )}
            </div>
          </section>

          {/* try it */}
          <section className="rounded-xl border bg-card">
            <div className="flex h-12 shrink-0 items-center border-b px-4">
              <Step n={3}>
                <span className="font-medium">Ask your agent</span>
              </Step>
            </div>
            <div className="space-y-2 p-4">
              {[
                "analyze https://cdn.example.com/hero.mp4 with MotionLens and recreate it in Framer Motion",
                "list my MotionLens analyses and pull the blueprint of the latest one",
              ].map((q) => (
                <div
                  key={q}
                  className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <TerminalIcon className="size-3.5 shrink-0 text-primary" />
                  <p className="min-w-0 flex-1 font-mono text-xs leading-relaxed text-muted-foreground">
                    {q}
                  </p>
                  <CopyButton value={q} />
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT — reference */}
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border bg-card">
            <div className="flex h-12 shrink-0 items-center border-b px-4">
              <h2 className="text-sm font-medium">Tools</h2>
            </div>
            <div className="divide-y">
              {TOOLS.map((t) => (
                <div key={t.name} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-xs text-foreground">{t.name}</code>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px]",
                        t.cost === "free"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                          : "border-amber-400/30 bg-amber-400/10 text-amber-400",
                      )}
                    >
                      {t.cost}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t.what}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="flex h-12 shrink-0 items-center border-b px-4">
              <h2 className="text-sm font-medium">Good to know</h2>
            </div>
            <ul className="space-y-2 p-4 text-[11px] leading-relaxed text-muted-foreground">
              <li>
                <b className="text-foreground">Credits:</b> analyze_clip charges the same as the
                dashboard — Standard 1 · Annotated 2 · Precision 3. Failed runs are refunded.
              </li>
              <li>
                <b className="text-foreground">Clip caps:</b> ≤30s Standard/Annotated, ≤10s
                Precision, ≤80MB, direct file URL (mp4 · mov · webm).
              </li>
              <li>
                <b className="text-foreground">History:</b> MCP runs land in your sidebar History —
                open them in the dashboard for the storyboard and replay.
              </li>
              <li>
                <b className="text-foreground">Security:</b> keys are stored hashed and can be
                revoked here anytime. A key only sees its own account.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
