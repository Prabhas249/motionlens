import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// One saved analysis (with its blueprint) so the dashboard can reload it.
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
    .select("id, title, mode, blueprint, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(data);
}

// Delete a saved analysis.
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

  await supabase.from("analyses").delete().eq("id", id).eq("user_id", user.id);
  return Response.json({ ok: true });
}
