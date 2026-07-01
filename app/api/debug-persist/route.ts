import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { FFMPEG } from "@/lib/ffmpeg";
import { r2Put, r2Delete, presignGet } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

const pexecFile = promisify(execFile);

// TEMPORARY diagnostics for the history-persist pipeline (ffmpeg / R2 / service
// role). Token-guarded; delete this route once the root cause is confirmed.
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("t") !== "ml-dbg-x7q4rt19") {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  const report: Record<string, unknown> = {};

  // 1. ffmpeg binary present + runnable?
  report.ffmpeg_path = FFMPEG;
  report.ffmpeg_exists = existsSync(FFMPEG);
  try {
    const { stdout } = await pexecFile(FFMPEG, ["-version"]);
    report.ffmpeg_runs = stdout.split("\n")[0];
  } catch (e) {
    report.ffmpeg_runs = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 2. can ffmpeg actually encode in this sandbox (tmp write + libx264)?
  try {
    const out = join(tmpdir(), "dbg-enc.mp4");
    await pexecFile(FFMPEG, [
      "-y", "-f", "lavfi", "-i", "color=c=blue:s=64x64:d=0.2",
      "-c:v", "libx264", "-preset", "veryfast", "-movflags", "+faststart", out,
    ]);
    report.ffmpeg_encode = existsSync(out) ? "ok" : "no output file";
    await unlink(out).catch(() => {});
  } catch (e) {
    report.ffmpeg_encode = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 3. tmpdir writable?
  try {
    const p = join(tmpdir(), "dbg-w.txt");
    await writeFile(p, "x");
    await unlink(p);
    report.tmp_write = "ok";
  } catch (e) {
    report.tmp_write = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 4. R2 server-side PUT + presigned GET round-trip? Report the raw R2
  // rejection (status + XML error body) instead of a boolean.
  try {
    const { AwsClient } = await import("aws4fetch");
    const r2 = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      service: "s3",
      region: "auto",
    });
    const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/debug/persist-probe.txt`;
    const res = await r2.fetch(url, {
      method: "PUT",
      body: new Uint8Array(Buffer.from("probe")),
      headers: { "Content-Type": "text/plain" },
    });
    report.r2_put = `${res.status} ${res.statusText}`;
    if (!res.ok) report.r2_put_body = (await res.text()).slice(0, 500);
    else {
      const g = await presignGet("debug/persist-probe.txt", 60);
      const rb = await fetch(g);
      report.r2_read_back = rb.ok ? "ok" : `GET ${rb.status}`;
      await r2Delete("debug/persist-probe.txt");
    }
  } catch (e) {
    report.r2_put = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 4b. the app's ACTUAL r2Put (module-level AwsClient in lib/r2) — run 3x to
  // catch flakiness; this is the exact call the persist path makes.
  const libTries: string[] = [];
  for (let i = 0; i < 3; i++) {
    try {
      const ok = await r2Put(`debug/lib-probe-${i}.txt`, Buffer.from("probe"), "text/plain");
      libTries.push(ok ? "ok" : "not-ok");
      if (ok) await r2Delete(`debug/lib-probe-${i}.txt`);
    } catch (e) {
      libTries.push(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  report.r2_put_lib = libTries;
  // and one payload closer to a real clip (2MB) — size-dependent failures.
  // Raw status + error body, plus response headers (WAF/proxy fingerprints).
  try {
    const { AwsClient } = await import("aws4fetch");
    const r2 = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      service: "s3",
      region: "auto",
    });
    const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/debug/lib-probe-big.bin`;
    const big = Buffer.alloc(2 * 1024 * 1024, 7);
    const res = await r2.fetch(url, {
      method: "PUT",
      body: new Uint8Array(big),
      headers: { "Content-Type": "video/mp4" },
    });
    report.r2_put_lib_2mb = `${res.status} ${res.statusText}`;
    if (!res.ok) {
      report.r2_put_2mb_body = (await res.text()).slice(0, 600);
      report.r2_put_2mb_headers = Object.fromEntries(res.headers.entries());
    } else {
      await r2Delete("debug/lib-probe-big.bin");
    }
  } catch (e) {
    report.r2_put_lib_2mb = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  // 5. service-role Supabase client can see/update analyses?
  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { count, error } = await admin
      .from("analyses")
      .select("id", { count: "exact", head: true });
    report.service_role = error ? `ERROR: ${error.message}` : `ok (${count} rows visible)`;
  } catch (e) {
    report.service_role = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return Response.json(report);
}
