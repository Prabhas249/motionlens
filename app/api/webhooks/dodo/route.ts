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

// Dodo → us. Verify the Standard-Webhooks signature, then sync plan + credits
// with the service role. Edge cases handled:
//  - active/renewed → set plan + refill credits (idempotent).
//  - cancel scheduled for period end (status still "active") → KEEP access.
//  - truly terminal (status expired/cancelled/failed) → downgrade to free.
//  - unknown product / unknown user / non-subscription events → safe no-op (200).
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

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ received: true }); // don't make Dodo retry unparseable
  }

  const type = event?.type || "";
  const data = (event?.data || {}) as Record<string, unknown>;
  const customer = (data.customer || {}) as Record<string, unknown>;
  const sb = admin();

  // Resolve the user: metadata.user_id first, fall back to customer email.
  async function targetId(): Promise<string | null> {
    const uid = (data.metadata as Record<string, unknown> | undefined)?.user_id;
    if (typeof uid === "string" && uid) return uid;
    const email = customer.email;
    if (typeof email === "string" && email) {
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
    const mapping = planForProduct(data.product_id as string | undefined);
    const id = await targetId();
    if (id && mapping) {
      // Never null-overwrite the Dodo ids on a renewal that omits them.
      const update: Record<string, unknown> = { plan: mapping.plan };
      if (customer.customer_id) update.dodo_customer_id = customer.customer_id;
      if (data.subscription_id) update.dodo_subscription_id = data.subscription_id;
      // Only (re)grant the full monthly credits on a genuine renewal, or when a
      // brand-new subscriber first activates. A plan CHANGE also fires "active",
      // but the checkout route already set the prorated delta — clobbering it with
      // the full grant would refill the allotment on every switch (farmable). So on
      // "active" we grant only if the user wasn't already on a paid plan.
      const { data: cur } = await sb
        .from("profiles")
        .select("plan")
        .eq("id", id)
        .single();
      const wasPaid = cur?.plan === "pro" || cur?.plan === "studio";
      if (type === "subscription.renewed" || !wasPaid) {
        update.credits = mapping.credits;
      }
      await sb.from("profiles").update(update).eq("id", id);
    }
  } else if (type === "subscription.expired") {
    // Period actually ended → free.
    const id = await targetId();
    if (id) await sb.from("profiles").update({ plan: "free" }).eq("id", id);
  } else if (type === "subscription.cancelled") {
    // A cancel scheduled for period end keeps status "active" → keep access.
    // Any other status (or an immediate cancel) is terminal → free.
    if (String(data.status || "").toLowerCase() !== "active") {
      const id = await targetId();
      if (id) await sb.from("profiles").update({ plan: "free" }).eq("id", id);
    }
  }
  // subscription.on_hold / .failed → keep access during Dodo's dunning retries;
  // an "expired" fires if it ultimately ends.

  return Response.json({ received: true });
}
