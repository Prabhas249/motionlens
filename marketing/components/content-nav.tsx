import Link from "next/link";
import { cn } from "@marketing/lib/utils";

// Blog ↔ Gallery switcher shown on both content indexes — the two halves of
// the content machine cross-feed each other (and their link equity).
const TABS = [
  { href: "/blog", label: "Blog" },
  { href: "/animations", label: "Gallery" },
] as const;

export function ContentNav({ active }: { active: "/blog" | "/animations" }) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            active === t.href
              ? "border-[#2A48F0] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
