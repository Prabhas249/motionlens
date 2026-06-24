#!/usr/bin/env node
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API = (process.env.MOTIONLENS_API_URL || "http://localhost:3000").replace(/\/$/, "");

type Blueprint = {
  summary?: string;
  story?: string;
  beats?: string[];
  motion?: Array<Record<string, unknown>>;
  feel?: string[];
  blind_spots?: string[];
  agent_prompt?: string;
  confidence?: string;
};

const stripFences = (s: string) =>
  s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

// Derive a proper video MIME type from the file name so the upload isn't tagged
// application/octet-stream (which Gemini rejects).
const EXT_MIME: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", m4v: "video/x-m4v" };
const mimeFor = (name: string) =>
  EXT_MIME[name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? ""] ?? "video/mp4";

type Frame = { img?: string; label?: string; annotations?: Array<{ label?: string }> };

// POST to /api/analyze and read the NDJSON stream. Always grab the blueprint; if `includeStoryboard`,
// also wait for the frames line (storyboard keyframes), otherwise abort early for speed.
async function getAnalysis(
  buf: Buffer,
  name: string,
  mode: string,
  includeStoryboard: boolean,
): Promise<{ blueprint: Blueprint; frames: Frame[] }> {
  const form = new FormData();
  form.append("video", new Blob([new Uint8Array(buf)], { type: mimeFor(name) }), name);
  form.append("mode", mode);

  const ac = new AbortController();
  const res = await fetch(`${API}/api/analyze`, { method: "POST", body: form, signal: ac.signal });
  if (!res.ok || !res.body) {
    throw new Error(`analyze failed (${res.status}): ${await res.text().catch(() => "")}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let acc = "";
  let blueprint: Blueprint | null = null;
  let frames: Frame[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += dec.decode(value, { stream: true });
      const lines = acc.split("\n");
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === "blueprint" && msg.blueprint) {
            blueprint = msg.blueprint as Blueprint;
            if (!includeStoryboard) {
              ac.abort();
              return { blueprint, frames: [] };
            }
          } else if (msg.type === "frames") {
            frames = Array.isArray(msg.frames) ? msg.frames : [];
            ac.abort();
            if (blueprint) return { blueprint, frames };
          }
        } catch {
          /* partial / non-JSON line, keep buffering */
        }
      }
      acc = lines[lines.length - 1];
    }
  } catch (e) {
    if ((e as { name?: string }).name !== "AbortError") throw e;
  }
  if (blueprint) return { blueprint, frames };
  throw new Error("no blueprint in response");
}

async function getCode(blueprint: Blueprint, framework: string): Promise<string> {
  const res = await fetch(`${API}/api/generate-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blueprint, framework }),
  });
  if (!res.ok) return "";
  return stripFences(await res.text());
}

function formatSpec(bp: Blueprint): string {
  const motion = (bp.motion ?? [])
    .map((m) => {
      const o = m as Record<string, string>;
      const purpose = o.purpose ? ` — ${o.purpose}` : "";
      const fromto = o.from || o.to ? ` (${o.from ?? ""}${o.from && o.to ? " → " : ""}${o.to ?? ""})` : "";
      return `- ${o.element ?? "element"}: ${o.change ?? "move"}${fromto}${purpose}`;
    })
    .join("\n");

  return [
    `# MotionLens Blueprint`,
    bp.confidence ? `_Confidence: ${bp.confidence}_` : "",
    ``,
    `## Summary`,
    bp.summary ?? "",
    bp.story ? `\n${bp.story}` : "",
    bp.beats?.length ? `\n## Animation flow\n${bp.beats.map((b, i) => `${i + 1}. ${b}`).join("\n")}` : "",
    motion ? `\n## Motion\n${motion}` : "",
    bp.feel?.length ? `\n## Feel\n${bp.feel.join(", ")}` : "",
    bp.blind_spots?.length ? `\n## Blind spots\n${bp.blind_spots.map((b) => `- ${b}`).join("\n")}` : "",
    bp.agent_prompt ? `\n## Implementation spec (authoritative)\n${bp.agent_prompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type ToolContent = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };

// Record a live URL locally with a headless browser → returns the .webm bytes.
async function recordUrl(
  url: string,
  interaction: "load" | "scroll",
  seconds: number,
  viewport: { width: number; height: number },
): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const dir = await mkdtemp(join(tmpdir(), "ml-rec-"));
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      recordVideo: { dir, size: viewport },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(800); // let entrance animations begin
    if (interaction === "scroll") {
      await page.evaluate(async (ms: number) => {
        await new Promise<void>((resolve) => {
          const start = performance.now();
          const max = Math.max(0, document.body.scrollHeight - window.innerHeight);
          const tick = () => {
            const t = Math.min(1, (performance.now() - start) / ms);
            window.scrollTo(0, max * t);
            if (t < 1) requestAnimationFrame(tick);
            else resolve();
          };
          tick();
        });
      }, seconds * 1000);
    } else {
      await page.waitForTimeout(seconds * 1000);
    }
    const video = page.video();
    await context.close(); // finalizes the recording
    const vpath = video ? await video.path() : null;
    if (!vpath) throw new Error("recording produced no video");
    return await readFile(vpath);
  } finally {
    await browser.close();
  }
}

// Shared: analyze a video buffer → write code/blueprint files → build the tool result.
async function runAnalysis(
  buf: Buffer,
  name: string,
  mode: string,
  fw: string,
  wantStoryboard: boolean,
  saveDir: string | undefined,
): Promise<{ content: ToolContent[] }> {
  const { blueprint, frames } = await getAnalysis(buf, name, mode, wantStoryboard);
  const code = await getCode(blueprint, fw);

  const dir = saveDir || join(process.cwd(), "motionlens-output");
  await mkdir(dir, { recursive: true });
  const ext = fw === "CSS" ? "css" : fw === "GSAP" ? "js" : "tsx";
  const codeFile = join(dir, `MotionLensAnimation.${ext}`);
  const specFile = join(dir, "BLUEPRINT.md");
  const jsonFile = join(dir, "blueprint.json");
  const spec = formatSpec(blueprint);
  await writeFile(codeFile, code || "// no code generated");
  await writeFile(specFile, spec);
  await writeFile(jsonFile, JSON.stringify(blueprint, null, 2));

  const preview = code ? code.split("\n").slice(0, 28).join("\n") : "";
  const text = [
    spec,
    `\n## Saved (full files — no truncation)`,
    `- ${fw} code → ${codeFile}`,
    `- Spec → ${specFile}`,
    `- Blueprint JSON → ${jsonFile}`,
    preview ? `\n## Code preview (first 28 lines — full file saved above)\n\`\`\`${ext}\n${preview}\n…\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const content: ToolContent[] = [{ type: "text", text }];
  if (wantStoryboard && frames.length) {
    content.push({ type: "text", text: `## Storyboard (${frames.length} keyframes)` });
    frames.forEach((f, i) => {
      const callouts = (f.annotations ?? []).map((a) => a.label).filter(Boolean);
      const caption =
        `**Keyframe ${i + 1}**${f.label ? ` — ${f.label}` : ""}` +
        (callouts.length ? `\nAnnotations: ${callouts.join("; ")}` : "");
      content.push({ type: "text", text: caption });
      const m = (f.img ?? "").match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
      if (m) content.push({ type: "image", data: m[2], mimeType: m[1] });
    });
  }
  return { content };
}

const server = new McpServer({ name: "motionlens", version: "0.1.0" });

server.tool(
  "analyze_video",
  "Analyze a local UI-animation video (mp4/mov/webm). Writes a Motion Blueprint + ready-to-paste recreation code to files (so nothing truncates), and returns a summary, the saved file paths, a short code preview, and the storyboard keyframe images. Use this to understand or recreate an animation from a clip on disk.",
  {
    path: z.string().describe("Absolute path to the video file on the user's machine."),
    mode: z
      .enum(["standard", "annotated", "precision"])
      .optional()
      .describe(
        "Analysis depth. DEFAULT 'standard' (fast, ~40s, core motion). Use 'precision' (multi-pass, ~1-2 min, most ACCURATE — best for the final recreation) ONLY when the user explicitly asks (e.g. says 'precise', 'precision', 'final', 'most accurate'). 'annotated' adds a callout storyboard.",
      ),
    framework: z
      .enum(["Framer Motion", "CSS", "GSAP", "Tailwind"])
      .optional()
      .describe(
        "Target framework for the generated code (default 'Framer Motion'). Use whichever the user names; if they mention React/motion use Framer Motion, plain web use CSS, timelines use GSAP.",
      ),
    include_storyboard: z
      .boolean()
      .optional()
      .describe(
        "Also return the storyboard keyframe images (default true). Set false for a faster, text-only result.",
      ),
    save_dir: z
      .string()
      .optional()
      .describe(
        "Directory to write the generated code + blueprint files into. Default: ./motionlens-output in the current working directory. The full code is ALWAYS written to a file so it never gets truncated.",
      ),
  },
  async ({ path, mode, framework, include_storyboard, save_dir }) => {
    try {
      const buf = await readFile(path);
      return await runAnalysis(
        buf,
        basename(path) || "clip.mp4",
        mode ?? "standard",
        framework ?? "Framer Motion",
        include_storyboard ?? true,
        save_dir,
      );
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `MotionLens analyze_video failed: ${(e as Error).message}` }],
      };
    }
  },
);

server.tool(
  "analyze_url",
  "Record a live website/app at a URL on THIS machine (headless browser) and analyze its animation into a Motion Blueprint + code, writing files like analyze_video. Best for AUTO-PLAYING motion (page-load / hero entrances, carousels, marquees, loaders) and scroll-triggered reveals. Tap/click-driven interactions won't be captured — record those manually and use analyze_video.",
  {
    url: z.string().describe("The URL to record and analyze, e.g. https://linear.app."),
    interaction: z
      .enum(["load", "scroll"])
      .optional()
      .describe(
        "'load' (default) records the page-load / auto-playing animation; 'scroll' slowly scrolls top→bottom to capture scroll-triggered reveals & parallax.",
      ),
    seconds: z.number().optional().describe("Recording length in seconds (default 10, clamped 3–30)."),
    viewport: z
      .enum(["desktop", "mobile"])
      .optional()
      .describe("'desktop' = 1280×800 (default), 'mobile' = 390×844."),
    mode: z
      .enum(["standard", "annotated", "precision"])
      .optional()
      .describe("Analysis depth. DEFAULT 'standard' (fast ~40s). Use 'precision' (~2min, most accurate) ONLY when the user asks for it."),
    framework: z
      .enum(["Framer Motion", "CSS", "GSAP", "Tailwind"])
      .optional()
      .describe("Target framework for the code (default Framer Motion)."),
    include_storyboard: z.boolean().optional().describe("Return storyboard keyframe images (default true)."),
    save_dir: z.string().optional().describe("Where to write the code + blueprint files (default ./motionlens-output)."),
  },
  async ({ url, interaction, seconds, viewport, mode, framework, include_storyboard, save_dir }) => {
    try {
      const vp = viewport === "mobile" ? { width: 390, height: 844 } : { width: 1280, height: 800 };
      const secs = Math.min(30, Math.max(3, seconds ?? 10));
      const buf = await recordUrl(url, interaction ?? "load", secs, vp);
      return await runAnalysis(
        buf,
        "recording.webm",
        mode ?? "standard",
        framework ?? "Framer Motion",
        include_storyboard ?? true,
        save_dir,
      );
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: `MotionLens analyze_url failed: ${(e as Error).message}` }],
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
