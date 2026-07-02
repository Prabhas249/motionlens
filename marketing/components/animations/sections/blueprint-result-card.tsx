"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";
import { Copy, Check, X } from "lucide-react";
import { cn } from "@marketing/lib/utils";
import { MotionLensLogo } from "@marketing/components/motionlens-logo";

// Real precision-analysis example (Grok mobile launch) — mirrors the product output.
const FRAMES = [
    { src: "/storyboard/frame-1.png", label: "Logo on splash" },
    { src: "/storyboard/frame-2.png", label: "Keyboard + input slide up" },
    { src: "/storyboard/frame-3.png", label: "Final state" },
];

const MOTIONS = [
    { el: "Keyboard", purpose: "contextual tool entry", cls: "slide", val: "off-screen bottom → rest", meta: "~500ms · ease-out" },
    { el: "Input Bar", purpose: "primary control entry", cls: "slide", val: "+40px → rest", meta: "~500ms · ease-out" },
    { el: "Header", purpose: "navigation reveal", cls: "fade", val: "opacity 0 → 1", meta: "~400ms · 80ms in" },
    { el: "Suggestion Pills", purpose: "content discovery", cls: "slide + fade", val: "+20px · opacity 0 → 1", meta: "~400ms · 60ms stagger" },
    { el: "Legal Text", purpose: "ancillary reveal", cls: "fade", val: "opacity 0 → 1", meta: "~500ms · 370ms in" },
];

const FLOW = [
    "X1 logo is static on a black background",
    "Header fades in while keyboard and input bar slide up from the bottom",
    "Suggestion pills slide up and fade in with staggered timing",
    "Terms and Privacy text fades in as the final element",
];

const SUMMARY =
    "A dark UI assembly — the header fades in as the keyboard and input bar slide up, then suggestion pills stagger in and legal text fades last.";

const AGENT_PROMPT =
    "Animate a dark-mode mobile UI assembly. Center a dark gray X1 logo on a black background. Simultaneously slide a standard keyboard and pill-shaped input bar up from the bottom (500ms, ease-out). During this rise, fade in the top header (compose icon, 'Grok' label, white 'Sign In' button). Subsequently, introduce three dark-gray suggestion chips above the input bar using a staggered fade and 20px upward slide (400ms, 60ms stagger). Finish by fading in a line of gray legal text at the very bottom.";

const CODE: Record<string, string> = {
    "Framer Motion": `<motion.div
  initial={{ y: 40, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.5,
    ease: [0.33, 1, 0.68, 1] }}
/>`,
    CSS: `@keyframes slideUp {
  from { transform: translateY(40px);
         opacity: 0 }
  to   { transform: translateY(0);
         opacity: 1 }
}`,
    GSAP: `gsap.from(".input", {
  y: 40, opacity: 0,
  duration: 0.5, ease: "power2.out"
})`,
    Tailwind: `<div class="translate-y-10 opacity-0
  animate-[slideUp_.5s_ease-out]" />`,
};

// What "Copy" puts on the clipboard — everything useful, no images.
const BLUEPRINT_TEXT = [
    "MOTION BLUEPRINT — high confidence (precision)",
    "",
    SUMMARY,
    "",
    "ANIMATION FLOW",
    ...FLOW.map((f, i) => `${i + 1}. ${f}`),
    "",
    "MOTION",
    ...MOTIONS.map((m) => `- ${m.el} (${m.cls}): ${m.val} · ${m.meta} — ${m.purpose}`),
    "",
    "AGENT PROMPT",
    AGENT_PROMPT,
].join("\n");

const TABS = ["storyboard", "motion", "code"] as const;
type Tab = (typeof TABS)[number];

const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};
const item: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const swap = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.2 },
};

export function BlueprintResultCard({ className }: { className?: string }) {
    const [tab, setTab] = useState<Tab>("storyboard");
    const [fw, setFw] = useState("Framer Motion");
    const [copied, setCopied] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);
    const [imgCopied, setImgCopied] = useState(false);

    function copyText() {
        navigator.clipboard?.writeText(BLUEPRINT_TEXT);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    async function copyImage(src: string) {
        try {
            const res = await fetch(src);
            const blob = await res.blob();
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            setImgCopied(true);
            setTimeout(() => setImgCopied(false), 1500);
        } catch {
            // clipboard image write unsupported — no-op
        }
    }

    return (
        <>
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: 16 }}
                className={cn("w-full rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm", className)}
            >
                <motion.div variants={item} className="flex items-center gap-2.5">
                    <span className="flex size-6 items-center justify-center rounded-md bg-[#2A48F0] text-white">
                        <MotionLensLogo className="size-3.5" animated={false} />
                    </span>
                    <span className="text-sm font-medium">Motion Blueprint</span>
                    <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        precision
                    </span>
                    <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        high confidence
                    </span>
                </motion.div>

                <motion.p variants={item} className="mt-3 text-sm leading-snug text-foreground/90">
                    {SUMMARY}
                </motion.p>

                <motion.div
                    variants={item}
                    className="mt-4 flex items-center gap-1 rounded-lg border border-border bg-background/50 p-1"
                >
                    {TABS.map((t) => (
                        <button type="button"
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                                tab === t ? "bg-[#2A48F0] text-white" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </motion.div>

                <motion.div variants={item} className="mt-3 min-h-[200px] max-h-[260px] overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {tab === "storyboard" && (
                            <motion.div {...swap} key="sb" className="flex gap-3 overflow-x-auto pb-1">
                                {FRAMES.map((f) => (
                                    <button type="button"
                                        key={f.src}
                                        onClick={() => setLightbox(f.src)}
                                        className="group w-[150px] shrink-0 text-left"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={f.src}
                                            alt={f.label}
                                            className="w-full rounded-lg border border-border bg-white transition group-hover:border-[#2A48F0]"
                                        />
                                        <p className="mt-1.5 text-[11px] leading-tight text-muted-foreground">{f.label}</p>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                        {tab === "motion" && (
                            <motion.div {...swap} key="mo" className="space-y-2">
                                {MOTIONS.map((m) => (
                                    <div key={m.el + m.cls} className="rounded-lg border border-border bg-background/50 p-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-medium">{m.el}</span>
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{m.cls}</span>
                                            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{m.meta}</span>
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-[#2A48F0]/85">{m.purpose}</p>
                                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{m.val}</p>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                        {tab === "code" && (
                            <motion.div {...swap} key="cd">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {Object.keys(CODE).map((f) => (
                                        <button type="button"
                                            key={f}
                                            onClick={() => setFw(f)}
                                            className={cn(
                                                "rounded-md border px-2 py-1 text-[11px] transition-colors",
                                                fw === f
                                                    ? "border-[#2A48F0] bg-[#2A48F0] text-white"
                                                    : "border-border text-muted-foreground hover:text-foreground",
                                            )}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-[#0b0b0c] p-3 font-mono text-[11px] leading-relaxed text-neutral-300">
                                    {CODE[fw]}
                                </pre>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <motion.button
                    variants={item}
                    onClick={copyText}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A48F0]/20 bg-[#2A48F0]/5 px-3 py-2 text-xs font-medium text-[#2A48F0] transition-colors hover:bg-[#2A48F0]/10"
                >
                    {copied ? <Check className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
                    {copied ? "Copied — paste into your agent" : "Copy Blueprint for your agent"}
                </motion.button>
            </motion.div>

            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightbox(null)}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={lightbox}
                                alt="Storyboard frame"
                                className="max-h-[85vh] w-auto rounded-xl border border-white/10 bg-white shadow-2xl"
                            />
                            <div className="absolute right-3 top-3 flex gap-2">
                                <button type="button"
                                    onClick={() => copyImage(lightbox)}
                                    className="flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-neutral-900 transition hover:bg-white"
                                >
                                    {imgCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                                    {imgCopied ? "Copied" : "Copy image"}
                                </button>
                                <button type="button"
                                    onClick={() => setLightbox(null)}
                                    className="flex size-8 items-center justify-center rounded-lg bg-white/90 text-neutral-900 transition hover:bg-white"
                                    aria-label="Close"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
