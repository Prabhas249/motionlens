"use client";

import { siteConfig } from "@marketing/lib/config";
import { HeaderBadge } from "@marketing/components/header-badge";
import PremiumButton from "@marketing/components/premium-button";
import Cloudscape from "@marketing/components/forgeui/cloudscape";
import { HeroLogos } from "@marketing/components/hero-logos";
import { DiaTextReveal } from "@marketing/components/ui/dia-text";

export function HeroSection() {
    const { hero } = siteConfig;

    return (

        <section
            id="hero"
            className="relative flex min-h-svh w-screen left-1/2 -ml-[50vw] flex-col items-center justify-center overflow-hidden px-4 py-16 md:py-24"
        >
            <Cloudscape
                height="100%"
                className="pointer-events-none absolute inset-0 -z-1 h-full w-full"
            />
            <HeroLogos className="z-20 hidden md:block" />
            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6 max-w-4xl mx-auto">
                <HeaderBadge icon={hero.badgeIcon} text={hero.badge} className="max-[350px]:hidden" />
                <h1 className="text-center text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tighter text-balance text-neutral-900 [text-shadow:0_1px_12px_rgba(255,255,255,0.6)]">
                    Finally, AI agents understand{" "}
                    <DiaTextReveal
                        text={["animations", "motion", "interactions", "transitions"]}
                        textColor="#2A48F0"
                        colors={["#2A48F0"]}
                        repeat
                        repeatDelay={1.2}
                        duration={1.3}
                        className="[text-shadow:none]"
                    />
                </h1>
                <p className="text-neutral-800 text-center text-balance text-lg max-w-2xl mx-auto">
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