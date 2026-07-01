import { getProfile } from "@/lib/profile";
import { presignPut } from "@/lib/r2";

export const runtime = "nodejs";

// Hands the browser a presigned URL to upload the raw clip straight to R2
// (no Vercel body limit, no Supabase 50MB cap). Returns the object key too.
export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile) return Response.json({ error: "Not signed in" }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const ext = (body.name?.match(/\.([a-zA-Z0-9]+)$/)?.[1] || "mp4").toLowerCase();
  const rand = Math.random().toString(36).slice(2, 10);
  const key = `${profile.userId}/raw/${Date.now()}-${rand}.${ext}`;
  const url = await presignPut(key, 900); // 15 min window to upload
  return Response.json({ url, key });
}
