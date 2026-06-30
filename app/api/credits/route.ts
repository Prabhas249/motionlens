import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Returns the signed-in user's remaining credits + plan, for the dashboard badge.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const { data } = await supabase
    .from("profiles")
    .select("credits, plan")
    .eq("id", user.id)
    .single();
  return Response.json({ credits: data?.credits ?? 0, plan: data?.plan ?? "free" });
}
