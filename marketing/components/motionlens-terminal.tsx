"use client";

import {
  TerminalAnimationCommandBar,
  TerminalAnimationContent,
  TerminalAnimationOutput,
  TerminalAnimationRoot,
  TerminalAnimationTabList,
  TerminalAnimationTabTrigger,
  TerminalAnimationWindow,
  type TabContent,
} from "@marketing/components/ui/terminal-animation";
import { cn } from "@marketing/lib/utils";

const tabs: TabContent[] = [
  {
    label: "install",
    command: "claude mcp add motionlens",
    lines: [
      { text: "", delay: 80 },
      {
        text: "  Adding MotionLens MCP server…",
        color: "text-[#b39aff]",
        delay: 500,
      },
      { text: "  ↳ fetching manifest", color: "text-neutral-500", delay: 280 },
      {
        text: "  ↳ registering tools: analyze · blueprint · export",
        color: "text-neutral-500",
        delay: 340,
      },
      { text: "", delay: 120 },
      {
        text: "  ✓ Installed · connected to Claude Code",
        color: "text-[#22ff73]",
        delay: 320,
      },
      {
        text: "  Your agent can now read motion from any video.",
        color: "text-neutral-300",
        delay: 300,
      },
    ],
  },
  {
    label: "analyze",
    command: "motionlens analyze hero.mov",
    lines: [
      { text: "", delay: 80 },
      { text: "  • Watching the clip…", color: "text-[#b39aff]", delay: 500 },
      {
        text: "  • Reading layers, timings, easings…",
        color: "text-neutral-400",
        delay: 650,
      },
      { text: "", delay: 120 },
      {
        text: "  ✓ 7 motions · 3 layers · 1.8s",
        color: "text-[#22ff73]",
        delay: 280,
      },
      {
        text: "  ✓ Motion Blueprint ready → blueprint.json",
        color: "text-[#32f3e9]",
        delay: 260,
      },
    ],
  },
  {
    label: "export",
    command: "motionlens export --framer",
    lines: [
      { text: "", delay: 80 },
      {
        text: "  Compiling Blueprint → Framer Motion…",
        color: "text-[#b39aff]",
        delay: 500,
      },
      { text: "  ✓ Wrote Hero.tsx", color: "text-[#22ff73]", delay: 260 },
      {
        text: "  ✓ Pixel-perfect — ready to paste",
        color: "text-[#32f3e9]",
        delay: 260,
      },
    ],
  },
];

export function MotionLensTerminal({ className }: { className?: string }) {
  return (
    <TerminalAnimationRoot
      tabs={tabs}
      alwaysDark
      className={cn("w-full", className)}
    >
      <TerminalAnimationWindow
        backgroundColor="#0b0b0c"
        minHeight="20rem"
        className="rounded-xl! border border-white/10 shadow-2xl"
      >
        {/* title bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <TerminalAnimationTabList className="ml-1 flex gap-1">
            {tabs.map((t, i) => (
              <TerminalAnimationTabTrigger
                key={t.label}
                index={i}
                className="cursor-pointer rounded-md px-2.5 py-1 font-mono text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-200 data-[state=active]:bg-white/10 data-[state=active]:text-white"
              >
                {t.label}
              </TerminalAnimationTabTrigger>
            ))}
          </TerminalAnimationTabList>
        </div>

        {/* body */}
        <TerminalAnimationContent className="font-mono text-xs leading-relaxed md:text-sm">
          <div className="flex items-center text-neutral-100">
            <span className="mr-2 text-[#22ff73]">$</span>
            <TerminalAnimationCommandBar />
          </div>
          <TerminalAnimationOutput
            className="mt-2 whitespace-pre"
            renderLine={(line, _i, visible) =>
              visible ? (
                <div className={cn("text-neutral-300", line.color)}>
                  {line.text || " "}
                </div>
              ) : null
            }
          />
        </TerminalAnimationContent>
      </TerminalAnimationWindow>
    </TerminalAnimationRoot>
  );
}
