import { AwsClient } from "aws4fetch";

// Cloudflare R2 (S3-compatible) — clips live here: free egress, no 50MB cap.
const account = process.env.R2_ACCOUNT_ID || "";
const bucket = process.env.R2_BUCKET || "";
const BASE = `https://${account}.r2.cloudflarestorage.com/${bucket}`;

const r2 = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  service: "s3",
  region: "auto",
});

function objUrl(key: string): string {
  return `${BASE}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

// Presigned PUT so the browser uploads the clip straight to R2 (no size limit).
export async function presignPut(key: string, expires = 600): Promise<string> {
  const url = new URL(objUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expires));
  const signed = await r2.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

// Presigned GET so the browser can replay a saved clip.
export async function presignGet(key: string, expires = 3600): Promise<string> {
  const url = new URL(objUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expires));
  const signed = await r2.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

// Server-side download of the raw clip to feed Gemini (free egress on R2).
export async function r2GetBytes(key: string): Promise<Buffer | null> {
  const res = await r2.fetch(objUrl(key), { method: "GET" });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

// Server-side upload of the compressed clip we keep for replay.
export async function r2Put(key: string, body: Buffer, contentType: string): Promise<boolean> {
  const res = await r2.fetch(objUrl(key), {
    method: "PUT",
    body: new Uint8Array(body),
    headers: { "Content-Type": contentType },
  });
  return res.ok;
}

export async function r2Delete(key: string): Promise<void> {
  try {
    await r2.fetch(objUrl(key), { method: "DELETE" });
  } catch {
    /* best effort */
  }
}
