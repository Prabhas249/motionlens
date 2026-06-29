"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckIcon, Loader2Icon } from "lucide-react";

export function AccountForm({
  email,
  avatar,
  name,
  displayName,
}: {
  email: string;
  avatar: string;
  name: string;
  displayName: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(displayName ?? name ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty = value.trim() !== (displayName ?? name ?? "").trim();

  async function save() {
    setStatus("saving");
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: value.trim() || null }),
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
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name and how you sign in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="text-lg">
              {(name || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            Shown across MotionLens. Defaults to your Google name.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled className="max-w-sm" />
          <p className="text-xs text-muted-foreground">
            Managed by your Google sign-in — can&apos;t be changed here.
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-sm text-muted-foreground">
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
          Save changes
        </Button>
      </CardFooter>
    </Card>
  );
}
