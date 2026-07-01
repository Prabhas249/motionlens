"use client";

import { siteConfig } from "@marketing/lib/config";
import { HeaderBadge } from "@marketing/components/header-badge";
import PremiumButton from "@marketing/components/premium-button";
import { HeroLogos } from "@marketing/components/hero-logos";
import { DiaTextReveal } from "@marketing/components/ui/dia-text";

export function HeroSection() {
    const { hero } = siteConfig;

    return (
        <section
            id="hero"
            className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden border-x border-b border-border px-4 py-16 md:py-24"
        >
            {/* clean editorial background — replaces the photographic sky */}
            <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,var(--secondary)_100%)]" />
            {/* subtle on-brand cobalt glow near the top */}
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] [background:radial-gradient(60%_50%_at_50%_0%,rgba(42,72,240,0.10),transparent_70%)]" />

            <HeroLogos className="z-20 hidden md:block" />
            <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center space-y-6 text-center">
                <HeaderBadge
                    icon={hero.badgeIcon}
                    text={hero.badge}
                    className="max-[350px]:hidden"
                />
                <h1 className="text-balance text-center text-4xl font-semibold tracking-tighter text-foreground md:text-5xl lg:text-6xl">
                    Finally, AI agents understand{" "}
                    <DiaTextReveal
                        text={["animations", "motion", "interactions", "transitions"]}
                        textColor="#2A48F0"
                        colors={["#2A48F0"]}
                        repeat
                        repeatDelay={1.2}
                        duration={1.3}
                    />
                </h1>
                <p className="mx-auto max-w-2xl text-balance text-center text-lg text-muted-foreground">
                    {hero.description}
                </p>
                <PremiumButton
                    text={hero.cta.primary.text}
                    onClick={() => {
                        window.location.href = hero.cta.primary.href;
                    }}
                />
            </div>
        </section>
    );
}
