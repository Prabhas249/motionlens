import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 120;

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3-flash-preview";

const FRAMEWORK_HINTS: Record<string, string> = {
  "Framer Motion":
    "Use Framer Motion (`motion/react`). Stagger via a parent `variants` with `staggerChildren`/`delayChildren` (or per-element `transition.delay`). Use the EXACT cubic-bezier array for easing. Combine opacity+translate+scale on one element into ONE animate/variant. For shared-element transitions use `layoutId`. For carousels/counters/loops use state + `useEffect`/`AnimatePresence`/`repeat:Infinity`.",
  CSS:
    "Use plain CSS `@keyframes` + `animation` with `animation-delay` for stagger. `transform` for translate/scale/rotate, `opacity` for fades. One coherent keyframe set per element; group simultaneous property changes into the same keyframes. Loops via `animation-iteration-count:infinite`.",
  GSAP:
    "Use a single `gsap.timeline()`. Concurrent tweens at the SAME position label (`'<'` or absolute time); sequential ones after. Exact durations/eases. Loops via `repeat:-1`.",
  Tailwind:
    "React + Tailwind. Use `motion/react` for richer motion; small inline `<style>` keyframes for simple cases. Keep classes minimal and readable.",
};

const stripFences = (s: string) => s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

export async function POST(req: Request) {
  const { blueprint, framework, refine } = (await req.json()) as {
    blueprint: Record<string, unknown> | null;
    framework: string;
    refine?: boolean;
  };

  if (!blueprint) {
    return Response.json({ error: "No blueprint provided." }, { status: 400 });
  }

  const wantRefine = refine !== false; // default: refine ON (higher fidelity)
  const agentPrompt = typeof blueprint.agent_prompt === "string" ? blueprint.agent_prompt : "";
  const hint = FRAMEWORK_HINTS[framework] ?? FRAMEWORK_HINTS["Framer Motion"];
  const bpJson = JSON.stringify(blueprint);

  const genPrompt =
    `You are MotionLens's code compiler. Turn a structured Motion Blueprint into a faithful, runnable ` +
    `${framework} recreation of a UI animation. Reproduce the MOTION, not just the static layout.\n\n` +
    `RULES — follow ALL:\n` +
    `1. Implement EVERY entry in "motion". No element the blueprint says moves may be static. The single most ` +
    `prominent motion (often a hero element that scales/moves/transforms) is the CENTERPIECE — never omit it.\n` +
    `2. SYNCHRONIZE: motions sharing a "concurrent_with" anchor or the same timeline moment MUST start together. ` +
    `Only sequence what the timeline shows as sequential.\n` +
    `3. BUILD THE PATTERN, not a one-off tween. Each motion's "purpose" names the UI component: a "rotating ` +
    `carousel" = an auto-advancing index that slide-fades each step on a loop; a "counter" = an animated number; ` +
    `an "infinite loop / ambient" = a seamless repeating animation; a "shared-element transition" = the SAME ` +
    `element morphing between states (layoutId). Implement it as that component.\n` +
    `4. Preserve EXACT values: from→to, durations, delays, stagger, easing — and exact colors/sizes/fonts/radii ` +
    `from "elements"/"spatial". Don't round or invent values that contradict the blueprint; if one is missing, ` +
    `pick a tasteful default and mark it with a brief inline comment.\n` +
    `5. Combine multi-property changes on one element into ONE animation (opacity+translate+scale together).\n` +
    `6. COMPLETE + runnable: every element from "elements", laid out per "spatial"/"anchor", full timeline.\n` +
    `7. ${hint}\n\n` +
    `Output ONLY the code — no prose, no markdown fences.\n\n` +
    `MOTION BLUEPRINT (JSON — source of truth):\n${bpJson}` +
    (agentPrompt ? `\n\nBlueprint's agent_prompt (guidance; JSON wins on specifics):\n${agentPrompt}` : "");

  // Fast path: single pass, streamed.
  if (!wantRefine) {
    const result = streamText({ model: google(MODEL), prompt: genPrompt, temperature: 0.3, maxOutputTokens: 8000 });
    return result.toTextStreamResponse();
  }

  // Quality path: draft → verify/refine. Pass 1 (draft).
  const draft = await generateText({ model: google(MODEL), prompt: genPrompt, temperature: 0.3, maxOutputTokens: 8000 });
  const draftCode = stripFences(draft.text);

  // Pass 2: audit the draft against the blueprint and fix every gap (streamed).
  const refinePrompt =
    `You are MotionLens's code reviewer. Below is a Motion Blueprint and a FIRST-DRAFT ${framework} recreation. ` +
    `Audit the draft against the blueprint and output a CORRECTED, complete, runnable version. Find and FIX:\n` +
    `1. COVERAGE — every motion[] entry implemented; NO animated element left static; the hero/primary motion present & prominent.\n` +
    `2. SYNC — motions sharing concurrent_with / the same timeline moment start TOGETHER, not sequenced.\n` +
    `3. EXACT VALUES — from→to, durations, delays, stagger, easing match the blueprint exactly; no contradicting guesses.\n` +
    `4. PATTERN — each motion's "purpose" is built as the right COMPONENT (rotating carousel = auto-advancing; counter = animated number; infinite/ambient = seamless repeat; shared-element = morph/layoutId), NOT a flat tween.\n` +
    `5. FIDELITY — colors, sizes, fonts, spacing, radii from "elements"/"spatial" are used, not generic placeholders.\n` +
    `6. RUNNABLE — complete, self-contained, correct imports, no TODOs/placeholders.\n` +
    `Apply every fix. If the draft is already correct on a point, keep it. Output ONLY the corrected code — no prose, no markdown fences.\n\n` +
    `MOTION BLUEPRINT (JSON):\n${bpJson}\n\nFIRST-DRAFT ${framework} CODE TO AUDIT & FIX:\n${draftCode}`;

  const result = streamText({ model: google(MODEL), prompt: refinePrompt, temperature: 0.2, maxOutputTokens: 8000 });
  return result.toTextStreamResponse();
}
