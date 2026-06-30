import { getProfile } from "@/lib/profile";
import { dodoFetch, PLANS, type PaidPlan } from "@/lib/dodo";

export const runtime = "nodejs";

// Creates a Dodo subscription checkout for the signed-in user and returns its
// hosted payment link. user_id rides in metadata so the webhook can grant the plan.
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

  const origin = new URL(req.url).origin;
  const res = await dodoFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      product_id: cfg.product,
      quantity: 1,
      payment_link: true,
      return_url: `${origin}/settings/billing?upgraded=1`,
      customer: { email: profile.email, name: profile.name },
      // Real billing is collected on Dodo's hosted page; this is just a seed.
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
