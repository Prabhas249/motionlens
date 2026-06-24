# MotionLens *(working name — see Naming)*

**Turn any UI animation into an AI-ready Motion Blueprint.**
The bridge between UI motion and AI coding agents (Claude Code, Cursor, etc.).

Record/upload a short clip of an animation → AI watches it → you get a clean,
structured **Motion Blueprint** (storyboard + timeline + spec + ready-to-paste
agent prompt) that an AI coding agent can actually implement.

> We don't generate animations. We generate **understanding**.

---

## Status (June 21, 2026)
- ✅ Strategy, model, pricing, margins, v1 scope — all locked (validated by 4 AIs).
- 🔨 Building v1. Next action: get one Gemini call working on one test video.

## The one-liner pitch
"Stop describing animations. Show them." — Upload any UI animation (web **or** app),
get a Motion Blueprint your AI coding agent gets right.

## Why it exists
AI coding agents are great at static code but **bad at motion**. You can't paste a
video into Claude Code, and "make it smooth like Apple" makes it guess. MotionLens
watches the motion and hands the agent a precise, framework-agnostic description.

## Docs
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — problem, solution, the 7 outputs, flow, moat, Blueprint format + Gemini prompt
- [`docs/MODEL-PRICING-MARGINS.md`](docs/MODEL-PRICING-MARGINS.md) — model choice, pricing, margins, scale projections
- [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) — v1 scope, day-by-day plan, Day-1 code, benchmark + validation plan

## Stack (planned)
Next.js (Vercel) · Gemini API (`gemini-3-flash`) · ffmpeg · Supabase (auth/db) ·
Lemon Squeezy / Paddle (payments, Merchant-of-Record) · MCP server (later).

## Buyer
Indie devs / vibe-coders / frontend & mobile devs on Claude Code & Cursor
(React, React Native, Flutter, SwiftUI, Jetpack Compose). **Not** agencies/enterprise.

## Naming
Working name **MotionLens**. Not finally locked. Alternatives: Choreo, Cue, MotionBrief.
Rule: grab whatever domain/handle is free, decide in 10 minutes, don't agonize.
