import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

// Captures the user's drag-to-fix nudges on annotations. Every correction = a (seed box → true box)
// pair, appended to data/corrections.jsonl. This is the compounding dataset moat: the engine is a
// commodity, the corrections are not.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dir = join(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    const line = JSON.stringify({ ...body, at: new Date().toISOString() }) + "\n";
    await appendFile(join(dir, "corrections.jsonl"), line, "utf8");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
