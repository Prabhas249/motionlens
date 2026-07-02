import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "@marketing/components/page-shell";
import { POSTS } from "@marketing/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on UI motion, animation teardowns, and giving AI coding agents eyes for motion — from the team building MotionLens.",
};

export default function BlogIndex() {
  return (
    <PageShell
      eyebrow="Blog"
      title="Notes on motion"
      intro="Animation teardowns, engineering notes, and tutorials on making AI agents implement motion correctly."
    >
      <div className="flex flex-col divide-y divide-border">
        {POSTS.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group flex flex-col gap-2 py-6 first:pt-0"
          >
            <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
              <span className="text-[#2A48F0]">{p.tag}</span>
              <span>{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              <span>{p.minutes} min</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-[#2A48F0] transition-colors">
              {p.title}
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{p.description}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
