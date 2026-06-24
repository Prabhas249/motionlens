import { GoogleGenAI, Type } from "@google/genai";
import sharp from "sharp";
import { writeFile, readFile, unlink, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pexecFile = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 120;

// Free tier = ~20 requests/DAY *per model*. Switching models = a fresh quota bucket.
// Quality order: gemini-3.5-flash > gemini-3-flash-preview > gemini-2.5-flash (all work on this key).
// The real fix for heavy use is enabling billing (limits jump to thousands/day, ~₹2-7/run).
const MODEL = "gemini-3-flash-preview";
// Faster/cheaper — for image-only grounding (bounding boxes, mechanic stills) where flagship isn't needed.
const FAST_MODEL = "gemini-2.5-flash";
const INK = "#FFE000"; // 60fps-style annotation yellow

// Mechanic-disambiguation micro-pass (precision only): scale vs slide vs camera-pan is the one residual
// the prompt can't fix at 6-12fps — the frames that settle it aren't in the model's context. We pull
// START/MID/END full-res stills of an AMBIGUOUS motion and ask a focused geometry question. Hard-gated:
// precision-only, candidate-filtered, capped — 0 calls on clean clips.
const MICRO_PASS_MAX = 3;
const AMBIG_RE = /keyboard|panel|sheet|drawer|tray|bracket|viewport|pan|scroll|widen|expand|grow|slide|zoom|reveal/i;
const MECHANIC_PROMPT = `These are THREE stills from ONE UI motion, in order: image 1 = START (motion just
began), image 2 = MID (mid-transition), image 3 = END (motion almost finished). They are the SAME element.
A draft analysis labelled this motion as: ELEMENT="{element}", CHANGE="{change}", MOTION_CLASS="{class}",
FROM="{from}", TO="{to}". That label may be WRONG. Decide the TRUE mechanic by comparing the three frames.
Between START and END, what actually changed for this element?
- SCALE  — the element's SIZE changed: compare its TOP edge and BOTTOM edge across frames. If one edge stays
  put while the other moves so the HEIGHT/WIDTH changes, that is SCALE (a keyboard that GROWS up from the
  bottom). More rows/content becoming visible INSIDE the element = scale/reveal, not slide.
- SLIDE  — POSITION changed but SIZE did NOT: top AND bottom edges move by the SAME amount, size constant.
- CAMERA — the element did not move as an object; the WHOLE viewport panned over larger fixed content
  (everything shifts together, new content enters at the leading edge — the bracket case).
- REVEAL — already there at full size, got uncovered/wiped/clipped/path-drawn in (a mask), not growing.
- NONE   — across the three frames this element does not actually change (the draft over-reported it).
Also report DIRECTION (up/down/left/right/in/out/none); if SCALE, in=grows / out=shrinks; and concrete
from->to values you can read off the frames (e.g. height 0px -> 320px, x 100% -> 0%). Be decisive: pick the
single best mechanic. Set confidence "high" only if the three frames clearly show it. Return ONLY JSON.`;

// ---------- prompts ----------
const PROMPT = `You are a senior motion designer doing a teardown. Watch the ENTIRE clip, then produce a
"Motion Blueprint" — a framework-agnostic, structured description an AI coding agent can use to recreate it
AS CLOSELY AS POSSIBLE. Do NOT output code. Describe the MOTION (the units AND the mechanics), the exact
visuals, and the feel. The output structure is enforced by a response schema — fill every field; do NOT
restate the schema in your answer.

THE BAR — a pro teardown is a PER-MOMENT LIST OF CO-OCCURRING MOTIONS, not one sentence per beat. At
almost every moment SEVERAL things move AT ONCE. Amateurs report only the single headline transition and
miss the rest. Catch EVERY simultaneous layer. Depth reference: "selected tokens move into a stack + all
other elements blur and fade out + title, button and trash icon fade in + action tray slides down" is ONE
moment, FOUR motions; "button scales down on tap" WHILE "tokens land in the trash with a spring" is a
primary motion + a press micro-interaction at the same instant. Decompose to that level. Capture the unit
AND the mechanic — never a static object inventory.

WHAT YOU'RE WATCHING — adapt to the format; do NOT assume mobile. The clip may be a mobile app, a WEBSITE or
landing page, a desktop UI, a single component, or a pure graphic/motion piece. Use vocabulary that fits what
you actually see (don't force "splash"/"keyboard"/"tab bar" onto a website). Catch web/desktop motion as
readily as app motion: scroll-triggered reveals (elements fade/rise as they scroll into the viewport),
parallax (layers moving at different speeds), bento-grid / card-grid staggers (tiles animating in sequence),
hover states (scale / lift / glow / color shift on pointer), sticky or shrinking headers on scroll,
hero-section entrances, marquees / infinite tickers, accordions / expanders, route or page transitions, image
reveals (clip / mask wipes), and number or text counters. A landing page assembling on load is the web
equivalent of an app-launch — give it the same per-moment, multi-layer depth.

WORK IN THREE STEPS:
1) ENUMERATE (in your reasoning, not the output): list EVERY distinct visible region/component — header,
   title, each card/token/row, the background, any scrim/overlay, buttons, icons, cursor, nav indicators,
   secondary toggle/segment rows, etc. Include elements that turn out NOT to move. This roster is your
   checklist so you don't silently drop the 90% that isn't the headline.
2) OBSERVE (in your reasoning, not the output): play through from the VERY FIRST frame (0ms) to the last.
   At each moment, for EACH roster element, ask "does this move right now?" with timestamped notes. Cover
   the opening/initial state (splash, logo, blank) and every transition to the final state — never skip the
   beginning. CRITICAL: at every moment capture ALL layers firing together, not just the obvious one. Run
   this 6-question LAYER SWEEP at each moment (each BURST in the motion-energy hint is usually a moment):
     1. PRIMARY  — the ONE motion this moment is about, the change the eye follows. -> layer:"primary".
     2. SECONDARY— what else moves/appears/repositions BECAUSE of the primary (a title, button, icon, tray
        that fades in, shifts to make room, or settles slightly after). -> layer:"secondary".
     3. AMBIENT  — does the BACKGROUND/world react? Look specifically for: blur out, dim, fade back, recede
        — and later the REVERSE: de-blur, sharpen, brighten, re-appear. This is the MOST-MISSED layer; check
        it on EVERY focusing moment (a modal/sheet/selection opening). The de-blur on close is its OWN
        entry. -> layer:"ambient", change:"blur"/"fade".
     4. MICRO    — any input-bound feedback firing on a tap/select? Scan: press/tap (element scales DOWN
        ~1.0->0.96 then back, never to 0) · checkbox/select (container scales in + a tick/check PATH TRACES
        OUT, or a ring fills) · spring landing/overshoot/settle (a moving thing overshoots its end then
        settles; an entrance "pops in"; a logo "slightly overshoots in size") · ripple from the tap point ·
        toggle knob slides + track color crossfades · shake/wiggle (error) · hold-to-confirm fill · accent
        blink on select. These are FAST (200-500ms = 2-6 frames at 12fps) — use the motion-energy BURST
        spans to find them. -> layer:"micro", micro:true.
     5. ENTER / EXIT — what is ADDED to the screen (enter: fade+rise / pop-in / reveal)? what is REMOVED
        (exit: fade out / slide out / scale down)? Exits are usually SUBTLER than enters. -> layer:"enter"
        or "exit", direction:"in"/"out".
     6. STAGGER  — do 2+ SIMILAR items fire one-after-another (a list, a cluster of tokens/avatars/cards)?
        Set stagger_ms to the delay between consecutive items (~20-120ms). Use 0 only if they truly start
        together.
   Answering "none / not visible" to any question is CORRECT — never invent a layer to fill a slot.
   e.g. "1000ms: PRIMARY tokens stack (spring); SECONDARY tray slides down + trash can fades in; AMBIENT
   background stays blurred+dimmed; MICRO none here".
3) DERIVE: build the timeline and motion entries FROM those observations. Emit ONE motion entry PER ELEMENT
   PER PROPERTY for EVERY layer you saw — primary AND secondary AND ambient AND micro AND enter/exit. Do
   NOT collapse a busy moment into one entry; if four things move at 1000ms, that is four motion entries
   that share roughly the same time window — give them the SAME "concurrent_with" anchor so they group as
   one moment. It is EXPECTED that a rich clip yields many motion entries.

DO-NOT-MISS PAIRS — each almost always co-occurs; if you logged one, check for its twin:
  · a selection/modal/sheet OPENS      => background blurs + dims (ambient)            [#3]
  · that thing later CLOSES            => background de-blurs + re-appears (ambient)    [#3 reverse]
  · a button/row is TAPPED            => it scales down ~0.96 (micro press)            [#4]
  · a checkbox/item is SELECTED       => a tick path traces out (micro reveal)         [#4]
  · an element LANDS/drops in          => spring overshoot-then-settle (easing)         [#4]
  · primary content fades in           => secondary chrome fades in slightly later      [#2]
NOTE A SECOND CONTROL ROW: many UIs have MORE THAN ONE animated indicator (e.g. a tab bar AND a separate
view-toggle/segment row of icons, each with its own sliding highlight). Do not stop after the first
indicator — run the layer sweep on each control row independently and give each its own motion entries.

MOTION PRECISION — report ONLY what you actually see. Inventing a motion is WORSE than omitting one:
- Check each property independently. If an element moves horizontally, add an x/slide entry; if vertically,
  another; if it scales, a scale entry; if opacity changes, a fade entry; if it blurs, a blur entry. If
  only ONE property changes, record ONLY that one — never invent a second axis. But do NOT under-report:
  one element can legitimately have several entries (a logo that spins AND scales AND fades = three).
- THE MOST PROMINENT ELEMENT IS NOT EXEMPT — check it FIRST, not last. A centered logo / brand mark / hero
  element (especially on a splash, app-launch, or landing-page hero) very often has its OWN motion: it fades, dims, scales down,
  blurs, or recedes into the background as the rest of the UI builds OVER it. Do NOT describe it as "static",
  "stands still", or "stays in place" unless you have explicitly compared the FIRST vs LAST frame and its
  opacity AND scale AND position are ALL unchanged. If a splash logo is bright/large/sharp at the start and
  dim/small/backgrounded at the end, that IS a fade (often a scale too) — emit it as motion entries with
  explicit from->to (e.g. fade 1.0 -> 0.3). Anchoring on the hero element as a fixed reference while
  everything moves "around" it is a COMMON, COSTLY ERROR — the hero motion is usually the MOST important one.
- NAME THE PURPOSE, not just the mechanic. For each motion ALSO fill "purpose" = the UI PATTERN a developer
  would BUILD: cycling text with fade+slide = "rotating subtitle carousel"; swapping text/numbers in a pill =
  "live metric counter"; logs scrolling up forever = "infinite log ticker"; tiles animating in order =
  "staggered grid entrance"; scale/lift on pointer = "hover lift"; a splash logo receding = "splash-to-app
  hero transition". The mechanic is HOW it moves; purpose is WHAT IT IS. Developers need both — and reflect
  these component names in "story" and "agent_prompt" too (say "rotating carousel", not just "text fades").
- CONTENT SWAP vs COUNTER vs AMBIENT LOOP — these are constantly confused on web; label them correctly:
  · If an element's WHOLE text/label changes between states ("Pushed 186 updates" -> "Onboarded 5,000
    employees today"), that is a CONTENT SWAP: change:"text", motion_class:"morph", purpose like "rotating
    metric carousel". Do NOT call it a numeric counter just because numbers differ.
  · Call it a COUNTER (change:"count") ONLY if the SAME label's DIGITS visibly tick/roll up (e.g. 0 -> 5,000)
    while the surrounding words stay put.
  · A continuously oscillating waveform / equalizer / pulse is an INFINITE AMBIENT LOOP (state it loops
    seamlessly; purpose e.g. "ambient infrastructure noise") — NOT a one-shot "scale" with invented from/to heights.
- SEPARATE co-located systems: if ONE region runs TWO behaviours at once (e.g. an ambient looping waveform
  AND incident cards that appear over time), emit them as SEPARATE motion entries — never merge two distinct
  systems into one.
- CUMULATIVE reveals STACK: when items appear progressively and PERSIST (State A, then A+B, then A+B+C), say
  they accumulate / stack across the cycle — not that each new one replaces the previous.
- Determine easing from what you see: if the element overshoots/bounces past its end then settles, label it
  spring / ease-out-back; if it settles smoothly, ease-out / ease-in-out / linear. Report linear or
  no-overshoot when there is none — do NOT default to "spring". A SETTLE span in the motion-energy hint
  immediately after a BURST is corroborating evidence you may use to upgrade a suspected spring.
- If an element undergoes a SECONDARY transform DURING another motion (a logo that shrinks WHILE it slides
  up), record that as its OWN motion entry with explicit from->to (e.g. scale 1.0 -> 0.7). CRITICAL: when
  the SAME element has several transforms in the SAME moment (scale + slide + fade together), give EVERY
  one of those entries the SAME "concurrent_with" anchor (use the element's name, e.g. "X1 Logo") so they
  render as ONE combined moment, and in "story"/"agent_prompt" phrase them together ("the logo scales down
  WHILE sliding up and fading"), never as three disconnected steps.
- For continuous/looping motion, state it is an INFINITE SEAMLESS LOOP (note whether it wraps or resets).
- Give CONCRETE values where visible: element sizes in px, final positions as % of the viewport, slide
  offsets in px. Prefer numbers over vague words like "top-third".
- PER-MOTION CONFIDENCE: tag every motion entry — "high" only when clearly visible across multiple frames
  with an identifiable start AND end; "medium" when inferred from <=2 frames or timing is estimated; "low"
  when occluded/uncertain. Set inferred:false for directly observed motion.
- INFERRED MICRO-EFFECTS (the honest middle path): if you STRONGLY suspect a micro-effect from the sweep
  you can't fully confirm frame-by-frame — a spring/overshoot on a fast scale-in, a tick path-draw, a
  press-squish, a background blur you half-see — you MAY include it, but ONLY with confidence:"low" AND
  inferred:true, wording the easing as a hint (e.g. "likely spring"). NEVER mark an unconfirmed effect
  "high"/"medium"; NEVER claim a confirmed effect is inferred. When you genuinely cannot tell whether it
  happened AT ALL, OMIT it and note it in blind_spots instead. Depth must never become invention: a real
  motion at confidence:"low" is good; a guessed motion stated as fact is not. (micro:true marks the KIND
  of effect; inferred marks the EVIDENCE — they are independent: a CONFIRMED press is micro:true,
  inferred:false.)
- RELATIVE SPEED: only assert one element is FASTER than another if you CLEARLY see it complete more
  cycles; otherwise give comparable timing and mark confidence "medium". Do not guess "2x speed".
- MOTION_CLASS — for every motion entry, classify the MECHANISM: "transform" = the element itself
  translates/scales/rotates/fades; "camera" = the viewpoint/whole scene moves while elements don't
  individually transform; "reveal" = the element was already there and gets uncovered/clipped/wiped/
  path-drawn in (a mask or clip-path), NOT actually growing; "parallax" = layers move at different
  depths/speeds; "morph" = the shape itself changes form. A tick-mark that draws itself in is "reveal".
  If a growth could be a true scale OR a mask reveal and you can't tell, pick your best guess and set
  confidence "medium".
- STAGGER — when several SIMILAR elements animate in sequence (a list, a grid/cluster, cards, stacking
  tokens), set stagger_ms to the approximate DELAY between consecutive items starting (e.g. 60). Use 0
  only if they truly start together. Approximate is fine; mark confidence "medium".
- REPEATED / REVERSED MOTION (critical — these clips are DEMOS that often perform the SAME interaction
  several times, or forward-then-back-then-forward). Recognise this: a transition shown TWICE, or played
  in REVERSE (slides right, then later slides left back), is the SAME underlying motion — describe its
  MECHANIC ONCE as one motion entry (note "(also plays in reverse on the way back)" or "repeats"). Do NOT
  emit a brand-new motion entry for each repeat, do NOT invent extra distinct transitions that aren't
  there, and do NOT flip the direction wrong. A reverse is the forward motion's from/to swapped — same
  duration/easing. The number of DISTINCT motions is small even when the clip is long and busy with repeats.
- SCALE vs SLIDE vs PAN — these read similarly but are different mechanics; check carefully:
  · does the element's SIZE change (grows from small / nothing)? that is SCALE — even if it also enters
    from an edge. A keyboard/panel that GROWS into place = scale; one that only TRANSLATES in at full size
    = slide. When in doubt whether an entrance is scale or slide, look at whether its width/height changes.
  · does a viewport move ACROSS larger fixed content (the content is bigger than the screen and the camera
    pans over it)? that is motion_class:"camera" — describe it as "viewport pans left across the bracket",
    NOT "the bracket slides/scrolls left" (the bracket itself isn't moving as an object).
  · a compact row/list that WIDENS to reveal extra columns is a LAYOUT EXPAND (change:"scale" of the row +
    the new columns enter) — richer than a plain "columns fade in"; describe the rows expanding AND the
    columns revealing.

VERB PRECISION — write each entry as "<unit> <mechanic-verb> <qualifier>", present tense. Use the exact
mechanic: traces out, draws in, pops in, overshoots, lands with a spring, settles, stacks / forms a stack,
scales down on tap, blurs out, dims, de-blurs, re-appears, scrolls infinitely. NEVER "appears" /
"changes" / "is shown".

NAMING & COUNTS — describe by APPEARANCE, do not over-claim identity or exact numbers:
- Do NOT assert a letter or brand ("3D A-logo") unless the glyph is clearly, unambiguously legible. Prefer
  neutral appearance names: "iridescent 3D logo mark", "triangular logo".
- For many small repeated elements (avatars, dots, tokens, icons), counting is approximate — estimate and
  do NOT undercount; "~15" or "many (15-20)" beats a confident wrong "8".

LEAD WITH THE MOTION, NOT THE APP — "summary" and "story" describe the ANIMATION and its FEEL (what moves,
how, in what order, the spring/snap character), NOT what the app does or an object inventory:
- "summary" = 1-2 sentences naming the MOTION STORY and FEEL and the SIMULTANEOUS layers. WRONG (describes
  the product): "An interactive tournament tracker that transitions between standings, schedules and
  bracket views." RIGHT (describes the motion): "A sliding tab indicator drives a horizontal page-swap
  while a second view-toggle row's highlight slides between list/table/bracket icons; each incoming view
  fades and scales up as the outgoing one slides off — crisp, snappy, ease-out." Mention the app only as
  the surface the motion happens on, never as the lead.
- "story" = a 2-4 sentence NARRATIVE of the animation as a sequence of BEATS, the way a motion designer
  describes it to a teammate, calling out the SIMULTANEOUS layers (e.g. "The selection ticks in, then the
  chosen tokens glide into a stack as everything behind them blurs and dims; a title, trash icon and tray
  fade/slide in, the tokens land in the can with a spring, then drop away as the background de-blurs back to
  rest."). Describe what happens and the FEEL — do NOT speculate about the company, competitors, or
  implementation, and do NOT lead with the app's purpose.

"beats" = the COMPLETE animation as an ORDERED CHOREOGRAPHY — a numbered sequence of motion steps from the
first frame to the last, each a SHORT verb-first phrase, covering EVERY stage IN ORDER including any
reverse/return/loop. Where a step has co-occurring layers, COMBINE them with "+" so the simultaneity is
visible (these are the steps an agent follows to recreate the whole sequence — distinct from the
millisecond "timeline"). 4-8 steps. Example: ["Checkbox ticks in (circle scales, check path traces)",
"Selected tokens glide into a stack + background blurs and dims", "Title, trash icon and button fade in +
tray slides down", "Tokens land in the trash with a spring", "Tokens drop away + button scales down on
tap", "Trash, button and copy fade out + background de-blurs back", "Final resting state"]. If the
animation is simple (a single entrance), 2-3 beats is fine — never pad.

"blind_spots" = 2-4 things you genuinely CANNOT determine from THIS clip — exact easing curves/spring
constants, precise per-element timings, z-depth or true 3D structure, whether a growth is a scale vs a mask
reveal, whether a half-seen background blur is really there, implementation (CSS vs canvas vs video),
off-screen state. Put any micro-effect you suspected but could NOT confirm here rather than fabricating a
motion entry. Being explicit about what's unknowable builds trust — do NOT pad with generic disclaimers.

BE PRECISE AND CONCRETE so two developers would build nearly the SAME thing: real hex colors, exact counts,
shapes, approximate sizes, arrangement. For "timeline", describe ONE cycle starting at 0ms; a single
timeline entry's "event" MAY name several co-occurring changes (that is encouraged). "agent_prompt" = a
precise, ready-to-paste instruction including count/colors/shape/arrangement/motion/timing AND the layered
choreography (call out the secondary + ambient + micro layers, not just the headline); preserve feel over
exact pixels.`;

const VERIFY_FINALIZE_PROMPT = `You are verifying a DRAFT Motion Blueprint another analyst wrote for THIS
video. Watch the video AGAIN, critically, and compare it frame-by-frame to the draft. Silently find every
error, omission, or imprecise value — wrong colors, counts, sizes, durations, easing, missed elements,
wrong sequence/direction, missed SECONDARY transforms (e.g. an element that also scales while it moves),
and missed micro-interactions. CHECK FOR MISSED SIMULTANEOUS LAYERS: at each moment, did the draft capture
EVERY co-occurring motion, not just the headline? Specifically re-inspect for (a) AMBIENT effects —
background BLUR / DIM / FADE during the action AND its reversal DE-BLUR / SHARPEN / RE-APPEAR after — these
are the most-omitted; (b) MICRO-interactions — a press scale-down on tap, a tick/check path tracing out, a
spring overshoot/settle on landing, a ripple, an accent blink; (c) a SECOND animated control row (e.g. a
view-toggle/segment row with its own sliding highlight beside the main tab indicator). ADD a motion entry
for each real layer the draft missed; CONFIRM each existing entry is actually visible and DELETE any you
cannot see. For any layer you suspect but cannot confirm frame-by-frame, add it ONLY as confidence:"low" +
inferred:true (never upgrade a guess); if you cannot tell it happened at all, leave it out and add it to
blind_spots. Fill/correct each motion's layer (primary/secondary/ambient/micro/enter/exit), micro
(true for any press/tick/ripple/spring-landing), concurrent_with (the SAME anchor on motions that happen
together), motion_class (transform / camera / reveal / parallax / morph; a path-draw/tick is "reveal"),
and stagger_ms. Ensure "summary" and "story" LEAD WITH THE MOTION and its FEEL and call out the
simultaneous layers — NOT the app's purpose or an object inventory; rewrite them if they describe the
product instead of the animation. Keep "beats" (ordered choreography, combining co-occurring layers with
"+", covering the whole sequence including any reverse/return) and "blind_spots", fixing them if wrong.
Output the CORRECTED final Motion Blueprint as JSON, in the SAME shape as the draft. Return ONLY the JSON.`;

const STORYBOARD_PLAN_PROMPT = `Plan a storyboard that TEACHES this animation, like a design teardown.
Work EVENT-DRIVEN, not frame-driven. You are given DETECTED MOTIONS below — the events that make up this
animation. Build the storyboard FROM those events, do NOT pick arbitrary time-slices and describe whatever
happens to be on screen:
- ONE panel per DISTINCT motion EVENT, in the order it happens. Every panel must be anchored to an actual
  CHANGE (something entering, moving, scaling, fading), never a static intermediate state.
- MERGE same-motion events into ONE panel: a continuous / looping / repeated behavior (a constant spin,
  infinite scroll, avatars drifting, a steady pulse) is ONE event — never one panel per cycle or per angle
  ("rotates past 135°", "reaches 270°", "second cycle"). Several elements that fade/enter together = ONE
  panel ("avatars fade in around the scene"), not one panel each.
- BOOKEND it: first panel = the OPENING / starting state; last panel = the FINAL settled state.
- Result is usually 4-7 panels — let the animation decide. NEVER pad to a number, never split one event
  into near-identical panels.
- REPEATED / REVERSED transitions: if the clip performs the SAME transition more than once (or forward
  then back), show it as ONE panel and say "(repeats / reverses)" in a label — do NOT make a near-identical
  panel for the repeat. That is the #1 cause of duplicate-looking storyboards.
For EACH panel return:
- clip_time_s: the timestamp in SECONDS (from the start of THIS recording) where that EVENT is most
  legible — mid-transition, not before it starts or after it finishes. A real, distinct position.
- annotations: SEPARATE callouts — ONE PER ELEMENT that moves at this moment. This is REQUIRED, not
  optional: the DETECTED MOTIONS below mark which entries fire together (they share a "concurrent_with"
  anchor, or fall in the same time window). When 2-3 layers fire at once you MUST emit 2-3 SEPARATE
  callouts, each circling its OWN element — e.g. one on the tab indicator, one on the view-toggle, one on
  the sliding content; or "selected cards stack" on the cards AND "others blur out" on the background.
  Combining several simultaneous motions into a SINGLE caption is WRONG — split them. 2-4 callouts on a
  busy panel; 1 only when genuinely one thing moves. Each callout has:
    - label: SHORT (max 8 words), VERB-FIRST motion phrase "<unit> <verb(s)> <direction/qualifier>",
      COMBINING every change (scale + move + fade) into ONE phrase. The verb MUST match the glyph. It
      describes HOW the unit MOVES — never the static contents. Treat an icon + its text (or a button +
      label, or the nav indicator on its row) as ONE UNIT. GOOD: "Logo spins, scales and fades in",
      "Bracket slides left to the Final", "Keyboard scales up", "Avatars fade in around the scene",
      "Clocks scroll infinitely right to left". BAD (state wording — REWRITE if your label has no motion
      verb): "Group stage list displays teams", "Navigation settles on Final round", "Map with labels",
      "Profile card in center", "anchored", "labels visible". If your label has no verb, it is WRONG.
      ONLY describe motion you can SEE — never invent a spring/path-draw.
    - bbox: [ymin,xmin,ymax,xmax] normalized 0-1000, TIGHT around the SMALLEST element that actually
      CHANGES — the specific logo / single row / one button / one card / the nav indicator that moves, NOT
      its container, NOT the content area, NOT the whole screen. A tiny logo → a tiny box; one button-row →
      a thin wide box of just that row. For a list/bracket that scrolls, box the MOVING INDICATOR (the
      highlighted/active item), not the whole list. If only part of a screen animates, box ONLY that part.
    - arrow: the direction it moves (up|down|left|right|none)
    - glyph: the EXPRESSIVE symbol for HOW it moves — pick exactly one, matching your label's verb:
        "arrow"  = translates/moves a short distance (set arrow direction)
        "scroll" = slides/scrolls a LONG or sustained distance, or an infinite marquee (set direction)
        "drop"   = ENTERS by tumbling/falling/dropping in, a momentum entrance (set direction)
        "grow"   = scales UP / overshoots in size / expands   ·  "shrink" = scales DOWN / contracts
        "appear" = fades or blurs IN (becomes visible, no travel)  ·  "vanish" = fades OUT
        "loop"   = spins/rotates/repeats CONTINUOUSLY (one looping behaviour, never per-cycle)
        "final"  = THIS is the last panel: the final settled / resting / idle state
        "none"   = only pointed at, no motion
      Map from the DETECTED MOTIONS: change rotate→loop; scale out/overshoot→grow, in→shrink; fade in→
      appear, out→vanish; slide long→scroll, entrance-with-momentum→drop, else→arrow; motion_class
      reveal→appear (a mask, NOT a true scale). Use "final" ONLY on the last panel. Whenever glyph is
      arrow/scroll/drop, the arrow field MUST be a real direction (not "none").
Every label MUST be different. Return ONLY JSON:
{ "frames": [ { "clip_time_s": 0.0, "annotations": [ { "label": "", "bbox": [0,0,0,0], "arrow": "none", "glyph": "appear" } ] } ] }`;

// ---------- response schemas (Google: a real schema beats describing JSON in the prose) ----------
const BLUEPRINT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    trigger: { type: Type.STRING, enum: ["load", "scroll-into-view", "hover", "tap", "other"] },
    anchor: { type: Type.STRING },
    elements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          count: { type: Type.INTEGER },
          shape: { type: Type.STRING },
          color: { type: Type.STRING },
          approx_size: { type: Type.STRING },
        },
        propertyOrdering: ["name", "count", "shape", "color", "approx_size"],
      },
    },
    spatial: { type: Type.STRING },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { t: { type: Type.STRING }, event: { type: Type.STRING } },
        propertyOrdering: ["t", "event"],
      },
    },
    motion: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          element: { type: Type.STRING },
          // which LAYER this motion plays at its moment: primary = the lead change the eye follows;
          // secondary = chrome moving BECAUSE of the primary; ambient = the background/world reacting
          // (blur/dim/de-blur — most-skipped); micro = input-bound feedback (press, tick, ripple, spring
          // landing); enter = added to screen; exit = removed from screen.
          layer: { type: Type.STRING, enum: ["primary", "secondary", "ambient", "micro", "enter", "exit"] },
          change: { type: Type.STRING, enum: ["fade", "slide", "scale", "blur", "rotate", "color", "text", "count"] },
          motion_class: { type: Type.STRING, enum: ["transform", "camera", "reveal", "parallax", "morph", "other"] },
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          duration_ms: { type: Type.INTEGER },
          easing: { type: Type.STRING },
          stagger_ms: { type: Type.INTEGER },
          direction: { type: Type.STRING, enum: ["up", "down", "left", "right", "in", "out", "none"] },
          // short anchor phrase (or beat index) this motion co-occurs with — motions sharing a value
          // happened AT THE SAME TIME, so the UI groups them as one moment.
          concurrent_with: { type: Type.STRING },
          confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
          // true if this is a triggered micro-interaction (press/tick/ripple/spring-landing/overshoot).
          // Independent of `inferred`: a CONFIRMED press is micro:true, inferred:false.
          micro: { type: Type.BOOLEAN },
          inferred: { type: Type.BOOLEAN },
          // the UI PATTERN / intent this motion serves — what a dev would BUILD, not just the mechanic.
          // e.g. "rotating subtitle carousel", "live metric counter", "infinite log ticker",
          // "staggered grid entrance", "hover lift". Names the COMPONENT, not the property change.
          purpose: { type: Type.STRING },
        },
        propertyOrdering: ["element", "layer", "change", "motion_class", "from", "to", "duration_ms", "easing", "stagger_ms", "direction", "concurrent_with", "confidence", "micro", "inferred", "purpose"],
      },
    },
    feel: { type: Type.ARRAY, items: { type: Type.STRING } },
    story: { type: Type.STRING },
    beats: { type: Type.ARRAY, items: { type: Type.STRING } },
    blind_spots: { type: Type.ARRAY, items: { type: Type.STRING } },
    agent_prompt: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
  },
  // agent_prompt LAST so it's generated after every fact it should summarize
  propertyOrdering: ["summary", "story", "beats", "trigger", "anchor", "elements", "spatial", "timeline", "motion", "feel", "blind_spots", "confidence", "agent_prompt"],
  required: ["summary", "elements", "timeline", "motion", "confidence", "agent_prompt"],
};

const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    frames: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clip_time_s: { type: Type.NUMBER },
          annotations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                bbox: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                arrow: { type: Type.STRING, enum: ["up", "down", "left", "right", "none"] },
                glyph: { type: Type.STRING, enum: ["arrow", "scroll", "drop", "grow", "shrink", "appear", "vanish", "loop", "final", "none"] },
              },
              propertyOrdering: ["label", "bbox", "arrow", "glyph"],
            },
          },
        },
        propertyOrdering: ["clip_time_s", "annotations"],
      },
    },
  },
  required: ["frames"],
};

const LOCALIZE_SCHEMA = {
  type: Type.OBJECT,
  properties: { box_2d: { type: Type.ARRAY, items: { type: Type.INTEGER } } },
  required: ["box_2d"],
};

const MECHANIC_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mechanic: { type: Type.STRING, enum: ["scale", "slide", "camera", "reveal", "none"] },
    direction: { type: Type.STRING, enum: ["up", "down", "left", "right", "in", "out", "none"] },
    from: { type: Type.STRING },
    to: { type: Type.STRING },
    confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
    reason: { type: Type.STRING },
  },
  required: ["mechanic", "confidence"],
  propertyOrdering: ["mechanic", "direction", "from", "to", "confidence", "reason"],
};

// ---------- frame + annotation helpers ----------
function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function arrowSvg(x1: number, y1: number, x2: number, y2: number, color: string): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const ah = 9;
  const a1x = x2 - ah * Math.cos(angle - Math.PI / 6);
  const a1y = y2 - ah * Math.sin(angle - Math.PI / 6);
  const a2x = x2 - ah * Math.cos(angle + Math.PI / 6);
  const a2y = y2 - ah * Math.sin(angle + Math.PI / 6);
  return (
    `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` +
    `<polyline points="${a1x.toFixed(1)},${a1y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${a2x.toFixed(1)},${a2y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

// Sample average luminance so the ink CONTRASTS with the frame (60fps adapts: black on light, light on dark).
async function inkFor(framePath: string): Promise<{ ink: string; halo: string }> {
  try {
    const st = await sharp(framePath).stats();
    const c = st.channels;
    const lum = c.length >= 3 ? 0.299 * c[0].mean + 0.587 * c[1].mean + 0.114 * c[2].mean : c[0]?.mean ?? 128;
    return lum > 140
      ? { ink: "#141414", halo: "rgba(255,255,255,0.85)" } // light frame → dark ink
      : { ink: INK, halo: "rgba(0,0,0,0.7)" }; // dark frame → bright yellow ink
  } catch {
    return { ink: INK, halo: "rgba(0,0,0,0.7)" };
  }
}

// 60fps-style: contrast-aware ink — ellipse around the element, arrow for motion, handwritten note.
async function annotateFrame(
  framePath: string,
  ann: { bbox?: number[]; arrow?: string; title?: string },
): Promise<string | null> {
  try {
    const meta = await sharp(framePath).metadata();
    const W = meta.width || 360;
    const H = meta.height || 200;
    const { ink, halo } = await inkFor(framePath);
    let ov = "";
    let noteX = 12;
    let noteY = 26;

    const bbox = Array.isArray(ann.bbox) && ann.bbox.length === 4 ? ann.bbox.map(Number) : null;
    if (bbox && bbox.every((n) => isFinite(n)) && bbox.some((n) => n > 0)) {
      const [ymin, xmin, ymax, xmax] = bbox;
      const x = (Math.min(xmin, xmax) / 1000) * W;
      const y = (Math.min(ymin, ymax) / 1000) * H;
      const w = (Math.abs(xmax - xmin) / 1000) * W;
      const h = (Math.abs(ymax - ymin) / 1000) * H;
      if (w > 3 && h > 3) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rx = Math.max(10, (w / 2) * 1.18);
        const ry = Math.max(10, (h / 2) * 1.18);
        ov += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${ink}" stroke-width="3"/>`;
        const L = 30;
        const dir = (ann.arrow || "none").toLowerCase();
        if (dir === "up") ov += arrowSvg(cx, cy - ry - 4, cx, cy - ry - 4 - L, ink);
        else if (dir === "down") ov += arrowSvg(cx, cy + ry + 4, cx, cy + ry + 4 + L, ink);
        else if (dir === "left") ov += arrowSvg(cx - rx - 4, cy, cx - rx - 4 - L, cy, ink);
        else if (dir === "right") ov += arrowSvg(cx + rx + 4, cy, cx + rx + 4 + L, cy, ink);
        noteX = Math.max(8, Math.min(x, W - 150));
        noteY = y - ry - 10 > 18 ? y - ry - 12 : Math.min(H - 8, cy + ry + 22);
      }
    }

    const title = (ann.title || "").slice(0, 40);
    if (title) {
      // halo (contrasting outline) under the ink fill = legible on any background
      ov += `<text x="${noteX.toFixed(0)}" y="${noteY.toFixed(0)}" fill="${ink}" stroke="${halo}" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke" font-size="15" font-weight="bold" font-family="Marker Felt, Comic Sans MS, sans-serif">${escXml(title)}</text>`;
    }

    if (!ov) {
      const b = await sharp(framePath).jpeg().toBuffer();
      return `data:image/jpeg;base64,${b.toString("base64")}`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${ov}</svg>`;
    const out = await sharp(framePath).composite([{ input: Buffer.from(svg) }]).jpeg().toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

async function getDuration(videoPath: string): Promise<number> {
  try {
    const { stdout } = await pexecFile("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", videoPath,
    ]);
    const d = parseFloat(stdout.trim());
    if (d && isFinite(d) && d > 0) return d;
  } catch {}
  return 3;
}

// Deterministic motion-energy timeline — measured from the PIXELS, no model. ffmpeg diffs consecutive
// frames (tblend difference) and reports the average luma of each diff = how much moved at that instant.
// We turn that 1-D curve into labelled spans: BURST = a discrete animation event, STEADY = sustained
// low-but-constant motion = a continuous/looping animation, SETTLE = held/still. This gives Gemini a
// TEMPORAL GROUND TRUTH to anchor its timeline + storyboard events on, instead of inferring event
// boundaries purely from frames — which is exactly where "rotates past 135°" / per-cycle captions come
// from. Best-effort: returns null on any failure so the pipeline is unaffected.
type Span = { kind: "BURST" | "STEADY" | "SETTLE"; t0: number; t1: number };
type EnergyResult = { text: string; spans: Span[]; samples: { t: number; e: number }[] };
async function motionEnergy(videoPath: string): Promise<EnergyResult | null> {
  try {
    const { stdout, stderr } = await pexecFile(
      "ffmpeg",
      [
        "-i", videoPath,
        "-vf", "fps=20,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-",
        "-an", "-f", "null", "-",
      ],
      { maxBuffer: 1024 * 1024 * 32 },
    );
    const text = `${stdout}\n${stderr}`;
    const samples: { t: number; e: number }[] = [];
    let curT: number | null = null;
    for (const line of text.split("\n")) {
      const tm = line.match(/pts_time:([0-9.]+)/);
      if (tm) { curT = parseFloat(tm[1]); continue; }
      const em = line.match(/YAVG=([0-9.]+)/);
      if (em && curT != null) { samples.push({ t: curT, e: parseFloat(em[1]) }); curT = null; }
    }
    if (samples.length < 5) return null;
    const t = samples.map((s) => s.t);
    const e = samples.map((s) => s.e);
    const dt = (t[t.length - 1] - t[0]) / (t.length - 1) || 0.05;

    // Scale-free thresholds from THIS clip's own distribution (no hardcoded luma values, so they port
    // across clips of any contrast). The energy is heavily right-skewed (a few big transitions dwarf
    // subtle drift), so we use three bands: floor = true stillness, a "moving" threshold just above it,
    // and a "burst" threshold for discrete events.
    const sorted = [...e].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))))];
    const peak = q(1) || 1;
    const floor = Math.max(q(0.06), peak * 0.01);
    const mThr = Math.max(floor * 1.5, peak * 0.015); // "something is moving"
    const bThr = Math.max(peak * 0.16, q(0.82), mThr * 3); // "a big discrete event"

    // per-sample level (0 still / 1 sustained motion / 2 burst), median-5 smoothed to kill noise
    let lvl: number[] = e.map((v) => (v >= bThr ? 2 : v > mThr ? 1 : 0));
    lvl = lvl.map((v, i) => {
      const w = [lvl[i - 2] ?? v, lvl[i - 1] ?? v, v, lvl[i + 1] ?? v, lvl[i + 2] ?? v].sort((a, b) => a - b);
      return w[2];
    });

    // contiguous runs → merge tiny ones into the previous span
    type Run = { l: number; t0: number; t1: number };
    const runs: Run[] = [];
    let i = 0;
    while (i < lvl.length) {
      let j = i;
      while (j < lvl.length && lvl[j] === lvl[i]) j++;
      runs.push({ l: lvl[i], t0: t[i], t1: (t[j - 1] ?? t[i]) + dt });
      i = j;
    }
    const merged: Run[] = [];
    for (const r of runs) {
      if (merged.length && r.t1 - r.t0 < 0.25) merged[merged.length - 1].t1 = r.t1;
      else merged.push({ ...r });
    }

    // label; a short sub-burst run is an event tail (call it BURST), a sustained one is a loop (STEADY)
    let out = merged.map((r) => {
      const d = r.t1 - r.t0;
      const kind = r.l === 2 ? "BURST" : r.l === 1 ? (d >= 0.7 ? "STEADY" : "BURST") : "SETTLE";
      return { kind, t0: r.t0, t1: r.t1 };
    });
    // a brief SETTLE dip flanked by motion is just a trough in a loop, not a real hold → fold into STEADY
    for (let k = 1; k < out.length - 1; k++) {
      if (out[k].kind === "SETTLE" && out[k].t1 - out[k].t0 < 0.9 && out[k - 1].kind !== "SETTLE" && out[k + 1].kind !== "SETTLE")
        out[k].kind = "STEADY";
    }
    out = out.filter((r) => r.t1 - r.t0 >= 0.15);
    const fin: typeof out = [];
    for (const r of out) {
      if (fin.length && fin[fin.length - 1].kind === r.kind) fin[fin.length - 1].t1 = r.t1;
      else fin.push({ ...r });
    }
    if (!fin.length) return null;
    const summaryText = fin.slice(0, 12).map((r) => `- ${r.t0.toFixed(2)}–${r.t1.toFixed(2)}s  ${r.kind}`).join("\n");
    return { text: summaryText, spans: fin as Span[], samples };
  } catch {
    return null;
  }
}

// Deterministic repeat/reverse detector — pure math over the motion-energy curve, no model, no new deps.
// Demos often perform the same interaction twice or forward-then-back; this finds that so the engine
// describes it ONCE and the storyboard skips the duplicate panel (deterministically, not via the prompt).
type RepeatResult = {
  hint: string | null;
  period_s?: number;
  repeat_count?: number;
  reversed?: boolean;
  canonical_window?: [number, number];
  echo_windows?: [number, number][];
};
function normSlice(e: number[], a: number, b: number): number[] {
  const s = e.slice(a, b);
  const m = s.reduce((x, y) => x + y, 0) / (s.length || 1);
  let ss = 0;
  const c = s.map((v) => { const d = v - m; ss += d * d; return d; });
  const n = Math.sqrt(ss) || 1;
  return c.map((v) => v / n);
}
function maxNCC(a: number[], b: number[], reversed = false): number {
  const A = reversed ? [...a].reverse() : a;
  const len = Math.min(A.length, b.length);
  if (len < 3) return 0;
  let best = 0;
  const maxLag = Math.floor(len * 0.4);
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < len; i++) {
      const ai = A[i], bi = b[i + lag];
      if (bi === undefined) continue;
      dot += ai * bi; na += ai * ai; nb += bi * bi;
    }
    best = Math.max(best, dot / (Math.sqrt(na * nb) || 1));
  }
  return best;
}
function detectRepeats(samples: { t: number; e: number }[], spans: Span[]): RepeatResult {
  const N = samples.length;
  if (N < 12) return { hint: null };
  const t = samples.map((s) => s.t);
  const e = samples.map((s) => s.e);
  const fps = (N - 1) / (t[N - 1] - t[0] || 1);
  const dur = t[N - 1] - t[0];

  // STAGE 1: normalized autocorrelation → evenly-spaced repeats + period
  const mean = e.reduce((a, b) => a + b, 0) / N;
  const x = e.map((v) => v - mean);
  const denom0 = x.reduce((a, b) => a + b * b, 0) || 1;
  const minLag = Math.max(2, Math.round(0.3 * fps));
  const maxLag = Math.floor(N / 2);
  const r: number[] = new Array(maxLag + 1).fill(0);
  for (let k = minLag; k <= maxLag; k++) {
    let acc = 0;
    for (let i = 0; i + k < N; i++) acc += x[i] * x[i + k];
    r[k] = acc / denom0;
  }
  let kStar = -1, rStar = 0, pastTrough = false;
  for (let k = minLag; k < maxLag; k++) {
    if (!pastTrough && r[k] < 0) pastTrough = true;
    if (!pastTrough) continue;
    if (r[k] > r[k - 1] && r[k] >= r[k + 1] && r[k] > rStar) { rStar = r[k]; kStar = k; }
  }
  let period_s: number | undefined, repeat_count: number | undefined;
  if (kStar > 0 && rStar >= 0.55) {
    period_s = kStar / fps;
    repeat_count = Math.round(dur / period_s);
  }

  // STAGE 2: segment self-similarity (matched filter, forward + reversed). Energy-only matching can
  // over-merge SEMANTICALLY-DISTINCT transitions that happen to share an energy shape, so we keep two
  // tiers: a SOFT match (≥0.78, similar length) only INFORMS the advisory prompt hint; a STRICT match
  // (≥0.9, near-equal length) is the only thing allowed to HARD-SKIP a storyboard panel (no false drops).
  const ev = spans.filter((s) => s.kind === "BURST");
  const idxAt = (tt: number) => Math.max(0, Math.min(N - 1, Math.round((tt - t[0]) * fps)));
  const wins = ev.map((s) => [idxAt(s.t0), idxAt(s.t1)] as [number, number]).filter(([a, b]) => b - a >= 3);
  let reversed = false, anyRepeat = false;
  let canonical_window: [number, number] | undefined;
  const echo_windows: [number, number][] = [];
  for (let i = 0; i < wins.length; i++) {
    for (let j = i + 1; j < wins.length; j++) {
      const durI = wins[i][1] - wins[i][0], durJ = wins[j][1] - wins[j][0];
      const dr = Math.max(durI, durJ) / Math.max(1, Math.min(durI, durJ));
      if (dr > 1.7) continue; // very different lengths = different interactions, not a repeat
      const A = normSlice(e, wins[i][0], wins[i][1]);
      const B = normSlice(e, wins[j][0], wins[j][1]);
      const fwd = maxNCC(A, B, false);
      const rev = maxNCC(A, B, true);
      const best = Math.max(fwd, rev);
      if (best < 0.78) continue;
      anyRepeat = true;
      canonical_window ??= [t[wins[i][0]], t[wins[i][1]]];
      if (rev > fwd + 0.05) {
        const between = spans.some((s) => s.kind === "SETTLE" && s.t0 >= t[wins[i][1]] - 0.05 && s.t1 <= t[wins[j][0]] + 0.05);
        if (between || rev > fwd + 0.15) reversed = true;
      }
      if (best >= 0.9 && dr <= 1.2) echo_windows.push([t[wins[j][0]], t[wins[j][1]]]); // near-identical only
    }
  }
  const isLoop = !!period_s && spans.some((s) => s.kind === "STEADY" && s.t1 - s.t0 >= 0.7);

  // STAGE 3: BURST-cadence fallback (autocorr null but ≥3 evenly-spaced bursts)
  if (!period_s && repeat_count == null && ev.length >= 3) {
    const onsets = ev.map((s) => s.t0);
    const gaps = onsets.slice(1).map((o, i) => o - onsets[i]);
    const gMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const even = gaps.every((g) => Math.abs(g - gMean) / (gMean || 1) <= 0.2);
    if (even && gMean > 0.3) { period_s = gMean; repeat_count = ev.length; }
  }

  let hint: string | null = null;
  if (anyRepeat) {
    hint = `a transition appears MORE THAN ONCE${reversed ? " and one leg plays REVERSED (forward-then-back)" : ""}. Describe each shared interaction EXACTLY ONCE; the return leg is the SAME motion reversed (swap from/to, same easing/duration), not a new motion. Do NOT emit near-duplicate motions or storyboard panels for the echoes — but DO keep genuinely distinct transitions separate.`;
  } else if (isLoop) {
    hint = `one seamless LOOP, period ~${period_s!.toFixed(2)}s (continuous — never describe per-cycle)`;
  } else if (period_s && (repeat_count ?? 0) >= 2) {
    hint = `same ~${period_s.toFixed(2)}s transition repeats ${repeat_count}× (one interaction, not ${repeat_count})`;
  }
  return { hint, period_s, repeat_count, reversed, canonical_window, echo_windows };
}

async function grabFile(videoPath: string, t: number, out: string): Promise<string | null> {
  try {
    await pexecFile("ffmpeg", [
      "-ss", Math.max(0, t).toFixed(2), "-i", videoPath, "-frames:v", "1",
      "-vf", "scale='min(1080,iw)':-2", "-q:v", "2", "-y", out,
    ]);
    return out;
  } catch {
    return null;
  }
}

// ---------- mechanic micro-pass helpers (Rank 3) ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
// align a motion (has duration_ms but no start time) to a BURST/STEADY span window
function windowFor(m: any, spans: Span[], duration: number): { t0: number; t1: number } | null {
  const dur = (Number(m?.duration_ms) || 0) / 1000;
  const events = spans.filter((s) => s.kind !== "SETTLE");
  if (events.length) {
    const hit = events.find((s) => dur === 0 || ((s.t1 - s.t0) >= dur * 0.5 && (s.t1 - s.t0) <= dur * 2.5));
    if (hit) return { t0: hit.t0, t1: hit.t1 };
    return { t0: events[0].t0, t1: events[0].t1 };
  }
  if (dur > 0 && dur < duration) { const t0 = Math.max(0, (duration - dur) / 2); return { t0, t1: t0 + dur }; }
  return null;
}
// only escalate genuinely ambiguous scale/slide transforms — bounds cost to ≤MICRO_PASS_MAX calls
function pickMechanicCandidates(motion: any[], spans: Span[], duration: number): number[] {
  const cand: { i: number; rank: number }[] = [];
  for (let i = 0; i < motion.length; i++) {
    const m = motion[i];
    if (!["transform", "camera", "reveal"].includes(String(m?.motion_class))) continue;
    if (!["scale", "slide"].includes(String(m?.change))) continue;
    const ambiguous = m?.confidence !== "high" || m?.inferred === true || AMBIG_RE.test(`${m?.element} ${m?.from} ${m?.to}`);
    if (!ambiguous) continue;
    if (windowFor(m, spans, duration) == null) continue;
    const rank = (m?.layer === "primary" ? 0 : 100)
      + (m?.confidence === "low" ? 0 : m?.confidence === "medium" ? 10 : 20)
      + Math.max(0, 50 - Math.round((Number(m?.duration_ms) || 0) / 100));
    cand.push({ i, rank });
  }
  return cand.sort((a, b) => a.rank - b.rank).slice(0, MICRO_PASS_MAX).map((c) => c.i);
}
async function grabMechanicStills(videoPath: string, w: { t0: number; t1: number }, base: string, idx: number) {
  const span = Math.max(0.001, w.t1 - w.t0);
  const ts = [w.t0 + span * 0.1, w.t0 + span * 0.5, w.t0 + span * 0.9]; // START / MID / END insets
  return Promise.all(ts.map((tt, k) => grabFile(videoPath, tt, join(tmpdir(), `ml-mech-${base}-${idx}-${k}.jpg`))));
}
// merge the verdict back into the motion entry; returns "drop" to delete an over-reported motion
function applyMechanic(m: any, v: any): "patch" | "drop" | "skip" {
  if (!v?.mechanic || v.confidence === "low") return "skip";
  if (v.mechanic === "none") return v.confidence === "high" ? "drop" : "skip";
  if (v.mechanic === "scale") { m.change = "scale"; m.motion_class = "transform"; }
  else if (v.mechanic === "slide") { m.change = "slide"; m.motion_class = "transform"; }
  else if (v.mechanic === "camera") {
    m.change = "slide"; m.motion_class = "camera";
    if (!/viewport|pan/i.test(`${m.from} ${m.to}`)) m.to = `viewport pans ${v.direction || ""}`.trim();
  } else if (v.mechanic === "reveal") { m.motion_class = "reveal"; }
  if (v.direction && v.direction !== "none") m.direction = v.direction;
  if (v.from && v.mechanic !== "camera") m.from = v.from;
  if (v.to && v.mechanic !== "camera") m.to = v.to;
  const ord: Record<string, number> = { low: 0, medium: 1, high: 2 };
  if ((ord[v.confidence] ?? 0) >= (ord[m.confidence] ?? 0)) m.confidence = v.confidence;
  m.inferred = false; // graduates from guess → multi-frame observed
  return "patch";
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fileToUrl(file: string): Promise<string | null> {
  try {
    const b = await readFile(file);
    await unlink(file).catch(() => {});
    return `data:image/jpeg;base64,${b.toString("base64")}`;
  } catch {
    return null;
  }
}

type Ann = { bbox?: number[]; label?: string; arrow?: string; glyph?: string };
type Frame = { img: string; label: string; annotations?: Ann[] };

// Keyword fallback so a glyph is always present even if the model omits it (mirrors the renderer's copy).
function glyphFromLabel(label: string, arrow?: string): string {
  const s = (label || "").toLowerCase();
  if (/\bfinal\b/.test(s)) return "final";
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
type PlanFrame = { clip_time_s?: number | string; annotations?: Ann[] };

// Tiny perceptual fingerprint (16x16 greyscale) to drop near-identical frames.
async function fingerprint(framePath: string): Promise<Buffer | null> {
  try {
    return await sharp(framePath).greyscale().resize(16, 16, { fit: "fill" }).raw().toBuffer();
  } catch {
    return null;
  }
}
function tooSimilar(a: Buffer | null, b: Buffer | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
  return diff / a.length < 6; // mean abs diff (0-255); <6 ≈ visually the same
}

async function buildStoryboard(
  videoPath: string,
  opts: {
    plan?: PlanFrame[];
    timeline?: { event?: string }[];
    localize?: (path: string, label: string) => Promise<number[] | null>;
    rep?: RepeatResult;
  },
): Promise<Frame[]> {
  const dir = tmpdir();
  const base = (videoPath.split("/").pop() || "v").replace(/[^a-z0-9]/gi, "");
  const kept: Buffer[] = [];
  const out: Frame[] = [];
  // add a frame file if it's not a near-duplicate of one already kept; caps at 5
  const tryAdd = async (
    file: string | null,
    label: string,
    dedup = true,
    extra: Partial<Frame> = {},
  ): Promise<void> => {
    if (!file || out.length >= 10) {
      if (file) await unlink(file).catch(() => {});
      return;
    }
    if (dedup) {
      const fp = await fingerprint(file);
      if (fp && kept.some((k) => tooSimilar(k, fp))) {
        await unlink(file).catch(() => {});
        return;
      }
      if (fp) kept.push(fp);
    }
    const img = await fileToUrl(file);
    if (!img) return;
    out.push({ img, label, ...extra });
  };

  // ANNOTATED: Gemini already picked distinct moments → skip pixel dedup (it over-collapses subtle
  // staggers), but guard against the model placing two panels on the SAME event: drop a planned frame
  // whose caption repeats a kept one, or whose clip_time is within 0.25s of one already taken.
  if (opts.plan && opts.plan.length) {
    const keptTimes: number[] = [];
    const keptLabels = new Set<string>();
    for (let i = 0; i < opts.plan.length && out.length < 10; i++) {
      const p = opts.plan[i];
      const t = typeof p?.clip_time_s === "number" ? p.clip_time_s : parseFloat(String(p?.clip_time_s));
      if (!isFinite(t)) continue;
      // a repeated/reversed interaction's echo window is the SAME motion — keep only the canonical panel
      if (opts.rep?.echo_windows?.some(([a, b]) => t >= a && t <= b)) continue;
      const firstLabel = (Array.isArray(p?.annotations) ? String(p.annotations[0]?.label || "") : "").trim().toLowerCase();
      if (firstLabel && keptLabels.has(firstLabel)) continue;
      if (keptTimes.some((kt) => Math.abs(kt - t) < 0.25)) continue;
      keptTimes.push(t);
      if (firstLabel) keptLabels.add(firstLabel);
      const file = await grabFile(videoPath, t, join(dir, `ml-${base}-km${i}.jpg`));
      if (!file) continue;
      // Build 1-3 callouts per moment; tighten each box by re-localizing on the high-res STILL
      // (research: a still has 4-8x the detail tokens of a video frame → much tighter boxes).
      const anns = Array.isArray(p?.annotations) ? p.annotations.slice(0, 4) : [];
      const built: Ann[] = [];
      for (const a of anns) {
        let bbox = Array.isArray(a?.bbox) ? a.bbox.map(Number) : undefined;
        if (opts.localize && a?.label) {
          const tight = await opts.localize(file, String(a.label));
          if (tight) bbox = tight;
        }
        const lbl = String(a?.label || "");
        const arr = typeof a?.arrow === "string" ? a.arrow : undefined;
        built.push({
          bbox,
          label: lbl,
          arrow: arr,
          glyph: typeof a?.glyph === "string" && a.glyph ? a.glyph : glyphFromLabel(lbl, arr),
        });
      }
      await tryAdd(file, built[0]?.label || "", false, { annotations: built });
    }
    if (out.length) return out;
  }

  // PLAIN: initial state + scene-change frames + even fallback, deduped, captioned from timeline
  const duration = await getDuration(videoPath);
  const tl = Array.isArray(opts.timeline) ? opts.timeline : [];
  const candidates: string[] = [];
  const start = await grabFile(videoPath, duration * 0.04, join(dir, `ml-${base}-s.jpg`));
  if (start) candidates.push(start);
  const scenePrefix = `mlsc-${base}-`;
  try {
    await pexecFile("ffmpeg", [
      "-i", videoPath, "-vf", "select='gt(scene,0.05)',scale='min(1080,iw)':-2",
      "-fps_mode", "vfr", "-frames:v", "9", "-q:v", "2", "-y",
      join(dir, `${scenePrefix}%03d.jpg`),
    ]);
    const files = (await readdir(dir)).filter((f) => f.startsWith(scenePrefix)).sort();
    for (const f of files) candidates.push(join(dir, f));
  } catch {}
  if (candidates.length < 3) {
    for (const c of candidates) await unlink(c).catch(() => {});
    candidates.length = 0;
    for (let i = 0; i < 6; i++) {
      const f = await grabFile(videoPath, (duration * (i + 0.5)) / 6, join(dir, `ml-${base}-ev${i}.jpg`));
      if (f) candidates.push(f);
    }
  }
  for (const file of candidates) await tryAdd(file, "");
  return out.map((f, i) => ({ img: f.img, label: String(tl[i]?.event || `Moment ${i + 1}`) }));
}

// ---------- handler ----------
export async function POST(req: Request) {
  let tmpPath: string | null = null;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing GEMINI_API_KEY — add it to .env.local and restart." }, { status: 500 });
    }
    const ai = new GoogleGenAI({ apiKey });

    const form = await req.formData();
    const file = form.get("video");
    if (!(file instanceof File)) return Response.json({ error: "No video uploaded." }, { status: 400 });
    const context = form.get("context");
    const focus = typeof context === "string" ? context.trim() : "";
    const userContext = focus
      ? `\n\nFOCUS MODE — the user asked to focus on: "${focus}".
Interpret their intent: the focus may be a specific ELEMENT (a button, the cursor, a card) OR a
specific INTERACTION / MOMENT (e.g. "when clicked", "on hover", "the click feedback", "the entrance").
Make THAT the PRIMARY subject and explain it in DETAIL — motion mechanics, timing, easing, counts,
colors, sizes. Do NOT assume effects like bursts/particles/ripples/glows are decorative: if the focus
IS that effect (e.g. "the cursor animation when clicked" = the click-burst feedback), then that effect
is the MAIN subject to describe fully, with every click instance. Treat only genuinely-unrelated parts
as secondary. The summary, timeline, motion, storyboard, and agent_prompt must all center on the focus.`
      : "";
    const modeRaw = form.get("mode");
    const mode = modeRaw === "precision" || modeRaw === "annotated" ? modeRaw : "standard";

    // Optional final-frame SCREENSHOT companion — a sharp, full-res still of the end state. The video gives
    // MOTION; the screenshot gives EXACT pixels (colors/sizes/fonts/layout). Sent as an inline image part.
    const shot = form.get("screenshot");
    let screenshotPart: { inlineData: { mimeType: string; data: string } } | null = null;
    if (shot instanceof File) {
      const sbytes = Buffer.from(await shot.arrayBuffer());
      screenshotPart = { inlineData: { mimeType: shot.type || "image/png", data: sbytes.toString("base64") } };
    }
    const screenshotContext = screenshotPart
      ? `\n\nFINAL-FRAME SCREENSHOT PROVIDED — a sharp, full-resolution still of the FINAL settled state is attached alongside the video. The VIDEO is the source of truth for MOTION (what moves, the order, timing, easing). The SCREENSHOT is the source of truth for the EXACT static appearance of the end state: real colors (read the true hex), exact element sizes/proportions (px), fonts, corner radii, spacing, and final layout. When the (compressed, sometimes blurry) video and the screenshot disagree on APPEARANCE, TRUST THE SCREENSHOT. Bake its exact values into "elements", "spatial", the motion from->to endpoints, and especially "agent_prompt" so a developer can recreate it pixel-for-pixel.`
      : "";

    // clean ASCII name (macOS recordings have U+202F that breaks headers)
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || "mp4").toLowerCase();
    const safeName = `clip-${Date.now()}.${ext}`;
    tmpPath = join(tmpdir(), safeName);
    await writeFile(tmpPath, bytes);

    // Measure the motion-energy timeline locally while Gemini uploads/processes the video (parallel, free).
    const energyP = motionEnergy(tmpPath);

    let uploaded = await ai.files.upload({ file: tmpPath, config: { mimeType: file.type || "video/mp4", displayName: safeName } });
    while (uploaded.state === "PROCESSING") {
      await new Promise((r) => setTimeout(r, 1500));
      uploaded = await ai.files.get({ name: uploaded.name! });
    }
    if (uploaded.state === "FAILED") return Response.json({ error: "Gemini failed to process the video." }, { status: 500 });

    const uri = uploaded.uri!;
    const mime = uploaded.mimeType!;
    // Sample at higher fps so fast/early motion (logo fade, keyboard rise, suggestions) isn't
    // missed — Gemini's default is only 1 fps, which skips quick sequences entirely.
    // Per-mode fps: Standard 6, Annotated 8, Precision 12 (Precision is capped at 10s, so 12fps
    // costs the same as old 6fps×20s but doubles temporal resolution on the moment that matters).
    const fps = mode === "precision" ? 12 : mode === "annotated" ? 8 : 6;
    const videoPart = { fileData: { fileUri: uri, mimeType: mime }, videoMetadata: { fps } };
    const gen = async (prompt: string, schema?: object, opts?: { noVideo?: boolean }) => {
      const config: Record<string, unknown> = { maxOutputTokens: 16384 };
      if (schema) {
        config.responseMimeType = "application/json";
        config.responseSchema = schema;
      }
      // The storyboard PLAN works from the text blueprint + energy hint — it doesn't need to re-process the
      // full 12fps video, which is the most expensive part of each call. noVideo drops it = a full pass saved.
      const parts = opts?.noVideo
        ? [{ text: prompt }]
        : [videoPart, ...(screenshotPart ? [screenshotPart] : []), { text: prompt }];
      const run = (cfg: Record<string, unknown>) =>
        ai.models.generateContent({
          model: MODEL,
          contents: [{ role: "user", parts }],
          config: cfg,
        });
      let res = await run(config);
      // Guard against silent truncation — the default budget can cut a busy clip mid-JSON,
      // which then throws in JSON.parse. One retry with a bigger budget.
      if (res.candidates?.[0]?.finishReason === "MAX_TOKENS") {
        res = await run({ ...config, maxOutputTokens: 32768 });
      }
      return res.text ?? "";
    };

    // Re-localize an element on a high-res STILL frame (tighter, more accurate box than off the video).
    const localizeStill = async (path: string, label: string): Promise<number[] | null> => {
      try {
        const b = await readFile(path);
        const res = await ai.models.generateContent({
          model: FAST_MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: b.toString("base64") } },
                {
                  text: `In this UI screenshot, find the element this caption is about: "${label}". If it is a row/item with an ICON beside text (e.g. an icon then "Spend"), the box MUST enclose BOTH the icon AND the text — put the LEFT edge at the icon's left edge and the RIGHT edge at the text's right edge so the whole [icon + label] row is inside. For a button+label or small card/stack, box the whole unit. Otherwise box the single object. Box the SMALLEST element that matches the caption and visibly MOVES — never the whole content area, list, or screen; if the caption names one item/row/logo/button/indicator, box ONLY that one. HARD RULE: the box must be at most ~55% of screen width AND ~45% of screen height, UNLESS the caption is explicitly about a full-width bar or the entire layout. Keep it TIGHT. Respond as box_2d = [ymin,xmin,ymax,xmax], integers 0-1000.`,
                },
              ],
            },
          ],
          config: { responseMimeType: "application/json", responseSchema: LOCALIZE_SCHEMA, maxOutputTokens: 200 },
        });
        const box = JSON.parse(res.text || "{}")?.box_2d;
        return Array.isArray(box) && box.length === 4 && box.every((n: unknown) => isFinite(Number(n)))
          ? box.map(Number)
          : null;
      } catch {
        return null;
      }
    };

    // Mechanic micro-pass: send START/MID/END stills of an ambiguous motion → focused scale/slide/camera read.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const disambiguateMechanic = async (files: (string | null)[], m: any): Promise<unknown | null> => {
      const present = files.filter(Boolean) as string[];
      if (present.length < 2) { for (const f of present) await unlink(f).catch(() => {}); return null; }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [];
        for (const f of files) {
          if (!f) continue;
          const b = await readFile(f);
          parts.push({ inlineData: { mimeType: "image/jpeg", data: b.toString("base64") } });
        }
        parts.push({
          text: MECHANIC_PROMPT
            .replace("{element}", String(m?.element || "?")).replace("{change}", String(m?.change || "?"))
            .replace("{class}", String(m?.motion_class || "?")).replace("{from}", String(m?.from || "?"))
            .replace("{to}", String(m?.to || "?")),
        });
        const res = await ai.models.generateContent({
          model: MODEL,
          contents: [{ role: "user", parts }],
          config: { responseMimeType: "application/json", responseSchema: MECHANIC_SCHEMA, maxOutputTokens: 400 },
        });
        return JSON.parse(res.text || "{}");
      } catch {
        return null;
      } finally {
        for (const f of files) if (f) await unlink(f).catch(() => {});
      }
    };

    // --- blueprint ---
    const energyRes = await energyP;
    const rep: RepeatResult = energyRes ? detectRepeats(energyRes.samples, energyRes.spans) : { hint: null };
    const energyBlock = energyRes
      ? `\n\nMOTION-ENERGY HINT — measured from the pixels, a guide for WHEN motion happens (not what). BURST = likely a discrete animation event; STEADY = sustained motion = likely a continuous/looping animation (treat as ONE looping behaviour, never per-cycle); SETTLE = little change / held. Use it to place and merge events — but it is only a hint: if it conflicts with what you actually SEE in the video, trust your eyes.\n${energyRes.text}`
        + (rep.hint ? `\n\nREPEAT/REVERSE (measured from the pixels): ${rep.hint}` : "")
      : "";
    let blueprintText: string;
    if (mode === "precision") {
      // 2-pass: Pass 1 extract → Pass 2 re-watch, verify vs video, output corrected final.
      const draft = await gen(PROMPT + userContext + screenshotContext + energyBlock, BLUEPRINT_SCHEMA);
      blueprintText = await gen(`${VERIFY_FINALIZE_PROMPT}${energyBlock}\n\nDraft Blueprint to verify & correct:\n${draft}`, BLUEPRINT_SCHEMA);
    } else {
      blueprintText = await gen(PROMPT + userContext + screenshotContext + energyBlock, BLUEPRINT_SCHEMA);
    }
    const blueprint = JSON.parse(blueprintText || "{}");

    // --- mechanic micro-pass (precision only, ≤3 focused still calls, 0 on clean clips) ---
    if (mode === "precision" && energyRes && Array.isArray(blueprint.motion)) {
      const duration = await getDuration(tmpPath);
      const base = safeName.replace(/[^a-z0-9]/gi, "");
      const idxs = pickMechanicCandidates(blueprint.motion, energyRes.spans, duration);
      const drops: number[] = [];
      await Promise.all(idxs.map(async (i) => {
        const w = windowFor(blueprint.motion[i], energyRes.spans, duration);
        if (!w) return;
        const files = await grabMechanicStills(tmpPath!, w, base, i);
        const v = await disambiguateMechanic(files, blueprint.motion[i]);
        if (applyMechanic(blueprint.motion[i], v) === "drop") drops.push(i);
      }));
      for (const i of drops.sort((a, b) => b - a)) blueprint.motion.splice(i, 1);
    }

    // --- storyboard --- (Precision is a SUPERSET of Annotated: deepest blueprint + the annotated storyboard)
    // Wrapped in a thunk so we can STREAM the blueprint out first (shows immediately) and build the
    // storyboard after. tmp captured so the outer finally won't delete the video before the stream runs.
    const tmp = tmpPath;
    tmpPath = null;
    const buildFrames = async (): Promise<Frame[]> => {
      if (mode === "annotated" || mode === "precision") {
      let plan: PlanFrame[] = [];
      try {
        // Group the blueprint motions that fire together (shared concurrent_with) so the plan can be told
        // exactly which moments need MULTIPLE separate callouts (one per simultaneous layer).
        const cg = new Map<string, string[]>();
        for (const m of (Array.isArray(blueprint.motion) ? blueprint.motion : [])) {
          const key = (m?.concurrent_with && String(m.concurrent_with).trim()) || "";
          if (!key || key === "none") continue;
          const desc = `${m?.element || "?"} (${m?.layer || m?.change || "move"})`;
          (cg.get(key) ?? cg.set(key, []).get(key)!).push(desc);
        }
        const concurrentBlock = [...cg.values()].filter((v) => v.length > 1).length
          ? `\n\nSIMULTANEOUS LAYERS — these motions fire TOGETHER, so the panel for that moment MUST have a SEPARATE callout for EACH:\n${[...cg.values()].filter((v) => v.length > 1).map((v) => `• one moment: ${v.join(" + ")}`).join("\n")}`
          : "";
        const planText = await gen(
          `${STORYBOARD_PLAN_PROMPT}${userContext}${energyBlock}\n\nDETECTED MOTIONS (ground each caption in these — describe the MOTION, not the state):\n${JSON.stringify({ timeline: blueprint.timeline, motion: blueprint.motion })}${concurrentBlock}\n\nThe DETECTED MOTIONS / timeline above are the SOURCE OF TRUTH for WHICH panels exist: build ONE panel per distinct event there, IN ORDER, INCLUDING low-energy-but-real events (e.g. avatars/items fading or popping in) and the FINAL settled / idle state. NEVER place two panels on the SAME event (no repeated moment, no duplicate caption), and never split one busy moment into several panels. For a moment with SIMULTANEOUS LAYERS (above), emit one SEPARATE callout per layer on that single panel. Use the MOTION-ENERGY HINT ONLY to (a) pick each panel's clip_time near when its event is most legible and (b) fold a genuinely continuous loop into ONE panel — do NOT use it to add extra panels inside one burst or to drop a real event just because its energy is low. Cover the whole clip start→finish; the last panel MUST be the final resting state.`,
          PLAN_SCHEMA,
          { noVideo: true },
        );
        const parsed = JSON.parse(planText || "{}");
        plan = Array.isArray(parsed?.frames) ? parsed.frames : [];
      } catch {}
        return buildStoryboard(tmp, { plan, timeline: blueprint.timeline, localize: localizeStill, rep });
      }
      return buildStoryboard(tmp, { timeline: blueprint.timeline });
    };

    // Stream NDJSON: blueprint line first (renders immediately), then the frames line.
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(enc.encode(JSON.stringify({ type: "blueprint", blueprint, mode }) + "\n"));
          const frames = await buildFrames();
          controller.enqueue(enc.encode(JSON.stringify({ type: "frames", frames }) + "\n"));
        } catch {
          controller.enqueue(enc.encode(JSON.stringify({ type: "frames", frames: [] }) + "\n"));
        } finally {
          controller.close();
          if (tmp) await unlink(tmp).catch(() => {});
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  } finally {
    if (tmpPath) await unlink(tmpPath).catch(() => {});
  }
}
