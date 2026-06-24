# MotionLens — Build Plan

## Stack
Next.js (Vercel) · Gemini API `gemini-3-flash` · ffmpeg · Supabase (auth/db) ·
Lemon Squeezy/Paddle (payments) · MCP server (later).

## Build order (IMPORTANT)
Core call FIRST, landing page LAST.
1. **Core call** — upload → Gemini → Blueprint JSON (bare upload box). *Proves the magic.*
2. **Outputs** — format JSON → Blueprint + timeline + AI prompt + Copy button.
3. **Storyboard** — ffmpeg 3–5 frames + Gemini captions.
4. **Wrap** — Supabase auth + free-5 limit + deploy → show to devs.
5. Later: payments, MCP, extension, link-record, drawn overlays, library, corrections.
> App UI (minimal upload) = now. Marketing landing page = later. Don't confuse them.

## V1 scope (only this)
✅ Upload a 10–30s clip → ✅ Storyboard (frames+captions) → ✅ Timeline → ✅ Motion Blueprint (+ AI prompt) → Copy.
❌ No marketplace, extension, drawn annotations, WebGL-perfect, every framework, multi-pass tuning.

## Day-by-day
- **Day 1** — 1 page upload MP4 → `/api/analyze` sends to Gemini → returns Motion IR JSON → print it. (No auth/polish.) *Make it work on ONE clip.*
- **Day 2** — format JSON → Markdown Blueprint + timeline + AI prompt (pure code) + Copy button.
- **Day 3** — ffmpeg pulls 3–5 frames, show with Gemini captions + timeline.
- **Day 4** — Supabase auth + free-5 limit + deploy → send to 10–20 devs.

## Day-1 code

`npm i @google/genai` · `.env.local` → `GEMINI_API_KEY=...`

```ts
// app/api/analyze/route.ts
import { GoogleGenAI, createUserContent, createPartFromUri } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const PROMPT = `You are a motion analyst. Watch this UI animation video and produce a
"Motion Blueprint" — a framework-agnostic, structured description an AI coding agent can
use to recreate it. Do NOT output code. Describe behavior and feel, not implementation.
Return ONLY valid JSON in exactly this shape:
{
  "summary": "...", "trigger": "load|scroll-into-view|hover|tap|other",
  "elements": ["..."],
  "timeline": [{ "t": "0.0s", "event": "..." }],
  "motion": [{ "element":"...","change":"fade|slide|scale|blur|rotate",
    "from":"...","to":"...","duration_ms":0,"easing":"...","stagger_ms":0,
    "direction":"up|down|left|right|in|out|none" }],
  "feel": ["..."], "agent_prompt": "...", "confidence": "high|medium|low"
}`;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("video") as File;

  let f = await ai.files.upload({ file, config: { mimeType: file.type } });
  while (f.state === "PROCESSING") {
    await new Promise(r => setTimeout(r, 1500));
    f = await ai.files.get({ name: f.name! });
  }

  const res = await ai.models.generateContent({
    model: "gemini-3-flash",
    contents: createUserContent([ createPartFromUri(f.uri!, f.mimeType!), PROMPT ]),
    config: { responseMimeType: "application/json" },
  });

  return Response.json(JSON.parse(res.text!));
}
```
*(SDK surface may shift by version — hand to Claude Code to finalize; the shape is right.)*

## Benchmark plan (before locking the model)
Collect **20 real UI clips** (Apple hero, Linear sidebar, bottom sheet, FAB expand,
scroll reveal, pricing cards, modal, carousel…). Run 3 Flash vs 3 Pro. Score each /10:
correct elements · correct sequence · motion description · feel/intent · prompt usefulness · overall.
If Flash is "good enough" ~18/20 → ship Flash, Pro as fallback only.

## Validation (the gate)
Show v1 to **20 frontend devs**, ask: *"Would you pay $19/mo for this?"*
- 10+ "yes / holy shit I need this" → build on.
- "meh, I'd just use Gemini" → rethink the output quality.

## First action
Get a Gemini API key (aistudio.google.com) → run the Day-1 route on one screen
recording (e.g. the uimotionprompts pill animation) → compare output to their
hand-written prompt. 70% as good, automatically = thesis proven.
