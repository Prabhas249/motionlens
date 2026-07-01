import type { Metadata } from "next";
import { PageShell, Section } from "@marketing/components/page-shell";

export const metadata: Metadata = {
    title: "Documentation",
    description:
        "How MotionLens turns a UI animation into an agent-ready Motion Blueprint — modes, the Blueprint format, and the MCP server.",
};

export default function DocsPage() {
    return (
        <PageShell
            eyebrow="Documentation"
            title="Turn any animation into a Motion Blueprint"
            intro="MotionLens watches a UI animation and hands your AI coding agent a precise, framework-agnostic description it can build from — trigger, sequence, timing, easing, and feel."
        >
            <Section title="Quickstart">
                <p>Three steps, about a minute:</p>
                <ol className="ml-5 list-decimal space-y-1">
                    <li>
                        Sign in and open the dashboard. New accounts get{" "}
                        <strong className="text-foreground">5 free credits</strong> — no card.
                    </li>
                    <li>
                        Drop in a short clip (MP4/MOV/GIF) of the animation you want, or paste
                        a link and let the recorder capture it.
                    </li>
                    <li>
                        Pick a mode and hit <strong className="text-foreground">Analyze</strong>.
                        You get a Motion Blueprint you can copy straight into Claude Code, Cursor,
                        or any agent.
                    </li>
                </ol>
            </Section>

            <Section title="Analysis modes">
                <p>Each mode trades depth for credits — pick per clip:</p>
                <ul className="ml-5 list-disc space-y-2">
                    <li>
                        <strong className="text-foreground">Standard</strong> (1 credit) — a clean
                        Blueprint: summary, timeline, and per-element motion. Best for most
                        clips.
                    </li>
                    <li>
                        <strong className="text-foreground">Annotated</strong> (2 credits) — adds a
                        captioned storyboard of key frames so you (and multimodal agents) can see
                        the motion, not just read it.
                    </li>
                    <li>
                        <strong className="text-foreground">Precision</strong> (3 credits) — runs
                        an extra geometry pass that disambiguates tricky mechanics (scale vs. slide
                        vs. camera-pan) for the highest-fidelity spec.
                    </li>
                </ul>
            </Section>

            <Section title="The Motion Blueprint">
                <p>
                    Every analysis returns one structured Blueprint. It&apos;s framework-agnostic —
                    the same spec works for React, React Native, Flutter, SwiftUI, or Jetpack
                    Compose:
                </p>
                <pre className="overflow-x-auto rounded-lg border border-border bg-[#0b0b0c] p-4 font-mono text-[12px] leading-relaxed text-neutral-300">
                    {`{
  "summary": "one plain-English sentence",
  "trigger": "load | scroll | hover | tap | other",
  "elements": ["short names of the elements"],
  "timeline": [{ "t": "0.0s", "event": "what happens" }],
  "motion": [{
    "element": "which element",
    "change": "fade | slide | scale | blur | ...",
    "from": "start state", "to": "end state",
    "duration_ms": 300, "easing": "ease-out",
    "stagger_ms": 60, "direction": "up|down|in|out|none"
  }],
  "feel": ["smooth", "springy", "premium"],
  "agent_prompt": "ready-to-paste instruction for a coding agent",
  "confidence": "high | medium | low"
}`}
                </pre>
                <p>
                    Honest promise: a Blueprint gets your agent ~85–90% of the way there — you
                    tweak the last bit of feel. It&apos;s not a pixel-perfect clone.
                </p>
            </Section>

            <Section title="Use it with your agent">
                <p>
                    Hit <strong className="text-foreground">Copy Blueprint</strong> and paste it
                    into your agent&apos;s chat, or use the built-in agent prompt. Tell the agent to
                    &quot;preserve the feel over exact pixels&quot; and it will implement the motion
                    in your stack.
                </p>
            </Section>

            <Section title="MCP server">
                <p>
                    MotionLens runs as an MCP server, so your agent can analyze motion without
                    leaving the editor. Once connected, two tools are available —{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">analyze_video</code>{" "}
                    and{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">analyze_url</code>.
                    See the{" "}
                    <a href="/api-reference" className="font-medium text-[#2A48F0] hover:underline">
                        API Reference
                    </a>{" "}
                    for parameters and response shapes.
                </p>
            </Section>

            <Section title="Credits & plans">
                <p>
                    Analyses cost credits by mode (1 / 2 / 3). Free includes 5 credits, Pro is
                    $9/mo for 150, Studio is $19/mo for 300. Refunds are automatic if an analysis
                    fails. See{" "}
                    <a href="/#pricing" className="font-medium text-[#2A48F0] hover:underline">
                        pricing
                    </a>{" "}
                    for the full breakdown.
                </p>
            </Section>
        </PageShell>
    );
}
