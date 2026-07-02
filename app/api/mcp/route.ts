import { z } from "zod";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { userIdFromApiKey, adminClient } from "@/lib/api-key";
import { r2Put } from "@/lib/r2";

export const runtime = "nodejs";
// analyze_clip proxies a full analysis run (up to ~3min on precision).
export const maxDuration = 300;

// Remote MCP for MotionLens — add to Claude Code / Cursor with ONE url:
//   https://motionlens.dev/api/mcp  +  Authorization: Bearer mlk_…
// Auth = the API keys from the /mcp page. Streamable HTTP only (no SSE).

const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
};
const MAX_CLIP_BYTES = 80 * 1024 * 1024;

type Auth = { userId: string; origin: string; token: string };

function authOf(extra: unknown): Auth {
  const a = (extra as { authInfo?: { token?: string; extra?: Record<string, unknown> } })?.authInfo;
  return {
    userId: String(a?.extra?.userId || ""),
    origin: String(a?.extra?.origin || "https://motionlens.dev"),
    token: String(a?.token || ""),
  };
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "analyze_clip",
      "Analyze a UI animation from a direct video URL (mp4/mov/webm, ≤30s standard, ≤10s precision) into a Motion Blueprint — exact timings, easings, transforms and an agent-ready prompt for recreating the animation. Spends the user's MotionLens credits (standard 2 / precision 3). Takes 1–3 minutes.",
      {
        video_url: z.string().url().describe("Direct https URL of the clip (a file URL, not a page)."),
        mode: z.enum(["standard", "precision"]).optional()
          .describe("standard = blueprint + storyboard (default) · precision = deepest multi-pass, ≤10s clips"),
        context: z.string().max(500).optional()
          .describe("Optional focus, e.g. 'focus on the card hover, ignore the cursor'."),
      },
      async ({ video_url, mode, context }, extra) => {
        const { userId, origin, token } = authOf(extra);
        if (!userId) return text("Not authorized.");

        // 1) Pull the clip server-side (the user's agent only has a URL).
        let clip: Response;
        try {
          clip = await fetch(video_url, { redirect: "follow" });
        } catch {
          return text(`Couldn't fetch ${video_url} — is it reachable?`);
        }
        if (!clip.ok || !clip.body) return text(`Couldn't fetch the clip (HTTP ${clip.status}).`);
        const ctype = (clip.headers.get("content-type") || "").split(";")[0].trim();
        const buf = Buffer.from(await clip.arrayBuffer());
        if (buf.byteLength > MAX_CLIP_BYTES) return text("Clip is over 80MB — trim or compress it first.");
        if (buf.byteLength < 1024) return text("That URL didn't return a video file.");
        const ext =
          EXT_BY_TYPE[ctype] ||
          (video_url.match(/\.(mp4|mov|webm|m4v)(\?|$)/i)?.[1] || "mp4").toLowerCase();

        // 2) Stage it in R2 under the caller's prefix (same path the web app uses;
        //    /api/analyze deletes the raw upload when the run finishes).
        const clipKey = `${userId}/mcp/${crypto.randomUUID()}.${ext}`;
        if (!(await r2Put(clipKey, buf, ctype || "video/mp4"))) {
          return text("Couldn't stage the clip — please try again.");
        }

        // 3) Run the real pipeline via the API (API-key auth) and read the NDJSON stream.
        const form = new FormData();
        form.set("clipKey", clipKey);
        form.set("mode", mode || "standard"); // the API maps non-precision to the standard (annotated) pipeline
        if (context?.trim()) form.set("context", context.trim());
        const res = await fetch(`${origin}/api/analyze`, {
          method: "POST",
          headers: { "x-api-key": token },
          body: form,
        });
        if (!res.ok) {
          let msg = `Analysis failed (HTTP ${res.status}).`;
          try { msg = ((await res.json()) as { error?: string }).error || msg; } catch { /* keep default */ }
          return text(msg);
        }
        const ndjson = await res.text();
        let blueprint: unknown = null;
        let analysisId: string | null = null;
        for (const line of ndjson.split("\n")) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "blueprint") {
              blueprint = msg.blueprint;
              analysisId = typeof msg.analysisId === "string" ? msg.analysisId : null;
            }
          } catch { /* skip partial lines */ }
        }
        if (!blueprint) return text("The engine returned no blueprint — please try again.");
        return text({
          analysis_id: analysisId,
          open_in_dashboard: analysisId ? `https://motionlens.dev/dashboard?a=${analysisId}` : undefined,
          blueprint,
        });
      },
    );

    server.tool(
      "get_analysis",
      "Fetch a saved MotionLens analysis (Motion Blueprint + any generated code) by id — e.g. one from list_analyses or a dashboard link (?a=<id>).",
      { id: z.string().uuid().describe("The analysis id.") },
      async ({ id }, extra) => {
        const { userId } = authOf(extra);
        if (!userId) return text("Not authorized.");
        const { data } = await adminClient()
          .from("analyses")
          .select("id, title, mode, blueprint, code, created_at")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!data) return text("No analysis with that id on this account.");
        return text(data);
      },
    );

    server.tool(
      "list_analyses",
      "List the user's recent MotionLens analyses (id, title, mode, created_at) — use get_analysis for the full blueprint.",
      {},
      async (_args, extra) => {
        const { userId } = authOf(extra);
        if (!userId) return text("Not authorized.");
        const { data } = await adminClient()
          .from("analyses")
          .select("id, title, mode, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(15);
        return text({ analyses: data ?? [] });
      },
    );
  },
  {
    serverInfo: { name: "motionlens", version: "1.0.0" },
  },
  {
    basePath: "/api", // handler mounted at app/api/mcp/route.ts → streamable endpoint "/api/mcp"
    disableSse: true,
  },
);

// Bearer mlk_… keys (created in Settings → MCP) are the whole auth story.
const verifyToken = async (req: Request, bearerToken?: string) => {
  if (!bearerToken?.startsWith("mlk_")) return undefined;
  const userId = await userIdFromApiKey(req);
  if (!userId) return undefined;
  return {
    token: bearerToken,
    clientId: userId,
    scopes: [],
    extra: { userId, origin: new URL(req.url).origin },
  };
};

const authed = withMcpAuth(handler, verifyToken, { required: true });

export { authed as GET, authed as POST, authed as DELETE };
