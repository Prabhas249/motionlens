import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 90;

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3-flash-preview";

const FRAMEWORK_HINTS: Record<string, string> = {
  "Framer Motion":
    "Use Framer Motion (`motion/react`). When elements stagger, prefer a parent `variants` with `staggerChildren`/`delayChildren`; otherwise use per-element `transition.delay`. Express easing as the exact cubic-bezier array from the blueprint. Combine opacity+translate+scale on one element into one `animate`/variant.",
  CSS:
    "Use plain CSS `@keyframes` + `animation` with `animation-delay` for stagger. Use `transform` for translate/scale/rotate and `opacity` for fades. One coherent keyframe set per element; group simultaneous property changes into the same keyframes.",
  GSAP:
    "Use a single `gsap.timeline()`. Place concurrent tweens at the SAME position label (e.g. `'<'` or an absolute time) and sequential ones after. Use exact durations and eases.",
  Tailwind:
    "Use React + Tailwind. For richer motion use `motion/react`; for simple cases use a small inline `<style>` with keyframes. Keep classes minimal and readable.",
};

export async function POST(req: Request) {
  const { blueprint, framework } = (await req.json()) as {
    blueprint: Record<string, unknown> | null;
    framework: string;
  };

  if (!blueprint) {
    return Response.json({ error: "No blueprint provided." }, { status: 400 });
  }

  const agentPrompt = typeof blueprint.agent_prompt === "string" ? blueprint.agent_prompt : "";
  const hint = FRAMEWORK_HINTS[framework] ?? FRAMEWORK_HINTS["Framer Motion"];

  const prompt =
    `You are MotionLens's code compiler. You turn a structured Motion Blueprint into a faithful, runnable ` +
    `${framework} recreation of a UI animation. Reproduce the MOTION, not just the static layout.\n\n` +
    `RULES — follow ALL:\n` +
    `1. Implement EVERY entry in the blueprint's "motion" array. No element that the blueprint says moves may be left static. ` +
    `The single most prominent motion — often a hero/logo element that scales, moves, or transforms — is the CENTERPIECE; never omit it.\n` +
    `2. SYNCHRONIZE correctly. Motions that share a "concurrent_with" anchor, or that fall in the same "timeline" moment, MUST start together. ` +
    `Only sequence what the timeline shows as sequential. Favor one coordinated entrance over disjointed per-element animations.\n` +
    `3. Preserve EXACT values: from→to, durations, delays, stagger, easing. Do not round, simplify, or invent values that contradict the blueprint. ` +
    `If a value is genuinely missing, choose a tasteful default and add a short inline comment marking it inferred.\n` +
    `4. Combine multi-property changes on the same element into ONE animation (e.g. opacity + translateY + scale together), not separate passes.\n` +
    `5. Build a COMPLETE, self-contained, runnable component: include every element named in "elements", lay them out per "spatial"/"anchor", and orchestrate the full timeline.\n` +
    `6. ${hint}\n\n` +
    `Output ONLY the code — no prose, no explanation, no markdown fences.\n\n` +
    `MOTION BLUEPRINT (JSON — the source of truth):\n${JSON.stringify(blueprint)}` +
    (agentPrompt ? `\n\nThe blueprint's own agent_prompt (use as guidance, the JSON above wins on specifics):\n${agentPrompt}` : "");

  // Stream the code back so it appears live in the UI (markdown fences are stripped client-side).
  const result = streamText({
    model: google(MODEL),
    prompt,
    temperature: 0.3,
    maxOutputTokens: 8000,
  });

  return result.toTextStreamResponse();
}
