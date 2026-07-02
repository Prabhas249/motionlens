import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@marketing/components/page-shell";
import { listShowcases } from "@/lib/showcase";
import { ContentNav } from "@marketing/components/content-nav";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Animation gallery — real UI motion, decoded",
  description:
    "Real UI animations analyzed frame by frame: timings, easing, choreography, and agent-ready code. Every page is a live Motion Blueprint you can replay and recreate.",
  alternates: { canonical: "/animations" },
};

export default async function AnimationsIndex() {
  const showcases = await listShowcases();
  return (
    <PageShell
      eyebrow="Gallery"
      title="Real UI motion, decoded"
      intro="Every entry is a real analysis: the clip, the storyboard, and the exact timings + easing a developer (or their AI agent) can build from."
    >
      <ContentNav active="/animations" />
      <div className="flex flex-col divide-y divide-border">
        {showcases.map((s) => (
          <Link
            key={s.slug}
            href={`/animations/${s.slug}`}
            className="group flex flex-col gap-2 py-6 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="text-[#2A48F0] capitalize">{s.mode}</span>
              {s.pattern_tags.slice(0, 4).map((t) => (
                <span key={t} className="rounded-full border border-border px-2 py-0.5">
                  {t}
                </span>
              ))}
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-[#2A48F0]">
              {s.title}
            </h2>
            {s.blueprint.summary && (
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {s.blueprint.summary}
              </p>
            )}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Want your animation decoded like this?{" "}
        <Link href="/login" className="font-medium text-[#2A48F0] hover:underline">
          Analyze any clip or live site
        </Link>{" "}
        — 5 free credits, no card.
      </p>
    </PageShell>
  );
}
