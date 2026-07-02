import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@marketing/components/page-shell";
import { PostShell, Code } from "@marketing/components/post-shell";
import { POSTS } from "@marketing/lib/posts";

const post = POSTS.find((p) => p.slug === "animation-to-code-claude-code-mcp")!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
};

export default function Page() {
  return (
    <PostShell post={post}>
      <Section title="The problem">
        <p>
          You&apos;ve seen it happen: you show your AI agent a beautiful animation and ask for
          &ldquo;something like this,&rdquo; and it produces a sad 300ms linear fade. Not because the
          model can&apos;t write animation code — because <em>describing motion in words</em> loses
          exactly the information that makes motion good: the timings, the easing, the order, the
          overlap.
        </p>
        <p>
          MotionLens fixes the input. It watches the animation and hands your agent a{" "}
          <strong className="text-foreground">Motion Blueprint</strong> — a structured spec of every
          animated element with real values — over MCP, so the agent reads it natively.
        </p>
      </Section>

      <Section title="Setup (two minutes)">
        <p>
          1. Sign in at{" "}
          <Link href="/login" className="font-medium text-[#2A48F0] hover:underline">motionlens.dev</Link>{" "}
          (5 free credits, no card) → open <strong className="text-foreground">MCP</strong> in the
          sidebar → create an API key.
        </p>
        <p>2. Add the server to Claude Code:</p>
        <Code>{`claude mcp add --transport http motionlens https://motionlens.dev/api/mcp \\
  --header "Authorization: Bearer YOUR_API_KEY"`}</Code>
        <p>
          Cursor and other MCP clients take the same URL + header in{" "}
          <code className="font-mono text-[13px]">mcp.json</code>. Nothing to install or run locally —
          it&apos;s one hosted endpoint.
        </p>
      </Section>

      <Section title="Use it">
        <p>Point it at a live site:</p>
        <Code>{`> analyze the first 10 seconds of https://feather.computer with MotionLens
  in precision mode, then recreate the hero animation in Framer Motion`}</Code>
        <p>
          Or at any clip URL — a screen recording, a Dribbble shot&apos;s video, a Loom export:
        </p>
        <Code>{`> analyze https://cdn.example.com/checkout-flow.mp4 with MotionLens and
  implement the card entrance in our design system`}</Code>
        <p>
          The agent gets back the blueprint: a summary, the beat-by-beat choreography, per-element
          motions (<em>what</em> moved, <em>from → to</em>, duration, easing, what fired together),
          feel tags, and an agent-ready prompt. Then it writes code from real values instead of vibes.
          Every run also lands in your dashboard History with a replay and an annotated storyboard.
        </p>
      </Section>

      <Section title="The four tools">
        <ul className="ml-5 list-disc space-y-1.5">
          <li><code className="font-mono text-[13px]">analyze_url</code> — records a live page headlessly (real frame timing) and analyzes it. Auto-playing motion only: load choreography, marquees, loaders. No cursor, so hover/click flows won&apos;t appear.</li>
          <li><code className="font-mono text-[13px]">analyze_clip</code> — direct video URL (mp4/mov/webm). Use this for interactions you recorded yourself.</li>
          <li><code className="font-mono text-[13px]">get_analysis</code> / <code className="font-mono text-[13px]">list_analyses</code> — free reads over your saved blueprints, so your agent can reference past analyses anytime.</li>
        </ul>
      </Section>

      <Section title="Honest limits">
        <p>
          Analyses read video sampled at 8–12fps: choreography, curves, and timing come out accurately;
          exact spring constants and single-frame micro-details don&apos;t — and the blueprint says so in
          its <em>blind spots</em> section rather than making numbers up. Standard mode costs 2 credits
          (blueprint + storyboard, clips ≤30s); Precision costs 3 (multi-pass verification, clips ≤10s).
          Failed runs refund automatically.
        </p>
      </Section>
    </PostShell>
  );
}
