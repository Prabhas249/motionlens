"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, CSSProperties } from "react";
import rough from "roughjs";

type Ann = { bbox?: number[]; label?: string; arrow?: string; glyph?: string };
// w/h are FULL ellipse diameters (draw call halves them). ex0..ey1 = element rect edges (canvas px).
type Placed = {
  mode: "ellipse" | "pointer";
  cx: number; cy: number; w: number; h: number;
  ex0: number; ey0: number; ex1: number; ey1: number;
  ox: number; oy: number;
};
type Box = { x: number; y: number; w: number; h: number };
type Correction = {
  index: number;
  annotation: number;
  label: string;
  from: [number, number];
  to: [number, number];
  canvas: [number, number];
};

type Props = {
  src: string;
  annotations?: Ann[];
  index: number;
  isLast?: boolean;
  onCorrection?: (c: Correction) => void;
  // Enlarge request — receives the current canvas as a PNG data URL so the
  // zoomed view keeps the drawn callouts (incl. any manual nudges).
  onExpand?: (dataUrl: string) => void;
  // false = render the clean frame (no callouts drawn, no callout dragging).
  showCallouts?: boolean;
};

const FINAL_GREEN = "#27C26B";
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
type RC = ReturnType<typeof rough.canvas>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RO = any;

// Find the bounding box of actual content (the phone) vs the uniform background, plus the background
// colour — so captions can be dropped into the empty margins AROUND the phone (the 60fps look).
function detectContentBox(img: HTMLImageElement, w: number, h: number): Box & { bgHex: string; bgLum: number } {
  const fallback = { x: 0, y: 0, w, h, bgHex: "#0E0E10", bgLum: 20 };
  try {
    const oc = document.createElement("canvas");
    oc.width = w;
    oc.height = h;
    const octx = oc.getContext("2d");
    if (!octx) return fallback;
    octx.drawImage(img, 0, 0, w, h);
    const data = octx.getImageData(0, 0, w, h).data;
    // median of the four corners = the true background (robust to a notch/gradient at one corner)
    const corner = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2]] as [number, number, number];
    };
    const cs = [corner(1, 1), corner(w - 2, 1), corner(1, h - 2), corner(w - 2, h - 2)];
    const med = (j: number) => {
      const a = cs.map((c) => c[j]).sort((p, q) => p - q);
      return Math.round((a[1] + a[2]) / 2);
    };
    const br = med(0), bg = med(1), bb = med(2);
    const bgLum = 0.299 * br + 0.587 * bg + 0.114 * bb;
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    const step = 3;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        if (Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) > 60) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const bgHex = `rgb(${br},${bg},${bb})`;
    if (!found) return { ...fallback, bgHex, bgLum };
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, bgHex, bgLum };
  } catch {
    return fallback;
  }
}

// Size one annotation: a TIGHT, hard-capped ellipse around the leaf element — or "pointer" mode when the
// box is basically the whole view (then we point with an arrow instead of drawing a screen-spanning oval).
function sizeAnnotation(bbox: number[] | undefined, w: number, h: number, fx: number, fy: number, content: Box, k: number): Placed {
  const pw = content.w || w, ph = content.h || h;
  const ok = Array.isArray(bbox) && bbox.length === 4 && bbox.every((n) => isFinite(Number(n))) && bbox.some((n) => Number(n) > 0);
  if (!ok) {
    // missing bbox → small fallback ring, index-staggered inside the phone
    const cx = content.x + pw * (0.30 + 0.18 * (k % 3));
    const cy = content.y + ph * (0.28 + 0.20 * Math.floor(k / 3));
    const wgt = Math.min(pw * 0.20, 110), hgt = Math.min(ph * 0.12, 70);
    return { mode: "ellipse", cx, cy, w: wgt, h: hgt, ex0: cx - wgt / 2, ey0: cy - hgt / 2, ex1: cx + wgt / 2, ey1: cy + hgt / 2, ox: cx, oy: cy };
  }
  const [a, b, c, d] = (bbox as number[]).map(Number);
  const ymin = Math.min(a, c), ymax = Math.max(a, c), xmin = Math.min(b, d), xmax = Math.max(b, d);
  const ex0 = fx + (xmin / 1000) * w, ex1 = fx + (xmax / 1000) * w;
  const ey0 = fy + (ymin / 1000) * h, ey1 = fy + (ymax / 1000) * h;
  const ew = Math.max(1, ex1 - ex0), eh = Math.max(1, ey1 - ey0);
  const cx = (ex0 + ex1) / 2, cy = (ey0 + ey1) / 2;

  // whole-view? → pointer mode (don't encircle)
  if (ew / pw > 0.8 || eh / ph > 0.8 || (ew * eh) / (pw * ph) > 0.55) {
    return { mode: "pointer", cx, cy, w: ew, h: eh, ex0, ey0, ex1, ey1, ox: cx, oy: cy };
  }
  // additive element-relative padding, then HARD caps (≤1.5× element AND ≤60%w/50%h of the phone)
  let wgt = ew + clamp(ew * 0.12, 6, 22) * 2;
  let hgt = eh + clamp(eh * 0.12, 5, 18) * 2;
  wgt = Math.min(wgt, ew * 1.5 + 12, pw * 0.6);
  hgt = Math.min(hgt, eh * 1.5 + 12, ph * 0.5);
  wgt = Math.max(wgt, 46);
  hgt = Math.max(hgt, 38);
  if (wgt / hgt > 3.2) hgt = wgt / 3.2;
  if (hgt / wgt > 3.2) wgt = hgt / 3.2;
  return { mode: "ellipse", cx, cy, w: wgt, h: hgt, ex0, ey0, ex1, ey1, ox: cx, oy: cy };
}

// Map a caption to an expressive glyph even before the route emits one (keyword fallback).
function glyphFromLabel(label: string | undefined, arrow: string | undefined, isLast: boolean): string {
  const s = (label || "").toLowerCase();
  if (isLast || /\bfinal\b/.test(s)) return "final";
  if (/\b(spin|rotat|loop|infinit|continuous|drift|pulse)\b/.test(s)) return "loop";
  if (/\b(scroll|marquee|ticker|pages?|paging)\b/.test(s)) return "scroll";
  if (/\b(tumbl|drop|fall|plummet)\b/.test(s)) return "drop";
  if (/\b(fade out|fades out|disappear|vanish)\b/.test(s)) return "vanish";
  if (/\b(fade|appear|reveal|blur in|pop in|populate)\b/.test(s)) return "appear";
  if (/\b(overshoot|scale up|grow|expand|enlarge|zoom in)\b/.test(s)) return "grow";
  if (/\b(scale down|shrink|contract|zoom out|collapse)\b/.test(s)) return "shrink";
  if (arrow && arrow !== "none") return "arrow";
  return "appear";
}

// ---- hand-drawn glyph primitives (rough.js + raw ctx) ----
function roughArrow(rc: RC, x1: number, y1: number, x2: number, y2: number, o: RO, headLen = 15) {
  rc.line(x1, y1, x2, y2, o);
  const ang = Math.atan2(y2 - y1, x2 - x1), sp = Math.PI / 7;
  rc.line(x2, y2, x2 - headLen * Math.cos(ang - sp), y2 - headLen * Math.sin(ang - sp), o);
  rc.line(x2, y2, x2 - headLen * Math.cos(ang + sp), y2 - headLen * Math.sin(ang + sp), o);
}
type E = { cx: number; cy: number; w: number; h: number };
function drawArrowGlyph(rc: RC, e: E, dir: number[], o: RO, long: boolean) {
  const LEN = long ? 78 : 46, gap = 8;
  const tipX = e.cx + dir[0] * (e.w / 2 + gap), tipY = e.cy + dir[1] * (e.h / 2 + gap);
  const tailX = tipX + dir[0] * LEN, tailY = tipY + dir[1] * LEN;
  roughArrow(rc, tailX, tailY, tipX, tipY, o);
  if (long) {
    const px = -dir[1] * 5, py = dir[0] * 5;
    rc.line(tailX + px, tailY + py, tipX + px, tipY + py, { ...o, strokeWidth: 1.4 });
    rc.line(tailX - px, tailY - py, tipX - px, tipY - py, { ...o, strokeWidth: 1.4 });
  }
}
function drawChevronStack(rc: RC, e: E, dir: number[], o: RO, count = 3, size = 12, stepGap = 15) {
  const px = -dir[1], py = dir[0];
  const sx = e.cx - dir[0] * (e.w / 2 + 10), sy = e.cy - dir[1] * (e.h / 2 + 10);
  for (let i = 0; i < count; i++) {
    const ox = sx - dir[0] * i * stepGap, oy = sy - dir[1] * i * stepGap;
    rc.linearPath(
      [[ox + px * size, oy + py * size], [ox + dir[0] * size, oy + dir[1] * size], [ox - px * size, oy - py * size]],
      { ...o, strokeWidth: Math.max(1.3, o.strokeWidth * (1 - i * 0.22)) },
    );
  }
}
function drawScaleGlyph(rc: RC, e: E, o: RO, grow: boolean) {
  const x0 = e.cx - e.w / 2, x1 = e.cx + e.w / 2, cy = e.cy, m = 13, s = 9, out = grow ? 1 : -1;
  rc.rectangle(x0, e.cy - e.h / 2, e.w, e.h, { ...o, strokeWidth: 2, strokeLineDash: [8, 6] });
  for (const off of [0, s]) {
    const bx = x0 - m - off;
    rc.linearPath([[bx + s * out, cy - s], [bx, cy], [bx + s * out, cy + s]], o); // "<<"
  }
  for (const off of [0, s]) {
    const bx = x1 + m + off;
    rc.linearPath([[bx - s * out, cy - s], [bx, cy], [bx - s * out, cy + s]], o); // ">>"
  }
}
function drawAppearGlyph(rc: RC, e: E, o: RO) {
  const baseY = e.cy + e.h / 2 + 13, cx = e.cx, s = 7, step = 11;
  for (let i = 0; i < 3; i++) {
    const y = baseY + i * step;
    rc.linearPath([[cx - s, y], [cx, y - s], [cx + s, y]], { ...o, strokeWidth: Math.max(1.2, o.strokeWidth * (1 - i * 0.25)) });
  }
}
function drawLoopGlyph(rc: RC, e: E, o: RO) {
  const cx = e.cx, cy = e.cy - e.h / 2 - 28, rw = 22, rh = 18, stop = Math.PI * 0.95;
  rc.arc(cx, cy, rw * 2, rh * 2, -Math.PI * 0.55, stop, false, o);
  const ex = cx + rw * Math.cos(stop), ey = cy + rh * Math.sin(stop);
  const tang = Math.atan2(rh * Math.cos(stop), -rw * Math.sin(stop)), sp = Math.PI / 7, hl = 12;
  rc.line(ex, ey, ex - hl * Math.cos(tang - sp), ey - hl * Math.sin(tang - sp), o);
  rc.line(ex, ey, ex - hl * Math.cos(tang + sp), ey - hl * Math.sin(tang + sp), o);
}
function drawStarburst(rc: RC, cx: number, cy: number, o: RO, count = 12, rIn = 7, rOut = 18) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2, j = 1 + (i % 2 ? 0.28 : -0.12);
    rc.line(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn, cx + Math.cos(a) * rOut * j, cy + Math.sin(a) * rOut * j, { ...o, strokeWidth: 2 });
  }
}

const DIRS: Record<string, number[]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], none: [0, 1] };

// N hand-drawn callouts ON the frame, each draggable, all baked into one PNG. Tiny tight circle on WHAT
// moves, an expressive glyph for HOW it moves, and a marker-font caption (the MOTION) in the margin.
export default function AnnotatedFrame({ src, annotations, index, isLast, onCorrection, onExpand, showCallouts = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const annsRef = useRef<Ann[]>(annotations || []);
  annsRef.current = annotations || [];
  const placedRef = useRef<Placed[]>([]);
  const contentRef = useRef<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const bgRef = useRef<{ hex: string; lum: number }>({ hex: "#0E0E10", lum: 20 });
  const draggingRef = useRef<number>(-1);
  const clickRef = useRef<{ x: number; y: number } | null>(null);
  const [dims, setDims] = useState<{ cw: number; ch: number; fx: number; fy: number; fw: number; fh: number } | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const [nudged, setNudged] = useState(false);

  useEffect(() => {
    const id = "ml-marker-font";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap";
      document.head.appendChild(l);
    }
    let alive = true;
    document.fonts
      ?.load("24px 'Permanent Marker'")
      .then(() => alive && setFontReady(true))
      .catch(() => alive && setFontReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1080;
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      imgRef.current = img;
      const cb = detectContentBox(img, w, h);
      bgRef.current = { hex: cb.bgHex, lum: cb.bgLum };
      // Top up the margin around the phone so captions always have a band to live in (no double margin
      // when the clip already has letterbox; fills it in when the recording is edge-to-edge).
      const tX = Math.round(w * 0.06), tY = Math.round(h * 0.1);
      const padL = Math.max(0, tX - cb.x);
      const padR = Math.max(0, tX - (w - (cb.x + cb.w)));
      const padT = Math.max(0, tY - cb.y);
      const padB = Math.max(0, tY - (h - (cb.y + cb.h)));
      const cw = w + padL + padR, ch = h + padT + padB, fx = padL, fy = padT;
      const content = { x: cb.x + padL, y: cb.y + padT, w: cb.w, h: cb.h };
      contentRef.current = content;
      const anns = annsRef.current;
      placedRef.current = anns.map((a, k) => sizeAnnotation(a?.bbox, w, h, fx, fy, content, k));
      setDims({ cw, ch, fx, fy, fw: w, fh: h });
    };
    img.src = src;
  }, [src]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !dims) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { cw, ch, fx, fy, fw, fh } = dims;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = bgRef.current.hex || "#0E0E10";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, fx, fy, fw, fh);
    if (!showCallouts) return; // clean frame — no annotations drawn

    const rc = rough.canvas(canvas);
    const anns = annsRef.current;
    const content = contentRef.current;
    const placed = placedRef.current;
    // margin caption ink follows the BACKGROUND (margin), not the element
    const mLum = bgRef.current.lum;
    const marginInk = mLum > 140 ? "#141414" : "#FFD400";
    const halo = mLum > 140 ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.72)";
    const statusBar: Box = { x: content.x, y: content.y, w: content.w, h: content.h * 0.06 };
    const placedBoxes: Box[] = [statusBar];

    type CapJob = { lines: string[]; fs: number; lh: number; bw: number; bh: number; x: number; y: number; ink: string; from: [number, number]; gap: number; onFrame: boolean };
    const capJobs: CapJob[] = [];

    // draw order: ellipses + glyphs first; captions painted last so text is never crossed
    const order = placed.map((_, k) => k).sort((p, q) => placed[p].cx - placed[q].cx);
    order.forEach((k) => {
      const p = placed[k];
      const ann = anns[k] || {};
      const arrowDir = (ann.arrow || "none").toLowerCase();
      const dirVec = DIRS[arrowDir] || DIRS.none;
      let glyph = (ann.glyph || "").toLowerCase();
      if (!glyph || (isLast && k === 0 && glyph !== "loop" && glyph !== "scroll")) {
        glyph = glyphFromLabel(ann.label, arrowDir, !!isLast && k === 0);
      }
      const isFinal = glyph === "final";

      // element-local ink (for the ring + glyph), sampled under the element
      let ink = "#FFD400";
      try {
        const s = 24;
        const sx = clamp(p.cx - s / 2, 0, cw - s), sy = clamp(p.cy - s / 2, 0, ch - s);
        const d = ctx.getImageData(sx, sy, s, s).data;
        let lum = 0;
        for (let i = 0; i < d.length; i += 4) lum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        lum /= d.length / 4;
        ink = lum > 140 ? "#141414" : "#FFD400";
      } catch {}
      const gInk = isFinal ? FINAL_GREEN : ink;
      const o: RO = { stroke: gInk, strokeWidth: 3, roughness: 1.4, bowing: 1, seed: 1000 + index * 37 + k * 7 + 1 };

      let e: E;
      // a pan/scroll over a LARGE region reads as a giant circle — point with an arrow instead
      const bigScroll = glyph === "scroll" && (p.w > content.w * 0.5 || p.h > content.h * 0.45);
      if (p.mode === "pointer" || bigScroll) {
        // whole-view moves → don't encircle; point with one bold arrow (drag-friendly), no box-glyph
        const hx = Math.min(p.w / 2, content.w * 0.3), hy = Math.min(p.h / 2, content.h * 0.3);
        let tipX: number, tipY: number;
        if (arrowDir === "none") { tipX = p.cx; tipY = p.cy - hy; }
        else { tipX = p.cx + dirVec[0] * hx; tipY = p.cy + dirVec[1] * hy; }
        const av = arrowDir === "none" ? [0, -1] : dirVec;
        const tailX = tipX - av[0] * 72, tailY = tipY - av[1] * 72;
        roughArrow(rc, tailX, tailY, tipX, tipY, { ...o, strokeWidth: 4 });
        e = { cx: p.cx, cy: p.cy, w: Math.min(p.w, content.w * 0.5), h: Math.min(p.h, content.h * 0.4) };
      } else {
        const dashed = glyph === "appear" || glyph === "vanish";
        rc.ellipse(p.cx, p.cy, p.w, p.h, { stroke: gInk, strokeWidth: 3, roughness: 1.6, bowing: 1.2, seed: 1000 + index * 37 + k * 7, ...(dashed ? { strokeLineDash: [9, 7] } : {}) });
        e = { cx: p.cx, cy: p.cy, w: p.w, h: p.h };
        switch (glyph) {
          case "arrow": drawArrowGlyph(rc, e, dirVec, o, false); break;
          case "scroll": drawArrowGlyph(rc, e, dirVec, o, true); break;
          case "drop": drawChevronStack(rc, e, dirVec, o); break;
          case "grow": drawScaleGlyph(rc, e, o, true); break;
          case "shrink": drawScaleGlyph(rc, e, o, false); break;
          case "appear": drawAppearGlyph(rc, e, o); break;
          case "vanish": break;
          case "loop": drawLoopGlyph(rc, e, o); break;
          case "final": drawStarburst(rc, e.cx, e.cy - e.h / 2 - 6, o); break;
          default: if (arrowDir !== "none") drawArrowGlyph(rc, e, dirVec, o, false);
        }
      }
      placedBoxes.push({ x: e.cx - e.w / 2, y: e.cy - e.h / 2, w: e.w, h: e.h });

      // ---- caption: wrap, then place in the best margin band ----
      const labelRaw = isFinal ? "final state" : (ann.label || "");
      if (!labelRaw) return;
      const baseFs = clamp(Math.round(fw * 0.044), 13, 30);
      const wrap = (maxW: number) => {
        for (let fs = baseFs; fs >= 11; fs--) {
          ctx.font = `${fs}px 'Permanent Marker','Marker Felt',cursive`;
          const words = labelRaw.split(/\s+/);
          const lines: string[] = [];
          let cur = "";
          for (const wd of words) {
            const t = cur ? cur + " " + wd : wd;
            if (ctx.measureText(t).width <= maxW || !cur) cur = t;
            else { lines.push(cur); cur = wd; }
          }
          if (cur) lines.push(cur);
          if (lines.length <= 3 || fs === 11) {
            const bw = Math.max(...lines.map((l) => ctx.measureText(l).width));
            return { lines: lines.slice(0, 3), fs, lh: Math.round(fs * 1.18), bw, bh: Math.min(lines.length, 3) * Math.round(fs * 1.18) };
          }
        }
        return { lines: [labelRaw], fs: 11, lh: 14, bw: ctx.measureText(labelRaw).width, bh: 14 };
      };

      const overlaps = (bx: Box) => placedBoxes.some((q) => !(bx.x + bx.w < q.x || q.x + q.w < bx.x || bx.y + bx.h < q.y || q.y + q.h < bx.y));
      const elemTopHalf = p.cy < content.y + content.h / 2;
      const topBandH = content.y, botBandH = ch - (content.y + content.h);
      const rightBandW = cw - (content.x + content.w), leftBandW = content.x;

      // build candidate slots in preference order; bottom default (60fps style), seeded by k for variety
      type Slot = { x: number; y: number; band: string; pen: number };
      const wide = wrap(Math.min(fw * 0.98, cw - 12));
      const narrowR = wrap(Math.max(60, rightBandW - 12));
      const narrowL = wrap(Math.max(60, leftBandW - 12));
      const cands: { slot: Slot; wr: typeof wide }[] = [];
      const pushTop = () => topBandH > wide.bh + 8 && cands.push({ slot: { x: clamp(p.cx - wide.bw / 2, 6, cw - wide.bw - 6), y: clamp(content.y - 8 - wide.bh, 6, ch), band: "top", pen: 10 }, wr: wide });
      const pushBot = () => botBandH > wide.bh + 8 && cands.push({ slot: { x: clamp(p.cx - wide.bw / 2, 6, cw - wide.bw - 6), y: content.y + content.h + 8, band: "bottom", pen: 0 }, wr: wide });
      const pushRight = () => rightBandW > 70 && cands.push({ slot: { x: content.x + content.w + 8, y: clamp(p.cy - narrowR.bh / 2, 6, ch - narrowR.bh - 6), band: "right", pen: 20 }, wr: narrowR });
      const pushLeft = () => leftBandW > 70 && cands.push({ slot: { x: clamp(content.x - 8 - narrowL.bw, 6, cw), y: clamp(p.cy - narrowL.bh / 2, 6, ch - narrowL.bh - 6), band: "left", pen: 30 }, wr: narrowL });
      // primary band seeded by index so simultaneous captions split across margins
      const seedBand = ["bottom", "top", "right", "left"][k % 4];
      const orderFns = seedBand === "top" ? [pushTop, pushBot, pushRight, pushLeft]
        : seedBand === "right" ? [pushRight, pushLeft, pushBot, pushTop]
        : seedBand === "left" ? [pushLeft, pushRight, pushBot, pushTop]
        : elemTopHalf ? [pushBot, pushTop, pushRight, pushLeft] : [pushTop, pushBot, pushRight, pushLeft];
      orderFns.forEach((f) => f());
      // on-frame last resort
      cands.push({ slot: { x: clamp(p.cx - wide.bw / 2, 6, cw - wide.bw - 6), y: clamp(p.cy + p.h / 2 + 10, statusBar.y + statusBar.h + 4, ch - wide.bh - 6), band: "frame", pen: 80 }, wr: wide });

      let best: { slot: Slot; wr: typeof wide } | null = null;
      let bestCost = Infinity;
      for (const cand of cands) {
        const box: Box = { x: cand.slot.x, y: cand.slot.y, w: cand.wr.bw, h: cand.wr.bh };
        let cost = cand.slot.pen;
        if (overlaps(box)) cost += 220;
        // leader length (caption box centre → element centre)
        cost += Math.hypot(box.x + box.w / 2 - p.cx, box.y + box.h / 2 - p.cy) * 0.04;
        if (cost < bestCost) { bestCost = cost; best = cand; }
      }
      if (!best) best = cands[cands.length - 1];
      const box: Box = { x: best.slot.x, y: best.slot.y, w: best.wr.bw, h: best.wr.bh };
      placedBoxes.push(box);
      capJobs.push({ lines: best.wr.lines, fs: best.wr.fs, lh: best.wr.lh, bw: best.wr.bw, bh: best.wr.bh, x: box.x, y: box.y, ink: isFinal ? FINAL_GREEN : marginInk, from: [p.cx, p.cy], gap: 14, onFrame: best.slot.band === "frame" });
    });

    // leaders (under text)
    capJobs.forEach((c, i) => {
      const ex = clamp(c.from[0], c.x, c.x + c.bw), ey = clamp(c.from[1], c.y, c.y + c.bh);
      const dist = Math.hypot(ex - c.from[0], ey - c.from[1]);
      if (dist > c.gap && !c.onFrame) {
        rc.line(ex, ey, c.from[0], c.from[1], { stroke: c.ink, strokeWidth: 1.6, roughness: 1, seed: 1000 + index * 37 + i * 7 + 2 });
        ctx.beginPath();
        ctx.arc(c.from[0], c.from[1], 2.6, 0, Math.PI * 2);
        ctx.fillStyle = c.ink;
        ctx.fill();
      }
    });

    // captions last (halo + fill), or a faint plate only for the on-frame last resort
    ctx.textBaseline = "top";
    ctx.lineJoin = "round";
    capJobs.forEach((c) => {
      ctx.font = `${c.fs}px 'Permanent Marker','Marker Felt',cursive`;
      if (c.onFrame) {
        const px = 7;
        ctx.fillStyle = mLum > 140 ? "rgba(255,255,255,0.78)" : "rgba(0,0,0,0.55)";
        ctx.fillRect(c.x - px, c.y - 4, c.bw + px * 2, c.bh + 6);
      }
      c.lines.forEach((ln, li) => {
        const ty = c.y + li * c.lh;
        ctx.strokeStyle = halo;
        ctx.lineWidth = Math.max(3, c.fs * 0.22);
        ctx.strokeText(ln, c.x, ty);
        ctx.fillStyle = c.ink;
        ctx.fillText(ln, c.x, ty);
      });
    });
  }, [dims, index, fontReady, showCallouts]);

  useEffect(() => {
    draw();
  }, [draw]);

  const toCanvas = (e: ReactPointerEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (dims!.cw / r.width), y: (e.clientY - r.top) * (dims!.ch / r.height) };
  };
  const onDown = (e: ReactPointerEvent) => {
    if (!dims) return;
    if (!showCallouts) {
      // clean view — nothing draggable, any click is an enlarge candidate
      clickRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const pt = toCanvas(e);
    let best = -1;
    let bestD = Infinity;
    placedRef.current.forEach((p, k) => {
      const d = Math.hypot(pt.x - p.cx, pt.y - p.cy);
      if (d < Math.max(p.w, p.h) / 2 + 40 && d < bestD) {
        best = k;
        bestD = d;
      }
    });
    if (best >= 0) {
      draggingRef.current = best;
      canvasRef.current?.setPointerCapture(e.pointerId);
    } else {
      // Not on a callout — treat as a click-to-enlarge candidate (confirmed on
      // pointer-up if the pointer hasn't moved, so drags never trigger it).
      clickRef.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onMove = (e: ReactPointerEvent) => {
    const k = draggingRef.current;
    if (k < 0 || !dims) return;
    const pt = toCanvas(e);
    const p = placedRef.current[k];
    const ddx = clamp(pt.x, 0, dims.cw) - p.cx, ddy = clamp(pt.y, 0, dims.ch) - p.cy;
    p.cx += ddx; p.cy += ddy;
    p.ex0 += ddx; p.ex1 += ddx; p.ey0 += ddy; p.ey1 += ddy;
    if (!nudged) setNudged(true);
    draw();
  };
  const onUp = (e: ReactPointerEvent) => {
    const k = draggingRef.current;
    if (k < 0) {
      const c = clickRef.current;
      clickRef.current = null;
      if (c && Math.hypot(e.clientX - c.x, e.clientY - c.y) < 5) expand();
      return;
    }
    draggingRef.current = -1;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    const p = placedRef.current[k];
    if (onCorrection && dims && (Math.abs(p.cx - p.ox) > 2 || Math.abs(p.cy - p.oy) > 2)) {
      onCorrection({
        index,
        annotation: k,
        label: annsRef.current[k]?.label || "",
        from: [Math.round(p.ox), Math.round(p.oy)],
        to: [Math.round(p.cx), Math.round(p.cy)],
        canvas: [dims.cw, dims.ch],
      });
    }
  };

  const expand = () => {
    const canvas = canvasRef.current;
    if (canvas && onExpand) onExpand(canvas.toDataURL("image/png"));
  };

  const download = () => {
    canvasRef.current?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `motionlens-frame-${index + 1}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  const copy = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const b = await new Promise<Blob>((res) => canvas.toBlob((x) => res(x as Blob), "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
    } catch {}
  };

  const count = (annotations || []).length;
  return (
    <div style={{ minWidth: 240, maxWidth: 340 }}>
      <canvas
        ref={canvasRef}
        width={dims?.cw || 300}
        height={dims?.ch || 200}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        style={{ width: "100%", borderRadius: 8, border: "1px solid #222", display: "block", touchAction: "none", cursor: showCallouts ? "grab" : "zoom-in" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
        <button type="button" onClick={expand} style={miniBtn}>⤢ View</button>
        <button type="button" onClick={download} style={miniBtn}>⬇︎ Save</button>
        <button type="button" onClick={copy} style={miniBtn}>⧉ Copy</button>
        <span style={{ fontSize: 11, opacity: 0.45 }}>
          {!showCallouts
            ? "clean view"
            : nudged
              ? "nudged ✓"
              : count > 1
                ? `${count} callouts · drag to fix`
                : "drag to fix"}
        </span>
      </div>
    </div>
  );
}

const miniBtn: CSSProperties = {
  background: "#15151a",
  border: "1px solid #2a2a33",
  color: "#e8e4da",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer",
};
