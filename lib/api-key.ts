import { createHash, randomBytes } from "node:crypto";
import { createClient as createAdmin, type SupabaseClient } from "@supabase/supabase-js";

// MotionLens API keys ("mlk_…") — used by the remote MCP and any programmatic
// caller. The plaintext key is returned ONCE at creation; only its sha256 hash
// is stored, so a DB leak never leaks keys.

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `mlk_${randomBytes(24).toString("hex")}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 12) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function adminClient(): SupabaseClient {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// Pull a key from Authorization: Bearer / x-api-key and resolve its owner.
// Returns null when absent or invalid. Touches last_used_at (fire and forget).
export async function userIdFromApiKey(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const key = bearer || req.headers.get("x-api-key")?.trim() || "";
  if (!key.startsWith("mlk_")) return null;
  try {
    const admin = adminClient();
    const { data } = await admin
      .from("api_keys")
      .select("id, user_id")
      .eq("key_hash", hashApiKey(key))
      .maybeSingle();
    if (!data) return null;
    admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id)
      .then(() => {}, () => {});
    return data.user_id as string;
  } catch {
    return null;
  }
}
