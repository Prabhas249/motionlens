import { Webhook } from "standardwebhooks";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { planForProduct } from "@/lib/dodo";

export const runtime = "nodejs";

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Dodo → us. Verifies the Standard-Webhooks signature, then syncs plan + credits.
// Service-role client so it can update any user's profile (bypasses RLS).
export async function POST(req: Request) {
  const raw = await req.text();
  const headers = {
    "webhook-id": req.headers.get("webhook-id") || "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
    "webhook-signature": req.headers.get("webhook-signature") || "",
  };

  try {
    new Webhook(process.env.DODO_WEBHOOK_SECRET!).verify(raw, headers);
  } catch {
    return new Response("invalid signature", { status: 400 });
  }

  const event = JSON.parse(raw);
  const type: string = event?.type || "";
  const data = event?.data || {};
  const sb = admin();

  // Resolve the user: metadata.user_id first, fall back to customer email.
  async function targetId(): Promise<string | null> {
    const uid = data?.metadata?.user_id;
    if (uid) return uid;
    const email = data?.customer?.email;
    if (email) {
      const { data: p } = await sb
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      return p?.id ?? null;
    }
    return null;
  }

  if (type === "subscription.active" || type === "subscription.renewed") {
    const mapping = planForProduct(data?.product_id);
    const id = await targetId();
    if (id && mapping) {
      await sb
        .from("profiles")
        .update({
          plan: mapping.plan,
          credits: mapping.credits, // reset to the monthly grant
          dodo_customer_id: data?.customer?.customer_id ?? null,
          dodo_subscription_id: data?.subscription_id ?? null,
        })
        .eq("id", id);
    }
  } else if (
    type === "subscription.cancelled" ||
    type === "subscription.expired" ||
    type === "subscription.failed" ||
    type === "subscription.on_hold"
  ) {
    const id = await targetId();
    if (id) {
      await sb.from("profiles").update({ plan: "free" }).eq("id", id);
    }
  }

  return Response.json({ received: true });
}
