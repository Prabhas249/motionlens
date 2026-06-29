"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckIcon, Loader2Icon } from "lucide-react";

type Key = "product_updates" | "run_complete" | "marketing";

const OPTIONS: { key: Key; label: string; description: string; default: boolean }[] = [
  {
    key: "run_complete",
    label: "Run finished",
    description: "Email me when a long analysis finishes.",
    default: true,
  },
  {
    key: "product_updates",
    label: "Product updates",
    description: "New features and improvements to MotionLens.",
    default: true,
  },
  {
    key: "marketing",
    label: "Tips & offers",
    description: "Occasional tips, guides, and promotions.",
    default: false,
  },
];

export function NotificationsForm({
  settings,
}: {
  settings: Record<string, unknown>;
}) {
  const router = useRouter();
  const initial = OPTIONS.reduce<Record<Key, boolean>>(
    (acc, o) => {
      const stored = (settings?.notifications as Record<string, boolean>)?.[o.key];
      acc[o.key] = typeof stored === "boolean" ? stored : o.default;
      return acc;
    },
    {} as Record<Key, boolean>,
  );

  const [values, setValues] = useState<Record<Key, boolean>>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = OPTIONS.some((o) => values[o.key] !== initial[o.key]);

  async function save() {
    setStatus("saving");
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { ...settings, notifications: values },
        }),
      });
      if (!r.ok) throw new Error();
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email notifications</CardTitle>
        <CardDescription>Choose what we email you about.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {OPTIONS.map((o) => (
          <div key={o.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium">{o.label}</p>
              <p className="text-sm text-muted-foreground">{o.description}</p>
            </div>
            <Switch
              checked={values[o.key]}
              onCheckedChange={(v) => setValues((s) => ({ ...s, [o.key]: v }))}
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-sm">
          {status === "saved" && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="size-4" /> Saved
            </span>
          )}
          {status === "error" && (
            <span className="text-destructive">Couldn&apos;t save — try again.</span>
          )}
        </span>
        <Button onClick={save} disabled={!dirty || status === "saving"}>
          {status === "saving" && <Loader2Icon className="animate-spin" />}
          Save preferences
        </Button>
      </CardFooter>
    </Card>
  );
}
