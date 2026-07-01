import { SectionHeader } from "@marketing/components/section-header";
import { ExamplesMarquee } from "@marketing/components/animations/examples-marquee";
import { siteConfig } from "@marketing/lib/config";
import { HeaderBadge } from "../header-badge";

export function ExamplesSection() {
    const { examplesSection } = siteConfig;

    return (
        <section
            id="examples"
            className="flex w-full flex-col items-center justify-center"
        >
            <SectionHeader>
                <div className="flex flex-col items-center justify-center">
                    <HeaderBadge
                        icon={examplesSection.badge.icon}
                        text={examplesSection.badge.text}
                    />
                    <div className="mt-4 flex flex-col items-center justify-center gap-4">
                        <h2 className="text-balance text-center text-3xl font-medium tracking-tighter md:text-4xl lg:text-6xl">
                            {examplesSection.title}
                        </h2>
                        <p className="mx-auto text-balance text-center text-muted-foreground md:text-lg">
                            {examplesSection.description}
                        </p>
                    </div>
                </div>
            </SectionHeader>
            <ExamplesMarquee examples={examplesSection.examples} />
        </section>
    );
}
