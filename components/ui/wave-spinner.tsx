"use client";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { bar: "w-0.5 h-3", gap: "gap-[3px]" },
  md: { bar: "w-1 h-5", gap: "gap-1" },
  lg: { bar: "w-1.5 h-8", gap: "gap-1.5" },
  xl: { bar: "w-2 h-12", gap: "gap-2" },
} as const;

export function WaveSpinner({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div
      className={cn("flex items-center", s.gap, className)}
      role="status"
      aria-label="Loading"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn("wave-bar rounded-full bg-primary", s.bar)}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}
