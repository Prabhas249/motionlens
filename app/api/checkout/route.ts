import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { dodoFetch, PLANS, type PaidPlan } from "@/lib/dodo";

export const runtime = "nodejs";

// Free → paid: hosted checkout (full price, redirect).
// Paid → other paid: change-plan on the SAME subscription with proration
//   (Dodo charges only the prorated difference — no full re-charge).
export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const plan = body.plan as PaidPlan;
  const cfg = PLANS[plan];
  if (!cfg || !cfg.product) {
    return Response.json({ error: "Unknown plan." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: prof } = await supabase
    .from("profiles")
    .select("plan, credits, dodo_subscription_id")
    .eq("id", profile.userId)
    .single();
  const currentPlan = (prof?.plan as string) ?? "free";
  const currentCredits = (prof?.credits as number) ?? 0;
  const subId = prof?.dodo_subscription_id as string | null;

  if (currentPlan === plan) {
    return Response.json({ error: "You're already on this plan." }, { status: 400 });
  }

  // --- existing paid subscriber switching plans → prorated change on the same sub ---
  if (subId && currentPlan !== "free") {
    const res = await dodoFetch(`/subscriptions/${subId}/change-plan`, {
      method: "POST",
      body: JSON.stringify({
        product_id: cfg.product,
        proration_billing_mode: "prorated_immediately",
        quantity: 1,
      }),
    });
    if (!res.ok) {
      return Response.json({ error: "Couldn't change your plan — try again." }, { status: 502 });
    }
    // Reflect immediately (change-plan may not fire a webhook we handle).
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    // Anti-farming: never reset to the full grant on a switch (a user could bounce
    // Pro↔Studio to refill credits for near-zero prorated cost). On an upgrade add
    // only the delta (capped at the new grant); on a downgrade cap at the new grant.
    const currentGrant = PLANS[currentPlan as PaidPlan]?.credits ?? 0;
    const newCredits = Math.min(
      currentCredits + Math.max(0, cfg.credits - currentGrant),
      cfg.credits,
    );
    // Dodo resets next_billing_date on a change-plan, so the renewed-webhook this
    // switch fires looks like a "new period". Claim that period here so the webhook
    // sees it's already granted and leaves our prorated delta alone.
    let period = "";
    try {
      const s = await dodoFetch(`/subscriptions/${subId}`);
      if (s.ok) period = ((await s.json())?.next_billing_date as string) || "";
    } catch {
      /* ignore — webhook still won't over-refill for the same period */
    }
    const update: Record<string, unknown> = { plan, credits: newCredits };
    if (period) update.credit_period = period;
    await admin.from("profiles").update(update).eq("id", profile.userId);
    return Response.json({ changed: true, plan });
  }

  // --- new subscriber (free → paid): hosted checkout, full price ---
  const origin = new URL(req.url).origin;
  const res = await dodoFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      product_id: cfg.product,
      quantity: 1,
      payment_link: true,
      return_url: `${origin}/settings/billing?upgraded=1`,
      customer: { email: profile.email, name: profile.name },
      billing: { country: "US", city: "NA", state: "NA", street: "NA", zipcode: "00000" },
      metadata: { user_id: profile.userId, plan },
    }),
  });
  if (!res.ok) {
    return Response.json({ error: "Couldn't start checkout — try again." }, { status: 502 });
  }
  const data = await res.json();
  if (!data?.payment_link) {
    return Response.json({ error: "No checkout link returned." }, { status: 502 });
  }
  return Response.json({ url: data.payment_link });
}
