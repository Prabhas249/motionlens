// Dodo Payments config + helpers (Merchant of Record).
// Test vs live is just DODO_API_BASE + the matching key/product ids.

export const DODO_API_BASE =
  process.env.DODO_API_BASE || "https://test.dodopayments.com";

// plan → Dodo product + the monthly credit grant (reset on each renewal)
export const PLANS = {
  pro: { product: process.env.DODO_PRODUCT_PRO || "", credits: 150 },
  studio: { product: process.env.DODO_PRODUCT_STUDIO || "", credits: 300 },
} as const;

export type PaidPlan = keyof typeof PLANS;

export function planForProduct(
  productId?: string,
): { plan: PaidPlan; credits: number } | null {
  if (!productId) return null;
  for (const [plan, cfg] of Object.entries(PLANS)) {
    if (cfg.product && cfg.product === productId) {
      return { plan: plan as PaidPlan, credits: cfg.credits };
    }
  }
  return null;
}

export async function dodoFetch(path: string, init?: RequestInit) {
  return fetch(`${DODO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.DODO_API_KEY || ""}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}
