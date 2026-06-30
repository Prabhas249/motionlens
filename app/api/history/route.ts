import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Recent analyses for the signed-in user (newest first) — powers the sidebar history.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await supabase
    .from("analyses")
    .select("id, title, mode, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return Response.json({ items: data ?? [] });
}
