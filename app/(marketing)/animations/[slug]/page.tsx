import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, Section } from "@marketing/components/page-shell";
import { getShowcase, listShowcaseSlugs, listShowcases } from "@/lib/showcase";
import { StoryboardStrip } from "@marketing/components/showcase-storyboard";

export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await listShowcaseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const s = await getShowcase(slug);
  if (!s) return {};
  const title = `${s.title} — Motion Blueprint`;
  const description = `${s.blueprint.summary ?? s.title} Frame-accurate timings, easing, and choreography — with agent-ready code.`.slice(0, 300);
  return {
    title,
    description,
    alternates: { canonical: `/animations/${slug}` },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function ShowcasePage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const s = await getShowcase(slug);
  if (!s) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${s.title} — Motion Blueprint`,
    description: s.blueprint.summary,
    datePublished: s.created_at,
    author: { "@type": "Organization", name: "MotionLens", url: "https://motionlens.dev" },
    mainEntityOfPage: `https://motionlens.dev/animations/${s.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageShell
        eyebrow={`${s.mode} analysis · ${s.pattern_tags.slice(0, 3).join(" · ")}`}
        title={s.title}
        intro={s.blueprint.summary}
      >
        {s.clipUrl && (
          <Section title="The animation">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={s.clipUrl}
              controls
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full rounded-xl border border-border bg-black"
            />
          </Section>
        )}

        {s.blueprint.story && (
          <Section title="What happens">
            <p>{s.blueprint.story}</p>
          </Section>
        )}

        {(s.blueprint.beats?.length ?? 0) > 0 && (
          <Section title="Choreography, beat by beat">
            <ol className="ml-5 list-decimal space-y-1.5">
              {s.blueprint.beats!.map((b, i) => (
                <li key={`${i}-${b.slice(0, 20)}`}>{b}</li>
              ))}
            </ol>
          </Section>
        )}

        {(s.blueprint.motion?.length ?? 0) > 0 && (
          <Section title="The measured motion">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 font-mono text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Element</th>
                    <th className="px-3 py-2">Change</th>
                    <th className="px-3 py-2">From → To</th>
                    <th className="px-3 py-2">Timing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {s.blueprint.motion!.map((m, i) => (
                    <tr key={`${i}-${m.element ?? ""}`}>
                      <td className="px-3 py-2 font-medium text-foreground">{m.element}</td>
                      <td className="px-3 py-2 text-muted-foreground">{m.motion_class ?? m.change}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {m.from} → {m.to}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {[m.duration_ms ? `${m.duration_ms}ms` : null, m.easing].filter(Boolean).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {s.framesUrl && <StoryboardStrip framesUrl={s.framesUrl} />}

        {(s.blueprint.feel?.length ?? 0) > 0 && (
          <Section title="Feel">
            <div className="flex flex-wrap gap-1.5">
              {s.blueprint.feel!.map((f) => (
                <span key={f} className="rounded-full border border-border px-2.5 py-0.5 text-sm text-foreground/80">
                  {f}
                </span>
              ))}
            </div>
          </Section>
        )}

        {(s.blueprint.blind_spots?.length ?? 0) > 0 && (
          <Section title="What video honestly can't tell you">
            <ul className="ml-5 list-disc space-y-1">
              {s.blueprint.blind_spots!.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Recreate it">
          <p>
            This entire page was generated by one analysis. Point your AI agent at any clip or
            live site and get the same blueprint — plus ready-to-paste Framer Motion, CSS, and
            GSAP code.{" "}
            <Link href="/login" className="font-medium text-[#2A48F0] hover:underline">
              Try MotionLens free
            </Link>{" "}
            (5 credits, no card) or read{" "}
            <Link href="/blog/animation-to-code-claude-code-mcp" className="font-medium text-[#2A48F0] hover:underline">
              the Claude Code setup guide
            </Link>
            .
          </p>
        </Section>

        <RelatedShowcases current={s.slug} tags={s.pattern_tags} />
      </PageShell>
    </>
  );
}

// Internal linking: sibling pages sharing a pattern tag keep crawlers (and
// humans) moving through the gallery.
async function RelatedShowcases({ current, tags }: { current: string; tags: string[] }) {
  const all = await listShowcases();
  const related = all
    .filter((x) => x.slug !== current)
    .sort(
      (a, b) =>
        b.pattern_tags.filter((t) => tags.includes(t)).length -
        a.pattern_tags.filter((t) => tags.includes(t)).length,
    )
    .slice(0, 3);
  if (!related.length) return null;
  return (
    <Section title="More decoded animations">
      <ul className="ml-5 list-disc space-y-1">
        {related.map((r) => (
          <li key={r.slug}>
            <Link href={`/animations/${r.slug}`} className="font-medium text-[#2A48F0] hover:underline">
              {r.title}
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
