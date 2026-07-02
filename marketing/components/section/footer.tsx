"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@marketing/lib/config";
import { MotionLensLogo } from "@marketing/components/motionlens-logo";
import { FlickeringGridText } from "@marketing/components/ui/flickering-grid-text";
import { useMobile } from "@marketing/hooks/use-mobile";

// Footer links intentionally hidden (kept out of the footer regardless of config).
const HIDE_LINKS = new Set([
    "Multi-Agent Workflows",
    "Our team",
    "Careers",
    "Brand",
    "Legal",
]);

export function Footer() {
    const { footerLinks, hero } = siteConfig;
    const tablet = useMobile(1024);

    return (
        <footer id="footer" className="w-full pb-0">
            <div className="flex flex-col p-10 md:flex-row md:items-start md:justify-between">
                <div className="mx-0 flex max-w-xs flex-col items-start justify-start gap-y-5">
                    <Link href="/" className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-[#2A48F0] text-white shadow-sm">
                            <MotionLensLogo className="size-[18px]" animated={false} />
                        </span>
                        <span className="font-mono text-base font-semibold lowercase tracking-tight text-foreground">
                            motionlens
                        </span>
                    </Link>
                    <p className="font-medium tracking-tight text-muted-foreground">
                        {hero.description}
                    </p>
                    {/* contact — a human answers, and it shows */}
                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                        <a
                            href="mailto:support@motionlens.dev"
                            className="hover:text-foreground transition-colors"
                        >
                            support@motionlens.dev
                        </a>
                        <p>
                            Built by{" "}
                            <a
                                href="https://x.com/Prabhas_24_"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[#2A48F0] hover:underline"
                            >
                                @Prabhas_24_
                            </a>{" "}
                            &amp;{" "}
                            <a
                                href="https://x.com/rithiksai03"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[#2A48F0] hover:underline"
                            >
                                @rithiksai03
                            </a>
                        </p>
                    </div>
                </div>
                <div className="pt-5 md:w-1/2">
                    <div className="flex flex-col items-start justify-start gap-y-5 md:flex-row md:items-start md:justify-between lg:pl-10">
                        {footerLinks.map((column) => {
                            const links = column.links.filter(
                                (link) => !HIDE_LINKS.has(link.title),
                            );
                            if (!links.length) return null;
                            return (
                                <ul key={column.title} className="flex flex-col gap-y-2">
                                    <li className="mb-2 text-sm font-semibold text-foreground">
                                        {column.title}
                                    </li>
                                    {links.map((link) => (
                                        <li
                                            key={link.id}
                                            className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground"
                                        >
                                            <Link href={link.url}>{link.title}</Link>
                                            <div className="flex size-4 translate-x-0 transform items-center justify-center rounded border border-border opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="relative z-0 mt-24 h-48 w-full md:h-64">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-transparent from-40% to-background" />
                <div className="absolute inset-0 mx-6">
                    <FlickeringGridText
                        text={tablet ? "MotionLens" : "Show, don't describe."}
                        fontSize={tablet ? 60 : 84}
                        className="h-full w-full"
                        squareSize={2}
                        gridGap={tablet ? 2 : 3}
                        color="#6B7280"
                        maxOpacity={0.3}
                        flickerChance={0.1}
                    />
                </div>
            </div>
        </footer>
    );
}
