import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

export const runtime = "nodejs";

export async function GET() {
  const profile = await getProfile();
  if (!profile) return Response.json({ error: "Not signed in" }, { status: 401 });
  return Response.json(profile);
}

// Update the editable fields (display name + settings blob). credits/plan are
// untouchable here — they live behind separate SECURITY DEFINER functions.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { displayName?: string | null; settings?: Record<string, unknown> | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const { error } = await supabase.rpc("update_profile", {
    p_display_name: body.displayName ?? null,
    p_settings: body.settings ?? null,
  });
  if (error) {
    return Response.json({ error: "Couldn't save changes." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
