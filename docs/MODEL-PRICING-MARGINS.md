# MotionLens — Model, Pricing & Margins

## 💳 DEFINITIVE PRICING & MARGINS — June 22, 2026 (CANONICAL; supersedes everything below)

**Model = CREDITS** (founder decision). **Precision is now a SUPERSET** = multi-pass blueprint + mechanic pass + annotated storyboard (the works). **Code export = FREE.** Verified rates: Gemini 3 Flash **$0.50/1M in · $3/1M out**, video **258 tok/frame × fps × sec** (₹83/$).

### Credit weights (≈ real cost ratio)
| Mode | What you get | Credits | Real COGS | ₹/credit |
|---|---|---|---|---|
| Standard | fast blueprint + plain frames | **1** | ₹1.9 | 1.9 |
| Annotated | blueprint + annotated storyboard | **2** | ₹4.7 | 2.35 |
| Precision | multi-pass accuracy + mechanic + annotated storyboard | **3** | ₹6.9 | 2.30 |
| Code export | Blueprint → framework code | **0 (free)** | ~₹0.8 | — |

### Plans
| Plan | Price | Credits/mo | ≈ Standard / Annotated / Precision | $/credit |
|---|---|---|---|---|
| Free | $0 | **30** | 30 / 15 / 10 | — |
| **Pro** | **$24** | **300** | 300 / 150 / 100 | $0.080 |
| **Studio** | **$49** | **750** | 750 / 375 / 250 | $0.065 |
| Top-up | **+$9** | **+100** | 100 / 50 / 33 | $0.090 |

### Margins — Pro $24 (₹1,992 rev)
| Usage | Runs | COGS | **Margin** |
|---|---|---|---|
| Realistic (~25 mixed) | 25 | ~₹80 | **96%** |
| ALL standard maxed | 300 | ₹570 | **71%** |
| ALL annotated maxed | 150 | ₹705 | **65%** |
| ALL precision maxed | 100 | ₹690 | **65%** |

### Margins — Studio $49 (₹4,067 rev)
| Usage | Runs | COGS | **Margin** |
|---|---|---|---|
| Realistic (~60 mixed) | 60 | ~₹190 | **95%** |
| ALL standard maxed | 750 | ₹1,425 | **65%** |
| ALL annotated maxed | 375 | ₹1,763 | **57%** |
| ALL precision maxed | 250 | ₹1,725 | **58%** |

**Absolute worst case anywhere ≈ 57%** (Studio, all-annotated, fully maxed); −~4% fees/infra → ~54% net. Nobody maxes → realistic ≈ **95%**. Credits CAP the costly modes, so a precision-heavy user can't drain you (founder's edge).

### Top-up margin (+100 cr / $9 = ₹747): all-precision 33 runs × ₹6.9 = ₹228 → **69%**; all-standard → 75%. Priced slightly above Pro's $/credit = overage premium.

### Free-tier exposure (the REAL cost risk, not the model): 30 cr → max ~₹70/free user/mo (10 precision or 30 standard). REQUIRE login + hard cap. Margin discipline = free-tier + clip caps (30s/10s), never the model. (30>20 for better activation — let them fall in love before the paywall.)

### Scale (1,000 paying, ~30 runs/user, blended ARPU ~$28): MRR ≈ **$28k (₹23L)**; inference ~$1.3k + fees ~$1.1k + infra ~$0.2k → net ≈ **$25.4k ≈ 91% margin.** Model cost ≈ 4.5% of revenue = noise.

### UI rules that make credits painless (BUILD THESE):
1. Show credits TRANSLATED ("~100 precision analyses"), never bare "300 credits".
2. Calm balance bar ("228 / 300 this month"), not a red countdown.
3. Code export = 0 credits (moat feature stays frictionless).
4. Generous amounts; monitor month-1, loosen if usage is timid.

### Cost lever for LATER (not now): `media_resolution:"low"` = 66 vs 258 tok/frame → ~4× cheaper video (≈65% of COGS). NOT the clip's pixel res — Gemini's internal per-frame detail budget. A/B on 20 clips before flipping.

---
*Working notes below (historical; the block above is canonical).*

## Model decision (June 21, 2026)
- **Default: `gemini-3-flash`.** MMMU-Pro ~81.2% ≈ Gemini 3 Pro, but 4× cheaper, 3× faster.
- **Auto-fallback to `gemini-3-pro`** only when confidence is low / clip is unusually complex.
- **NOT 2.5 Flash** — laggard (~68% MMMU-Pro, 13-pt gap).
- **NOT 3 Pro by default** — only wins on long-doc/multi-step reasoning (irrelevant to short clips); 4× cost for ~0 gain.
- ⚠️ **Caveat:** MMMU-Pro is a *general* benchmark. The real test is **your own 20-clip set** — benchmark scores ≠ customer value for this niche task.
- Architecture is **model-agnostic** (swappable behind the Motion IR). Qwen3-VL = open backup if self-hosting to cut cost at scale later.

## Pricing of models (per 1M tokens, June 2026)
| Model | Input | Output | MMMU-Pro |
|---|---|---|---|
| Gemini 2.5 Flash | $0.30 | $2.50 | ~68% |
| **Gemini 3 Flash (default)** | **$0.50** | **$3.00** | **81.2%** |
| Gemini 3.5 Flash | $1.50 | $9.00 | 83.6% |
| Gemini 3 Pro (fallback) | $2.00 | $12.00 | ~81% |
| Qwen3-VL (open) | $0.26 | $0.90 | strong |

Video billing: **258 tokens/sec** at default res; **66 tok/sec** at `low` res (~3× cheaper).

## Cost per analysis (15s clip; ~1.5k prompt + ~2k output)
| 3 Flash | tiered (85% Flash / 15% Pro) | all 3 Pro |
|---|---|---|
| ₹0.75 ($0.009) | ₹1.1 ($0.013) | ₹3.0 ($0.035) |

## Pricing tiers (flat, simple — buyer = indie dev)
| Plan | Price | Animations/mo | Notes |
|---|---|---|---|
| Free | $0 | 5 | "Built with" credit (virality hook) |
| **Pro (hero)** | **$19/mo** | 100 | link + video + MCP + all frameworks |
| Pro+ | $39/mo | 250 | heavy builders / freelancers |
Optional annual = 2 months free. No credits, no nickel-diming.

## Margins (on 3 Flash, ~$0.01/analysis)
- Pro $19 @ 80 used → COGS $0.80 → **96%**
- Pro+ $39 @ 250 used → COGS $2.50 → **94%**
- Real avg usage ~20–30/mo → real margin ~96–99%.

## Scale projections (monthly; tiered model, ~30 analyses/user, ARPU ~$23, 5% fees, ~$0.20/user infra)
| Paying users | MRR | Inference | Fees+infra | **Profit** | Margin |
|---|---|---|---|---|---|
| 100 | $2,300 (₹2.0L) | $45 | ~$165 | **~$2,090 (₹1.8L)** | 91% |
| 500 | $11,500 (₹9.9L) | $225 | ~$725 | **~$10,550 (₹9.1L)** | 92% |
| 1,000 | $23,000 (₹19.8L) | $450 | ~$1,450 | **~$21,100 (₹18.1L)** | 92% |
| 5,000 | $115,000 (₹99L) | $2,250 | ~$6,950 | **~$105,800 (₹91L)** | 92% |

> **1,000 paying ≈ $23k MRR ≈ ₹18L/mo profit** = the North Star, on this one product.

## Key insight: model cost is NOISE
At 1,000 users (30k analyses/mo): all-Flash $300 · tiered $450 · **all-Pro $1,200** —
even all-Pro is only ~5% of $23k MRR. **Pick by output quality, not price. Optimize for delight.**

## The REAL cost risks (not the model)
1. **Free-tier abuse** — free users = $0 revenue, real cost. Cap hard (5/mo), require login.
2. **Long clips** — a 5-min upload costs ~20× a 15s one. **Cap clips at 10–30s.**
3. That's it. Margin lives/dies on free-tier discipline + clip length.

---

## 🔒 FINAL LOCKED CONFIG (June 22, 2026)
- **Model:** `gemini-3-flash-preview` for ALL modes (81% quality, cheap). 3.5-Flash parked.
- **Upload caps:** Standard/Annotated **30s** · Precision **10s** (mode-aware, client-side). Precision = one short, high-detail interaction; trim longer clips.
- **Per-mode fps + passes:** Standard **6** (1 pass) · Annotated **8** (2 passes) · Precision **12** (2 passes: draft → verify-and-finalize). Don't exceed 12fps (diminishing returns; multi-pass beats more fps).
- **Cost per run (rates VERIFIED June 22: $0.50/1M in, $3/1M out; video 258 tok/frame×fps×sec):**
  - Typical ~12s clip → **Standard ₹1.9 · Annotated ₹4.7 · Precision ₹4.7** (precision now = draft + verify + ≤3 mechanic-pass still calls).
  - Max clip → Standard ₹2.7 (30s) · Annotated ₹6.3 (30s) · Precision ₹4.7 (10s cap).
- **CODE EXPORT (new): ~₹0.8 per framework**, text-only (works off the Blueprint JSON, no video) — the CHEAPEST op. On-demand (button); even all-6-frameworks for one clip ≈ ₹4.7. Negligible to margins.
- **💳 PLANS — CREDIT MODEL (FOUNDER DECISION June 22, credits CHOSEN over flat caps).** Rationale (valid): credits CAP expensive actions → better worst-case margin (precision user can't drain a flat cap); cleaner COGS forecasting (one unit → credit pool); fits the AI-compute category (Replicate/Runway/Midjourney/model-APIs all meter). Founder: "if they want, they'll run; from our side easier to estimate & manage."
  - **Credit weights (≈ real cost ratio):** Standard = **1** · Annotated = **2** · Precision = **3** · **Code export = 0 (FREE — drives the moat workflow).**
  - Free $0 — **20 credits/mo** (~20 standard / ~6 precision; login required).
  - **Pro $24 — 300 credits/mo** (~300 standard / 150 annotated / **100 precision**).
  - **Studio $49 — 750 credits/mo** (~750 std / 375 annot / 250 precision) + priority/API/seats.
  - **Top-up: +200 credits / $9**, rolls in instantly.
- **Worst-case margins (credits BEAT flat — the founder's edge, proven):** Pro all-precision = 300cr/3 = 100 runs × ₹4.7 = ₹470 ($5.7) → **76%** (vs 57% flat). Studio = 250 runs × ₹4.7 = ₹1,175 → **71%**. Realistic (~25 runs/mo) **~95%**. Credits cap the expensive actions = tighter margin protection.
- **FRICTION-KILLERS (mandatory, this is what makes credits not suck for indies pre-PMF):** (1) pricing page TRANSLATES credits to real numbers ("~100 precision analyses"), never bare "300 credits"; (2) calm BALANCE BAR ("228 / 300 this month"), not a scary countdown; (3) code export = 0 credits (moat feature frictionless); (4) amounts generous so a normal user never hits the wall. RISK acknowledged: any visible meter can suppress the "just try it" habit pre-PMF → monitor first-month usage, loosen amounts if people run timid.
- **media_resolution clarification:** "low" is NOT the clip's pixel resolution (clip stays 1080p) — it's Gemini's INTERNAL per-frame token/detail budget (66 vs 258 tok/frame). Same upload, Gemini just "squints" less → ~4× cheaper video, sees less fine text. Test before flipping.
- **Margins (credit model):** realistic ~95% (avg ~25 runs/mo). Worst case all-precision-maxed: Pro ~76% · Studio ~71% (credits cap the costly actions). Abuse handled by login + per-day rate limit, not just credits.
- **🟢 BIGGEST UNUSED LEVER: `media_resolution:"low"` = 66 tok/frame (vs 258) → ~4× cheaper VIDEO input** (video = ~65% of per-run cost). UI motion/layout rarely needs fine text, so low-res blueprint pass could cut Standard/Annotated ~55-60%. Risk: misses tiny text/elements → TEST on the 20-clip set, keep localize/mechanic passes at default res. Currently OFF (default res). Flip after validation.
- **Pricing tactic:** market "$24 early-bird, locked for life — going to $39" for urgency + early-user goodwill.
- **At launch:** log anonymized metrics (clip duration, cost, mode, success rate) → tune fps & limits from real data, not guesses.
- Billing: account is on **Paid Tier 1** (10K RPD), so quota is not a constraint.
