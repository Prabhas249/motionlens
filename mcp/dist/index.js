#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const API = (process.env.MOTIONLENS_API_URL || "http://localhost:3000").replace(/\/$/, "");
const stripFences = (s) => s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
// Derive a proper video MIME type from the file name so the upload isn't tagged
// application/octet-stream (which Gemini rejects).
const EXT_MIME = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", m4v: "video/x-m4v" };
const mimeFor = (name) => EXT_MIME[name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? ""] ?? "video/mp4";
// POST the video to /api/analyze and read the NDJSON stream just until the blueprint line
// (we don't need the storyboard frames for the agent, so we abort once we have it).
async function getBlueprint(buf, name, mode) {
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
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            acc += dec.decode(value, { stream: true });
            const lines = acc.split("\n");
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();
                if (!line)
                    continue;
                try {
                    const msg = JSON.parse(line);
                    if (msg.type === "blueprint" && msg.blueprint) {
                        ac.abort(); // stop before the storyboard — the agent only needs the blueprint
                        return msg.blueprint;
                    }
                }
                catch {
                    /* partial / non-JSON line, keep buffering */
                }
            }
            acc = lines[lines.length - 1];
        }
    }
    catch (e) {
        if (e.name !== "AbortError")
            throw e;
    }
    throw new Error("no blueprint in response");
}
async function getCode(blueprint, framework) {
    const res = await fetch(`${API}/api/generate-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint, framework }),
    });
    if (!res.ok)
        return "";
    return stripFences(await res.text());
}
function formatResult(bp, code, framework) {
    const motion = (bp.motion ?? [])
        .map((m) => {
        const o = m;
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
        code ? `\n## ${framework} code\n\`\`\`tsx\n${code}\n\`\`\`` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
const server = new McpServer({ name: "motionlens", version: "0.1.0" });
server.tool("analyze_video", "Analyze a local UI-animation video file (mp4/mov/webm) and return a structured Motion Blueprint plus ready-to-paste recreation code. Use this when the user wants to understand or recreate an animation from a clip on disk.", {
    path: z.string().describe("Absolute path to the video file on the user's machine."),
    mode: z
        .enum(["standard", "annotated", "precision"])
        .optional()
        .describe("Analysis depth (default 'precision'). Pick 'standard' when the user wants it FAST/quick (~30s, core motion only); " +
        "'annotated' when they want a storyboard with callouts; 'precision' when they want the most ACCURATE / final recreation (multi-pass, ~1-2 min)."),
    framework: z
        .enum(["Framer Motion", "CSS", "GSAP", "Tailwind"])
        .optional()
        .describe("Target framework for the generated code (default 'Framer Motion'). Use whichever the user names; if they mention React/motion use Framer Motion, plain web use CSS, timelines use GSAP."),
}, async ({ path, mode, framework }) => {
    const fw = framework ?? "Framer Motion";
    try {
        const buf = await readFile(path);
        const bp = await getBlueprint(buf, basename(path) || "clip.mp4", mode ?? "precision");
        const code = await getCode(bp, fw);
        return { content: [{ type: "text", text: formatResult(bp, code, fw) }] };
    }
    catch (e) {
        return {
            isError: true,
            content: [{ type: "text", text: `MotionLens analyze_video failed: ${e.message}` }],
        };
    }
});
server.tool("analyze_url", "Record a live website/app at a URL and analyze its animation into a Motion Blueprint + code. (Not yet enabled — records locally via a headless browser; coming next.)", {
    url: z.string().describe("The URL to record and analyze."),
}, async ({ url }) => {
    return {
        content: [
            {
                type: "text",
                text: `analyze_url isn't enabled yet (it needs local browser recording via Playwright). ` +
                    `For now, record ${url} yourself and use analyze_video with the saved clip.`,
            },
        ],
    };
});
const transport = new StdioServerTransport();
await server.connect(transport);
