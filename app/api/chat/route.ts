import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

// Reuse the existing Gemini key (GEMINI_API_KEY) — @ai-sdk/google defaults to GOOGLE_GENERATIVE_AI_API_KEY,
// so we pass it explicitly to avoid duplicating the env var.
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-3-flash-preview";

export async function POST(req: Request) {
  const { messages, blueprint }: { messages: UIMessage[]; blueprint?: unknown } = await req.json();

  const system =
    `You are the MotionLens Copilot — an expert motion designer + frontend implementer. You help developers ` +
    `recreate UI animations from a "Motion Blueprint" (a structured spec MotionLens extracted from a video). ` +
    `Be concise and practical: explain the motion, give exact durations / easing / stagger, and produce ` +
    `framework code (Framer Motion, CSS, GSAP, SwiftUI, Reanimated) when asked. The Blueprint's timings and ` +
    `easing are the SOURCE OF TRUTH — never invent values that contradict it; if something isn't in the ` +
    `Blueprint, say it's an estimate.` +
    (blueprint
      ? `\n\nThe user's current Motion Blueprint (JSON):\n${JSON.stringify(blueprint)}`
      : `\n\nNo Blueprint is loaded yet. If the user asks about a specific animation, tell them to analyze a clip first.`);

  const result = streamText({
    model: google(MODEL),
    system,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
