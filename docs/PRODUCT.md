# MotionLens — Product

## The problem
AI coding agents (Claude Code, Cursor, Codex) are great at static UI but **bad at
motion**. Devs can't communicate animation intent:
- A screenshot = one frozen frame (zero motion).
- "Make it smooth like Apple" = the agent guesses wrong.
- The agents **cannot watch video** (Claude Code/Cursor = no video input; ChatGPT only
  frame-samples). The one model that natively understands motion (Gemini) isn't the
  thing writing your code.

**Especially true for mobile/closed apps** — you can't inspect their code, only a
screen recording. So a "recording → spec" tool is the *only* option there.

## The solution
Record/upload a short clip → AI watches it → output a **Motion Blueprint**: a clean,
framework-agnostic, structured description an AI coding agent can implement.

> Positioning: "We convert UI animations into a structured language AI coding agents
> understand." Infrastructure, NOT a Gemini wrapper. Never market "AI explains video."

## Capture (one pipeline, multiple feeders)
Everything becomes a video → Gemini watches → Blueprint.
1. **Upload a clip** (MP4/MOV/GIF) — primary, works for web AND apps.
2. **Paste a link** (fast-follow) — robot browser auto-scrolls & records the page → same pipeline.
3. **Extension** (later) — for logged-in / hover-only / "capture my screen" cases.

## The flow
```
User records/uploads clip → (optional crop) → "Analyze Motion"
   → backend: ffmpeg pulls 3–5 key frames
   → send frames + clip to Gemini (gemini-3-flash)
   → Gemini returns the Motion IR (structured JSON: what moved, type, direction, timing, order, labels, confidence)
   → backend assembles the bundle
   → deliver: web copy  OR  MCP straight into Claude Code
```

## The Motion IR (internal representation = secret sauce)
One structured JSON the backend builds; **every output is generated from it.**
Don't show it raw to users. It's NOT "just JSON" — it's the consistent, reusable
understanding that makes outputs reliable and feeds the dataset moat.

## The 7 outputs (V1 ships the first 4)
1. **📝 Motion Blueprint** *(most important)* — the framework-agnostic "recipe":
   trigger · sequence · from→to · ~duration · easing · stagger · feel · confidence.
   Works for Claude Code, Cursor, React, RN, Flutter, SwiftUI, Compose.
2. **📸 Storyboard** — 3–5 key frames with captions ("initial state", "menu expands"…).
   Humans + multimodal agents grok pictures fast. *(V1: captions only; drawn arrows = v1.5.)*
3. **🕒 Timeline** — order of events (0.0s tap → 0.3s menu → 0.5s items stagger…).
   Agents need ORDER or they animate everything at once.
4. **🤖 AI-ready prompt** — one ready-to-paste instruction for the agent
   ("preserve feel over exact pixels").
5. **📄 JSON** — optional, for integrations.
6. **📚 Motion Library** *(later)* — saved analyses the user reuses.
7. **🔄 User corrections** *(later — the secret weapon)* — "no, it slides UP" → edit →
   stored. Thousands of corrections = the best UI-motion dataset = compounding moat.

## V1 = only these 4
✅ Upload clip · ✅ Storyboard · ✅ Timeline · ✅ Motion Blueprint (+ AI prompt).
❌ No marketplace, extension, drawn annotations, WebGL-perfect, or every framework yet.

## The moat (NOT "we use AI")
- The **watching** — extract motion a human can't articulate & a text-LLM can't see.
- **Consistency + quality** of the Blueprint (vs raw Gemini mush).
- **Coverage** — any UI, web + mobile, on demand (vs finite hand-made libraries like uimotionprompts.com).
- **Compounding dataset** from user corrections.
- **MCP integration** (lives inside the agent).
Honest promise: "gets the agent ~85–90% there + you tweak the feel" — never "pixel-perfect clone."

## The Motion Blueprint format (target JSON shape)
```json
{
  "summary": "one plain-English sentence describing the whole animation",
  "trigger": "load | scroll-into-view | hover | tap | other",
  "elements": ["short names of the UI elements involved"],
  "timeline": [{ "t": "0.0s", "event": "what happens at this moment" }],
  "motion": [{
    "element": "which element",
    "change": "fade in | slide | scale | blur | rotate | ...",
    "from": "start state in words",
    "to": "end state in words",
    "duration_ms": 0,
    "easing": "soft ease-out | spring | linear | ...",
    "stagger_ms": 0,
    "direction": "up|down|left|right|in|out|none"
  }],
  "feel": ["3-5 adjectives: smooth, springy, premium, snappy"],
  "agent_prompt": "short ready-to-paste instruction for a coding agent; preserve feel over exact pixels",
  "confidence": "high | medium | low"
}
```

## The Gemini prompt (the IP)
```
You are a motion analyst. Watch this UI animation video and produce a "Motion Blueprint" —
a framework-agnostic, structured description an AI coding agent can use to recreate it.
Do NOT output code. Describe behavior and feel, not implementation.
Return ONLY valid JSON in exactly the shape above.
```
