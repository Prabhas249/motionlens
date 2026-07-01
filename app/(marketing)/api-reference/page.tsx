import type { Metadata } from "next";
import { PageShell, Section } from "@marketing/components/page-shell";

export const metadata: Metadata = {
    title: "API Reference",
    description:
        "The MotionLens MCP tools — analyze_video and analyze_url — parameters, defaults, and what they return.",
};

function Param({
    name,
    type,
    required,
    children,
}: {
    name: string;
    type: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="border-b border-border py-3 last:border-b-0">
            <div className="flex flex-wrap items-baseline gap-2">
                <code className="font-mono text-[13px] font-medium text-foreground">
                    {name}
                </code>
                <span className="font-mono text-[11px] text-muted-foreground">{type}</span>
                {required && (
                    <span className="rounded bg-[#2A48F0]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#2A48F0]">
                        required
                    </span>
                )}
            </div>
            <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                {children}
            </p>
        </div>
    );
}

export default function ApiReferencePage() {
    return (
        <PageShell
            eyebrow="API Reference"
            title="MotionLens MCP tools"
            intro="MotionLens exposes its engine over the Model Context Protocol (MCP). Connect the server to Claude Code, Cursor, Windsurf, or any MCP client and your agent gets two tools. Each writes a Motion Blueprint + ready-to-paste code to disk and returns a summary, file paths, a code preview, and storyboard frames."
        >
            <Section title="analyze_video">
                <p>
                    Analyze a local UI-animation clip (mp4 / mov / webm) on the user&apos;s
                    machine.
                </p>
                <div className="mt-2 rounded-lg border border-border bg-card/50 px-4">
                    <Param name="path" type="string" required>
                        Absolute path to the video file on disk.
                    </Param>
                    <Param name="framework" type="enum">
                        Target for the generated code — <code>Framer Motion</code> (default),{" "}
                        <code>CSS</code>, <code>GSAP</code>, or <code>Tailwind</code>.
                    </Param>
                    <Param name="mode" type="enum">
                        Analysis depth — <code>standard</code> (default, ~40s),{" "}
                        <code>annotated</code> (adds a callout storyboard), or{" "}
                        <code>precision</code> (multi-pass, most accurate).
                    </Param>
                    <Param name="include_storyboard" type="boolean">
                        Return storyboard keyframe images. Default <code>true</code>.
                    </Param>
                    <Param name="save_dir" type="string">
                        Directory to write the Blueprint + code into. Default{" "}
                        <code>./motionlens-output</code>.
                    </Param>
                </div>
            </Section>

            <Section title="analyze_url">
                <p>
                    Record a live website or app at a URL (headless browser) and analyze its
                    motion. Best for auto-playing and scroll-triggered animation; tap-driven
                    interactions should be recorded manually and passed to{" "}
                    <code>analyze_video</code>.
                </p>
                <div className="mt-2 rounded-lg border border-border bg-card/50 px-4">
                    <Param name="url" type="string" required>
                        The URL to record and analyze, e.g. <code>https://linear.app</code>.
                    </Param>
                    <Param name="interaction" type="enum">
                        <code>load</code> (default) records the page-load animation;{" "}
                        <code>scroll</code> slowly scrolls top→bottom for scroll-triggered reveals.
                    </Param>
                    <Param name="viewport" type="enum">
                        <code>desktop</code> (1280×800, default) or <code>mobile</code> (390×844).
                    </Param>
                    <Param name="seconds" type="number">
                        Recording length. Default <code>10</code>, clamped 3–30.
                    </Param>
                    <Param name="framework / mode / include_storyboard / save_dir" type="—">
                        Same as <code>analyze_video</code>.
                    </Param>
                </div>
            </Section>

            <Section title="Response">
                <p>Both tools return the same shape:</p>
                <pre className="overflow-x-auto rounded-lg border border-border bg-[#0b0b0c] p-4 font-mono text-[12px] leading-relaxed text-neutral-300">
                    {`{
  "summary": "one-sentence description of the motion",
  "blueprint_path": "./motionlens-output/blueprint.json",
  "code_path": "./motionlens-output/animation.tsx",
  "code_preview": "…first lines of the generated code…",
  "storyboard": ["frame-1.png", "frame-2.png", "frame-3.png"],
  "confidence": "high | medium | low"
}`}
                </pre>
                <p>
                    The full Motion Blueprint (trigger, timeline, per-element motion, easing,
                    stagger, feel, agent prompt) is written to <code>blueprint_path</code> so
                    nothing truncates. See the{" "}
                    <a href="/docs" className="font-medium text-[#2A48F0] hover:underline">
                        Documentation
                    </a>{" "}
                    for the Blueprint schema.
                </p>
            </Section>

            <Section title="Auth & limits">
                <p>
                    The MCP server authenticates against your MotionLens account; each analysis
                    consumes credits by mode (1 / 2 / 3). Failed analyses are refunded
                    automatically. Need higher throughput? Reach us at{" "}
                    <a
                        href="mailto:support@motionlens.dev"
                        className="font-medium text-[#2A48F0] hover:underline"
                    >
                        support@motionlens.dev
                    </a>
                    .
                </p>
            </Section>
        </PageShell>
    );
}
