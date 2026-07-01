import { createClient } from "@/lib/supabase/server";
import { presignGet, r2Delete, r2GetBytes } from "@/lib/r2";

export const runtime = "nodejs";

// One saved analysis (blueprint + a presigned replay URL for its clip).
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

  let clipUrl: string | null = null;
  if (data.clip_key) {
    try {
      clipUrl = await presignGet(data.clip_key as string, 3600);
    } catch {
      /* clip may be gone — reload still works without replay */
    }
  }
  // Rehydrate the storyboard from R2 so reopening shows it.
  let frames: unknown[] = [];
  if (data.frames_key) {
    try {
      const buf = await r2GetBytes(data.frames_key as string);
      if (buf) frames = JSON.parse(buf.toString("utf8"));
    } catch {
      /* storyboard missing — reload still works without it */
    }
  }
  return Response.json({ ...data, clipUrl, frames });
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
