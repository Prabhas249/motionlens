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

  // 4. R2 server-side PUT + presigned GET round-trip?
  try {
    const key = "debug/persist-probe.txt";
    const ok = await r2Put(key, Buffer.from("probe"), "text/plain");
    report.r2_put = ok ? "ok" : "PUT returned not-ok";
    if (ok) {
      const url = await presignGet(key, 60);
      const res = await fetch(url);
      report.r2_read_back = res.ok ? "ok" : `GET ${res.status}`;
      await r2Delete(key);
    }
  } catch (e) {
    report.r2_put = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
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
