import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FFMPEG } from "@/lib/ffmpeg";

const pexecFile = promisify(execFile);

// Record a live web page into an mp4 with REAL frame timing (the whole product
// depends on timing fidelity, so frames are stamped with CDP timestamps and
// assembled through ffmpeg's concat demuxer with per-frame durations — not a
// naive constant-fps dump).
//
// Serverless: @sparticuz/chromium provides the Linux binary on Vercel; local
// dev falls back to desktop Chrome. Captures AUTO-PLAYING motion (page-load
// choreography, marquees, loops) — there is no cursor, so hover/click-driven
// interactions won't appear; the MCP tool description says so.
export async function recordUrl(url: string, seconds: number): Promise<Buffer> {
  // deferred imports keep these heavy deps out of every other route's graph
  const puppeteer = await import("puppeteer-core");
  const dir = await mkdtemp(join(tmpdir(), "mlrec-"));
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    let executablePath: string;
    let args: string[] = [];
    if (process.platform === "linux") {
      const chromium = (await import("@sparticuz/chromium")).default;
      executablePath = await chromium.executablePath();
      args = chromium.args;
    } else {
      executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      args = ["--headless=new", "--no-sandbox"];
    }
    browser = await puppeteer.launch({
      executablePath,
      args: [...args, "--hide-scrollbars", "--mute-audio"],
      headless: true,
      defaultViewport: { width: 1440, height: 900 },
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await new Promise((r) => setTimeout(r, 400)); // first paint settle

    // CDP screencast: frames arrive only when pixels change, each with a
    // monotonic timestamp — exactly what we need for true durations.
    const frames: { data: string; ts: number }[] = [];
    const cdp = await page.createCDPSession();
    cdp.on("Page.screencastFrame", (ev: { data: string; metadata: { timestamp?: number }; sessionId: number }) => {
      frames.push({ data: ev.data, ts: ev.metadata.timestamp || 0 });
      cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 72,
      maxWidth: 1440,
      maxHeight: 900,
      everyNthFrame: 1,
    });
    await new Promise((r) => setTimeout(r, seconds * 1000));
    await cdp.send("Page.stopScreencast").catch(() => {});
    await browser.close();
    browser = null;

    if (frames.length < 5) throw new Error("The page produced almost no visual changes to record.");

    // Assemble with real per-frame durations (concat demuxer).
    const t0 = frames[0].ts;
    const lines: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const name = `f${String(i).padStart(4, "0")}.jpg`;
      await writeFile(join(dir, name), Buffer.from(frames[i].data, "base64"));
      const dur = i < frames.length - 1 ? Math.max(0.01, frames[i + 1].ts - frames[i].ts) : 0.1;
      lines.push(`file '${name}'`, `duration ${dur.toFixed(4)}`);
    }
    lines.push(`file 'f${String(frames.length - 1).padStart(4, "0")}.jpg'`); // concat quirk: repeat last
    await writeFile(join(dir, "list.txt"), lines.join("\n"));
    const out = join(dir, "rec.mp4");
    await pexecFile(FFMPEG, [
      "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
      "-t", String(seconds),
      "-vf", "scale='min(1440,iw)':-2,format=yuv420p",
      "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
      "-movflags", "+faststart", "-an", out,
    ]);
    const buf = await readFile(out);
    void t0;
    return buf;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
