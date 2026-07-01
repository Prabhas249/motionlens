import { request as httpsRequest } from "node:https";
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
// NOT via fetch: Vercel's runtime streams multi-MB fetch bodies as
// Transfer-Encoding: chunked with no Content-Length, and R2 rejects that with
// 411 MissingContentLength (small bodies get buffered, which is why this only
// broke for real clips/storyboards). A presigned URL + node:https with an
// explicit Content-Length sidesteps the fetch wrapper entirely — the exact
// path the browser upload already uses.
export async function r2Put(key: string, body: Buffer, contentType: string): Promise<boolean> {
  const url = new URL(await presignPut(key, 600));
  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "PUT",
        headers: { "Content-Type": contentType, "Content-Length": body.length },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300));
      },
    );
    req.on("error", () => resolve(false));
    req.end(body);
  });
}

export async function r2Delete(key: string): Promise<void> {
  try {
    await r2.fetch(objUrl(key), { method: "DELETE" });
  } catch {
    /* best effort */
  }
}
