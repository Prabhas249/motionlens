import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@marketing/lib/config";

export function CTASection() {
    const { ctaSection } = siteConfig;

    return (
        <section
            id={ctaSection.id}
            className="flex w-full flex-col items-center justify-center"
        >
            <div className="w-full">
                <div className="relative z-20 h-[400px] w-full overflow-hidden rounded-xl border border-[#2A48F0] bg-gradient-to-b from-[#3A57F5] to-[#2A48F0] shadow-xl md:h-[400px]">
                    <Image
                        src={ctaSection.backgroundImage}
                        alt="MotionLens CTA background"
                        className="absolute inset-0 h-full w-full object-cover object-right opacity-90 md:object-center"
                        fill
                        priority
                    />
                    <div className="absolute inset-0 -top-32 flex flex-col items-center justify-center md:-top-40">
                        <h2 className="max-w-xs text-center text-4xl font-medium tracking-tighter text-white md:max-w-xl md:text-7xl">
                            {ctaSection.title}
                        </h2>
                        <div className="absolute bottom-10 flex flex-col items-center justify-center gap-2">
                            <Link
                                href={ctaSection.button.href}
                                className="flex h-10 w-fit items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black shadow-md transition-transform hover:scale-[1.02] active:scale-95"
                            >
                                {ctaSection.button.text}
                            </Link>
                            <span className="text-sm text-white/90">
                                {ctaSection.subtext}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
