import { Webhook } from "standardwebhooks";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { planForProduct, dodoFetch } from "@/lib/dodo";

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

      // Current billing period (authoritative from Dodo). A real renewal advances
      // it; a mid-cycle plan switch — which ALSO fires subscription.renewed — keeps
      // the same period, so it's the reliable signal for "should we refill".
      let period = (data.next_billing_date as string) || "";
      const subId = data.subscription_id as string | undefined;
      if (!period && subId) {
        try {
          const s = await dodoFetch(`/subscriptions/${subId}`);
          if (s.ok) period = ((await s.json())?.next_billing_date as string) || "";
        } catch {
          /* ignore — fall through without a period */
        }
      }

      const { data: cur } = await sb
        .from("profiles")
        .select("plan, credit_period")
        .eq("id", id)
        .single();
      const wasPaid = cur?.plan === "pro" || cur?.plan === "studio";
      const newPeriod = !!period && period !== (cur?.credit_period ?? null);

      // Refill the full monthly grant ONLY for a brand-new subscriber or a genuine
      // new billing period. A plan switch keeps the same period → leave the prorated
      // delta the checkout route already set (otherwise switching = free refill).
      if (!wasPaid || newPeriod) update.credits = mapping.credits;
      if (period) update.credit_period = period;

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
