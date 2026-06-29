"use client";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { SectionHeader } from "../section-header";
import { Icons } from "../icons";
import { HeaderBadge } from "../header-badge";
import { OrbitingIconsBurst } from "@/components/animations/orbiting-icons-burst";
import { LazyDither } from "@/components/animations/lazy-dither";
import {
    ClaudeAI,
    Cursor,
    Github,
    OpenAI,
    Windsurf,
} from "@aliimam/logos";
import { Terminal } from "lucide-react";
import { MotionLensLogo } from "@/components/motionlens-logo";

const featureConfig = siteConfig.featureSection;

const ORBIT_CHIP =
    "bg-white dark:bg-neutral-900 border border-border shadow-sm";

export function FeatureSection() {

    return (
        <section id="features" className="w-full relative">
            <SectionHeader>
                <div className="flex flex-col items-center justify-center">
                    <HeaderBadge icon={featureConfig.badge.icon} text={featureConfig.badge.text} />
                    <div className="flex flex-col items-center justify-center gap-4 mt-4">
                        <h2 className="text-3xl md:text-4xl lg:text-6xl font-medium tracking-tighter text-center text-balance">
                            {featureConfig.title}
                        </h2>
                        <p className="text-muted-foreground md:text-lg text-center text-balance mx-auto">
                            {featureConfig.description}
                        </p>
                    </div>
                </div>
            </SectionHeader>
            <div className="relative h-14 overflow-hidden">
                <div className="absolute inset-0">
                    <LazyDither enableMouseInteraction={true} />
                </div>
            </div>
            <div className="mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-6">
                    {/* Left Column - Sticky Description */}
                    <div className="col-span-1 md:col-span-2 p-8 md:p-10 lg:p-14 md:sticky md:top-20 md:self-start flex flex-col gap-7">
                        <h3 className="text-3xl lg:text-4xl font-medium tracking-tighter text-left text-balance">
                            {featureConfig.sections.title}
                        </h3>
                        <p className="text-muted-foreground text-left text-balance">
                            {featureConfig.sections.description}
                        </p>
                        <Button variant="secondary" className="w-fit border border-border">
                            {featureConfig.sections.ctaButton.text}
                            <Icons.arrowRight className="size-4 text-foreground" />
                        </Button>
                    </div>

                    {/* Right Column - Animated Blocks */}
                    <div className="col-span-1 md:col-span-4 w-full border-t md:border-t-0 md:border-l border-border relative">
                        <div className="w-full divide-y divide-border">
                            <div className="relative">
                                <OrbitingIconsBurst
                                    items={[
                                        { id: 1, delay: 0, rayIndex: 10, distance: 152, className: ORBIT_CHIP, icon: <ClaudeAI size={22} /> },
                                        { id: 2, delay: 0.08, rayIndex: 14, distance: 138, className: ORBIT_CHIP, icon: <Cursor size={22} /> },
                                        { id: 3, delay: 0.16, rayIndex: 19, distance: 178, className: ORBIT_CHIP, icon: <OpenAI size={22} /> },
                                        { id: 4, delay: 0.24, rayIndex: 22, distance: 144, className: ORBIT_CHIP, icon: <Terminal className="size-5 text-neutral-900 dark:text-neutral-100" /> },
                                        { id: 5, delay: 0.48, rayIndex: 4, distance: 156, className: ORBIT_CHIP, icon: <Windsurf size={22} /> },
                                        { id: 6, delay: 0.56, rayIndex: 7, distance: 170, className: ORBIT_CHIP, icon: <Github size={22} /> },
                                    ]}
                                    lineCount={22}
                                    centerIcon={
                                        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#2A48F0] text-white shadow-lg">
                                            <MotionLensLogo className="size-6" />
                                        </div>
                                    }
                                    className="relative min-h-[300px] md:min-h-[400px] mask-[radial-gradient(ellipse_at_center,black_40%,black_60%,transparent_85%)]"
                                />
                                <div className="max-w-xl text-left items-start p-6">
                                    <p className="text-sm text-muted-foreground flex items-center gap-3 justify-start">
                                        {featureConfig.sections.blocks[0].icon}
                                        {featureConfig.sections.blocks[0].title}
                                    </p>
                                    <p className="text-base text-foreground leading-relaxed mt-2">
                                        {featureConfig.sections.blocks[0].description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
