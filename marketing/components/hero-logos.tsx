"use client";

import {
  Bolt,
  ClaudeAI,
  Cursor,
  Github,
  GoogleGemini,
  HuggingFace,
  KiloCode,
  Lovable,
  ModelContextProtocol,
  OpenAI,
  V0,
  Windsurf,
} from "@aliimam/logos";

import { Attraction } from "@marketing/components/ui/attraction";

// Curated for MotionLens' users: AI coding agents, AI IDEs, and the MCP
// standard — the tools that would actually consume agent-ready context.
const logos = [
  ClaudeAI, // Claude / Claude Code (Anthropic)
  OpenAI, // ChatGPT / Codex
  Cursor, // AI code editor
  GoogleGemini, // Gemini CLI / Google Antigravity
  Github, // Copilot
  Windsurf, // Codeium's AI IDE
  Bolt, // bolt.new AI app builder
  V0, // Vercel v0 — AI UI generation
  Lovable, // AI app builder
  KiloCode, // open-source AI coding agent (MCP-native)
  ModelContextProtocol, // MCP — the agent context standard
  HuggingFace, // AI model hub
];

// Frame the hero around the edges; center stays clear for the headline.
const positions: [number, number][] = [
  [12, 12],
  [38, 9],
  [62, 9],
  [88, 12],
  [6, 38],
  [94, 38],
  [6, 64],
  [94, 64],
  [12, 88],
  [38, 91],
  [62, 91],
  [88, 88],
];

export function HeroLogos({ className }: { className?: string }) {
  return (
    <Attraction
      gravity={{ x: 0, y: 0 }}
      friction={0}
      frictionAir={0.03}
      restitution={0.6}
      dragStiffness={0.25}
      className={className}
    >
      {logos.map((Logo, i) => {
        const [x, y] = positions[i % positions.length];
        return (
          <div
            key={i}
            data-x={`${x}%`}
            data-y={`${y}%`}
            data-shape="circle"
            data-restitution="0.6"
            data-friction="0"
            className="flex h-16 w-16 items-center justify-center rounded-full border border-black/5 bg-white/90 shadow-lg shadow-black/10 select-none"
          >
            <Logo size={32} />
          </div>
        );
      })}
    </Attraction>
  );
}
