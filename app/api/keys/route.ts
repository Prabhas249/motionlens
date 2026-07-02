import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-key";

export const runtime = "nodejs";

const MAX_KEYS = 3;

// List the caller's API keys (metadata only — never the key itself).
export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const { data, error } = await supa
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Couldn't load keys" }, { status: 500 });
  return Response.json({ keys: data ?? [] });
}

// Create a key — the plaintext is in THIS response only, never again.
export async function POST(req: Request) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { count } = await supa
    .from("api_keys")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_KEYS) {
    return Response.json(
      { error: `You can have up to ${MAX_KEYS} keys — revoke one first.` },
      { status: 400 },
    );
  }

  let name = "MCP key";
  try {
    const body = await req.json();
    if (typeof body?.name === "string" && body.name.trim()) name = body.name.trim().slice(0, 40);
  } catch { /* no body is fine */ }

  const { key, hash, prefix } = generateApiKey();
  const { data, error } = await supa
    .from("api_keys")
    .insert({ user_id: user.id, name, key_hash: hash, prefix })
    .select("id, name, prefix, created_at")
    .single();
  if (error) return Response.json({ error: "Couldn't create the key" }, { status: 500 });
  return Response.json({ key, ...data });
}

// Revoke (delete) one of the caller's keys.
export async function DELETE(req: Request) {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  let id = "";
  try {
    id = String((await req.json())?.id || "");
  } catch { /* fall through */ }
  if (!id) return Response.json({ error: "Missing key id" }, { status: 400 });
  const { error } = await supa.from("api_keys").delete().eq("id", id);
  if (error) return Response.json({ error: "Couldn't revoke the key" }, { status: 500 });
  return Response.json({ ok: true });
}
