import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Persist generated code onto an analysis so reopening it doesn't regenerate.
// Scoped to the caller's own analyses via the SECURITY DEFINER RPC (auth.uid()).
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { id?: string; framework?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const { id, framework, code } = body;
  if (!id || !framework || typeof code !== "string" || !code.trim()) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  await supabase.rpc("save_analysis_code", {
    p_id: id,
    p_framework: framework,
    p_code: code,
  });
  return Response.json({ ok: true });
}
