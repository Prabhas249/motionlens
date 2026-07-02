import type { Metadata } from "next";
import { Section } from "@marketing/components/page-shell";
import { PostShell, Code } from "@marketing/components/post-shell";
import { POSTS } from "@marketing/lib/posts";

const post = POSTS.find((p) => p.slug === "why-ai-agents-cant-see-motion")!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
};

export default function Page() {
  return (
    <PostShell post={post}>
      <Section title="The one-frame-per-second problem">
        <p>
          Feed a video to a multimodal model with default settings and it samples roughly{" "}
          <strong className="text-foreground">one frame per second</strong>. A modern UI animation
          lives and dies inside 300–800ms. At 1fps, a logo that fades in while the keyboard slides up
          while three suggestions stagger into place is — at best — two frames: before and after. The
          model literally never saw the choreography. It saw a slideshow.
        </p>
        <p>
          That&apos;s the root reason &ldquo;make it like this video&rdquo; fails with AI coding agents.
          It&apos;s not a reasoning gap. It&apos;s a <em>perception</em> gap.
        </p>
      </Section>

      <Section title="What we do differently">
        <p>MotionLens is a pipeline of small, honest fixes stacked on top of each other:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong className="text-foreground">Sample at 8–12fps, per mode.</strong> Enough temporal
            resolution to catch a 250ms spring; past ~12fps we measured diminishing returns — multi-pass
            analysis beats more frames.
          </li>
          <li>
            <strong className="text-foreground">Measure motion from pixels, not vibes.</strong> Before
            the model sees anything, ffmpeg diffs consecutive frames and produces a motion-energy
            timeline: bursts (discrete events), steady spans (loops), settles (holds). The model gets
            this as ground truth to anchor its timeline on, instead of inferring event boundaries from
            sparse frames.
          </li>
          <li>
            <strong className="text-foreground">Sharp keyframes at the moments that matter.</strong>{" "}
            Full-resolution stills are extracted exactly at the energy events and attached alongside
            the video — the video is the source of truth for motion, the stills for appearance.
          </li>
          <li>
            <strong className="text-foreground">Record with real frame timing.</strong> When we record
            a live site, frames are captured with the browser&apos;s own timestamps and assembled with
            true per-frame durations. A 420ms ease-out in the browser is a 420ms ease-out in the video.
            A naive constant-fps recorder would quietly distort every duration — fatal for a product
            whose whole job is timing.
          </li>
          <li>
            <strong className="text-foreground">Verify, then ship.</strong> Precision mode runs a second
            pass that re-watches the video against the draft blueprint and corrects it — the same trick
            that works for human reviewers: the second look catches what the first one assumed.
          </li>
        </ul>
      </Section>

      <Section title="The part most tools get wrong: admitting the ceiling">
        <p>
          A video sampled at 12fps cannot tell you a spring&apos;s stiffness constant, whether a
          single-frame squish happened, or the exact cubic-bezier of a 200ms curve. Tools that output
          those numbers anyway are hallucinating precision — and a spec that lies is worse than no spec,
          because your agent will faithfully implement the lie.
        </p>
        <p>
          So every Motion Blueprint carries a <em>blind spots</em> section listing what genuinely
          couldn&apos;t be determined from the clip, and per-motion confidence flags anything inferred.
          Recent benchmark work backs this up: on UI-animation comprehension tests, several strong
          general models fabricate elements that don&apos;t exist and misclassify motion types.
          Perception honesty is the product.
        </p>
      </Section>

      <Section title="What comes out the other end">
        <p>A structured blueprint your agent reads natively over MCP:</p>
        <Code>{`{
  "summary": "Radial explosion of mail stickers around a centered headline…",
  "beats": ["Headline fades into center", "Stickers stack, then detonate…"],
  "motion": [
    { "element": "Stickers", "change": "scatter", "from": "center",
      "to": "scattered field", "easing": "ease-out-back", "duration_ms": 600 },
    { "element": "Stickers", "change": "drift", "from": "-3deg", "to": "3deg",
      "concurrent_with": "ambient", "confidence": "high" }
  ],
  "blind_spots": ["Exact spring constants for the explosion overshoot"],
  "agent_prompt": "Recreate a radial sticker explosion: …"
}`}</Code>
        <p>
          Words lose motion. Specs carry it.{" "}
          <a href="/login" className="font-medium text-[#2A48F0] hover:underline">
            Give your agent eyes
          </a>{" "}
          — 5 free credits, no card.
        </p>
      </Section>
    </PostShell>
  );
}
