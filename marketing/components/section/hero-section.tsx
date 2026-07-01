"use client";

import { motion } from "motion/react";
import { ArrowRight, ArrowDown, Check } from "lucide-react";
import { siteConfig } from "@marketing/lib/config";
import { HeaderBadge } from "@marketing/components/header-badge";
import PremiumButton from "@marketing/components/premium-button";
import { DiaTextReveal } from "@marketing/components/ui/dia-text";
import { MotionLensLogo } from "@marketing/components/motionlens-logo";

const BLUEPRINT = {
    summary:
        "A confirmation screen slides in, then its checklist items stagger up into place.",
    trigger: "tap",
    motion: [
        { el: "Screen", cls: "slide", val: "x 100% → 0", meta: "~350ms · ease-out" },
        { el: "Checklist", cls: "slide + fade", val: "+12px · 0 → 1", meta: "~300ms · 60ms stagger" },
        { el: "Primary CTA", cls: "fade", val: "opacity 0 → 1", meta: "~250ms" },
    ],
    feel: ["crisp", "deliberate", "native"],
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
                {/* 2×2 grid of real UI animations — source watermarks painted out in ffmpeg */}
                <video
                    className="h-full w-full object-cover"
                    src="/examples/hero-montage.mp4"
                    poster="/examples/hero-montage.jpg"
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
            {/* faint cobalt top glow for depth */}
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

export function HeroSection() {
    const { hero } = siteConfig;

    return (
        <section
            id="hero"
            className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden px-4 py-20 md:py-28"
        >
            {/* headline block */}
            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center justify-center space-y-6 text-center">
                <HeaderBadge
                    icon={hero.badgeIcon}
                    text={hero.badge}
                    className="max-[350px]:hidden"
                />
                <h1 className="text-balance text-center text-4xl font-semibold tracking-tighter text-foreground md:text-5xl lg:text-6xl">
                    Finally, AI agents understand{" "}
                    <DiaTextReveal
                        text={["motion", "animations", "interactions", "transitions"]}
                        textColor="#2A48F0"
                        colors={["#2A48F0"]}
                        repeat
                        repeatDelay={1.2}
                        duration={1.3}
                    />
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

            {/* before → after split */}
            <div className="relative z-10 mt-16 w-full max-w-5xl">
                <div className="mb-4 flex items-center justify-between px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Any UI animation</span>
                    <span>Agent-ready Blueprint</span>
                </div>
                <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
                    <ClipCard />

                    {/* connector */}
                    <div className="flex items-center justify-center">
                        <div className={`flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 ring-1 ring-black/[0.03] ${CARD_SHADOW}`}>
                            <span className="flex size-5 items-center justify-center rounded bg-[#2A48F0] text-white">
                                <MotionLensLogo className="size-3" animated={false} />
                            </span>
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
