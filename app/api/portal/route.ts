import { createClient } from "@/lib/supabase/server";
import { dodoFetch } from "@/lib/dodo";

export const runtime = "nodejs";

// Opens Dodo's hosted customer portal so a subscriber can manage / cancel.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: prof } = await supabase
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", user.id)
    .single();

  const cid = prof?.dodo_customer_id;
  if (!cid) return Response.json({ error: "No subscription to manage yet." }, { status: 400 });

  const res = await dodoFetch(`/customers/${cid}/customer-portal/session`, {
    method: "POST",
  });
  if (!res.ok) return Response.json({ error: "Couldn't open the portal." }, { status: 502 });

  const data = await res.json();
  if (!data?.link) return Response.json({ error: "No portal link." }, { status: 502 });
  return Response.json({ url: data.link });
}
