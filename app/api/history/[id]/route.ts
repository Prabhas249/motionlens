import { createClient } from "@/lib/supabase/server";
import { presignGet, r2Delete } from "@/lib/r2";

export const runtime = "nodejs";

// One saved analysis. The multi-MB storyboard JSON is NOT proxied through this
// function anymore (that made every history click wait for a server-side R2
// download) — the client gets a presigned framesUrl and streams it straight
// from R2 while the blueprint is already on screen.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabase
    .from("analyses")
    .select("id, title, mode, blueprint, clip_key, frames_key, code, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });

  // Presigning is a local HMAC — no network round-trips here.
  let clipUrl: string | null = null;
  let framesUrl: string | null = null;
  try {
    if (data.clip_key) clipUrl = await presignGet(data.clip_key as string, 3600);
    if (data.frames_key) framesUrl = await presignGet(data.frames_key as string, 3600);
  } catch {
    /* media may be gone — reload still works without replay/storyboard */
  }
  return Response.json({ ...data, clipUrl, framesUrl });
}

// Delete a saved analysis (and its stored clip).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await supabase
    .from("analyses")
    .select("clip_key, frames_key")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (data?.clip_key) await r2Delete(data.clip_key as string);
  if (data?.frames_key) await r2Delete(data.frames_key as string);

  await supabase.from("analyses").delete().eq("id", id).eq("user_id", user.id);
  return Response.json({ ok: true });
}
