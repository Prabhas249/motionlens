"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowDown, Check } from "lucide-react";
import { siteConfig } from "@marketing/lib/config";
import { HeaderBadge } from "@marketing/components/header-badge";
import PremiumButton from "@marketing/components/premium-button";
import { MotionLensLogo } from "@marketing/components/motionlens-logo";
import { PixelGridShader } from "@marketing/components/ui/pixelgrid-shader";

// The Blueprint on the right describes the clip on the left (the map pull-back).
const BLUEPRINT = {
    summary:
        "The map pulls back to reveal friends popping in across the city.",
    trigger: "load",
    motion: [
        { el: "Map camera", cls: "scale", val: "zoomed-in → pulled back", meta: "~600ms · ease-out" },
        { el: "Friend pins", cls: "scale + fade", val: "0 → 1 · pop", meta: "~300ms · 50ms stagger" },
        { el: "3D marker", cls: "rotate", val: "continuous spin", meta: "loop · linear" },
    ],
    feel: ["spatial", "alive", "playful"],
};

const CARD_SHADOW =
    "shadow-[0_1px_1px_rgba(16,24,40,0.04),0_24px_48px_-24px_rgba(16,24,40,0.22)]";

const reveal = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const row = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

function ClipCard() {
    return (
        <div
            className={`overflow-hidden rounded-2xl border border-border/70 bg-card ring-1 ring-black/[0.03] ${CARD_SHADOW}`}
        >
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/30 px-3.5 py-2.5">
                <span className="size-2.5 rounded-full bg-[#FF5F57]" />
                <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">clip.mov</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#2A48F0]/10 px-2 py-0.5 text-[10px] font-medium text-[#2A48F0]">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#2A48F0]" />
                    recording
                </span>
            </div>
            <div className="relative aspect-square w-full overflow-hidden bg-[#FDFDFD]">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                    className="h-full w-full object-cover"
                    src="/examples/hero-map.mp4"
                    poster="/examples/hero-map.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                />
            </div>
        </div>
    );
}

function BlueprintCard() {
    return (
        <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className={`relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-5 ring-1 ring-black/[0.03] backdrop-blur-md ${CARD_SHADOW}`}
        >
            <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(42,72,240,0.10),transparent_70%)]" />

            <motion.div variants={row} className="relative flex items-center gap-2.5">
                <span className="flex size-6 items-center justify-center rounded-md bg-[#2A48F0] text-white">
                    <MotionLensLogo className="size-3.5" animated={false} />
                </span>
                <span className="text-sm font-semibold tracking-tight">Motion Blueprint</span>
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    precision
                </span>
                <span className="ml-auto flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" /> high confidence
                </span>
            </motion.div>

            <motion.p variants={row} className="relative mt-3 text-[13px] leading-snug text-foreground/90">
                {BLUEPRINT.summary}
            </motion.p>

            <motion.div variants={row} className="relative mt-4 flex items-center gap-2 text-[11px]">
                <span className="font-mono uppercase tracking-wide text-muted-foreground">trigger</span>
                <span className="rounded bg-[#2A48F0]/10 px-1.5 py-0.5 font-medium text-[#2A48F0]">
                    {BLUEPRINT.trigger}
                </span>
            </motion.div>

            <div className="relative mt-3 space-y-2">
                {BLUEPRINT.motion.map((m) => (
                    <motion.div
                        key={m.el}
                        variants={row}
                        className="rounded-lg border border-border/70 bg-background/60 p-2.5"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium">{m.el}</span>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {m.cls}
                            </span>
                            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                                {m.meta}
                            </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{m.val}</p>
                    </motion.div>
                ))}
            </div>

            <motion.div variants={row} className="relative mt-4 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    feel
                </span>
                {BLUEPRINT.feel.map((f) => (
                    <span
                        key={f}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/80"
                    >
                        {f}
                    </span>
                ))}
            </motion.div>
        </motion.div>
    );
}

// CSS-only rotating headline word. All words ship in the server HTML and
// crossfade via keyframes — no hydration dependency and no element swap, so
// the h1 paints once and LCP stays at first paint (the JS-swap version kept
// re-triggering Chrome's LCP entry ~10s in).
// Longest word FIRST + zero crossfade overlap: the h1's painted area is
// maximal at first paint, so no later word can register a larger LCP entry
// (a longer word fading in mid-trace kept re-triggering Chrome's LCP).
const HERO_WORDS = ["interactions", "transitions", "animations", "motion"];

function RotatingWord() {
    return (
        <span className="relative inline-grid justify-items-center align-bottom text-[#2A48F0]">
            <style>{`
                @keyframes heroWordCycle {
                    0%, 20% { opacity: 1; filter: blur(0); transform: translateY(0); }
                    24%, 100% { opacity: 0; filter: blur(6px); transform: translateY(4px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .hero-word { animation: none !important; }
                    .hero-word:not(:first-child) { opacity: 0 !important; }
                }
            `}</style>
            {HERO_WORDS.map((w, i) => (
                <span
                    key={w}
                    aria-hidden={i > 0}
                    className="hero-word col-start-1 row-start-1"
                    style={{
                        opacity: i === 0 ? 1 : 0,
                        animation: `heroWordCycle ${HERO_WORDS.length * 2.5}s linear infinite`,
                        animationDelay: `${i * 2.5}s`,
                    }}
                >
                    {w}
                </span>
            ))}
        </span>
    );
}

export function HeroSection() {
    const { hero } = siteConfig;
    // WebGL shader waits for idle — it's decoration, not content; its init was
    // sharing the main thread with hydration and pushing LCP out.
    const [showShader, setShowShader] = useState(false);
    useEffect(() => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
        const idle = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 350));
        idle(() => setShowShader(true));
    }, []);

    return (
        <section
            id="hero"
            className="relative flex w-full flex-col items-center px-4"
        >
            {/* first fold: text on a full-bleed pixel-grid shader (brand cobalt) */}
            <div className="relative flex min-h-svh w-full flex-col items-center justify-center py-24">
                {/* pixel-grid shader — a subtle, steady field across the whole hero (faded only
                    at top/bottom). ONLY the area under the cursor burns dense/bright. z-0 so the
                    canvas gets the cursor; text/button stay above at z-10. */}
                <div className="absolute left-1/2 top-0 z-0 h-full w-screen -translate-x-1/2 opacity-[0.4] [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]">
                    {showShader && <PixelGridShader
                        shape="plasma"
                        colorFg="#3D5CFF"
                        pxSize={5}
                        amplitude={0.2}
                        frequency={0.7}
                        speed={0.6}
                        matrix="bayer8"
                        cursorMode="burn"
                        cursorSize={0.4}
                        cursorScale={0.3}
                    />}
                </div>

                <div className="relative z-10 flex w-full max-w-3xl flex-col items-center space-y-6 text-center">
                <HeaderBadge
                    icon={hero.badgeIcon}
                    text={hero.badge}
                    className="max-[350px]:hidden"
                />
                <h1 className="text-balance text-center text-5xl font-semibold tracking-tighter text-foreground md:text-6xl lg:text-7xl">
                    Finally, AI agents understand{" "}
                    <RotatingWord />
                </h1>
                <p className="mx-auto max-w-xl text-balance text-center text-lg text-muted-foreground">
                    Turn any UI animation into an agent-ready Motion Blueprint — trigger,
                    timing, easing, and feel your AI agent can actually build from.
                </p>
                <PremiumButton
                    text={hero.cta.primary.text}
                    onClick={() => {
                        window.location.href = hero.cta.primary.href;
                    }}
                />
                </div>
            </div>

            {/* clip → Blueprint — below the fold */}
            <div className="relative z-10 mx-auto w-full max-w-5xl pb-20 md:pb-28">
                <div className="mb-4 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Any UI animation</span>
                    <span>Agent-ready Blueprint</span>
                </div>
                <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
                    <ClipCard />

                    {/* connector — arrow only, no logo */}
                    <div className="flex items-center justify-center">
                        <div className={`flex size-9 items-center justify-center rounded-full border border-border/70 bg-card ring-1 ring-black/[0.03] ${CARD_SHADOW}`}>
                            <ArrowRight className="hidden size-4 text-[#2A48F0] md:block" />
                            <ArrowDown className="size-4 text-[#2A48F0] md:hidden" />
                        </div>
                    </div>

                    <BlueprintCard />
                </div>
            </div>
        </section>
    );
}
