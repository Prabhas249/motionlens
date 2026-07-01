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
            className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden px-4 py-16 md:py-24"
        >
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
