"use client";

import { Button } from "@marketing/components/ui/button";
import { Icons } from "@marketing/components/icons";
import { siteConfig } from "@marketing/lib/config";
import { CornerPlus } from "@marketing/components/ui/corner-plus";
import { MotionLensTerminal } from "@marketing/components/motionlens-terminal";
import { LazyDither } from "@marketing/components/animations/lazy-dither";

const workflowConnectConfig = siteConfig.workflowConnectSection;

export function WorkflowConnectSection() {
    return (
        <section id="workflow" className="w-full relative flex flex-col divide-y divide-border">
            <div className="relative h-14 overflow-hidden">
                <div className="absolute inset-0">
                    <LazyDither enableMouseInteraction={false} />
                </div>
            </div>

            <div className="mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-6">
                    <div className="col-span-1 md:col-span-2 p-8 md:p-10 lg:p-14 md:sticky md:top-20 md:self-start flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2A48F0] dark:text-blue-400">
                                Model Context Protocol
                            </p>
                            <h3 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tighter leading-[1.05] text-left text-balance">
                                {workflowConnectConfig.title}
                            </h3>
                        </div>
                        <p className="text-muted-foreground text-left text-balance md:text-lg">
                            {workflowConnectConfig.description}
                        </p>
                        <Button
                            variant="secondary"
                            className="w-fit border border-border"
                            asChild
                        >
                            <a href={workflowConnectConfig.ctaButton.href}>
                                {workflowConnectConfig.ctaButton.text}
                                <Icons.arrowRight className="size-4 text-foreground" />
                            </a>
                        </Button>
                    </div>

                    <div className="col-span-1 md:col-span-4 w-full border-t md:border-t-0 md:border-l border-border relative">
                        <CornerPlus position="all" className="text-muted-foreground/50" />
                        <div className="flex items-center justify-center p-6 md:p-10 lg:p-14">
                            <MotionLensTerminal />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
