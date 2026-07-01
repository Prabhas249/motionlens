import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { dodoFetch } from "@/lib/dodo";

export const runtime = "nodejs";

// Permanently deletes the signed-in user's account. The profiles row is removed
// automatically via the ON DELETE CASCADE foreign key to auth.users.
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  // Cancel any Dodo subscription first, so billing stops (Dodo is the merchant of
  // record — otherwise it keeps charging a card with no account behind it).
  const { data: prof } = await supabase
    .from("profiles")
    .select("dodo_subscription_id")
    .eq("id", user.id)
    .single();
  if (prof?.dodo_subscription_id) {
    try {
      await dodoFetch(`/subscriptions/${prof.dodo_subscription_id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
    } catch {
      /* best effort — don't block account deletion on it */
    }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return Response.json({ error: "Couldn't delete the account." }, { status: 500 });
  }
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
