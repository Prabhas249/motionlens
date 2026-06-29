import { Feature } from "@marketing/components/animations/feature-slide";
import { siteConfig } from "@marketing/lib/config";

export function DemoSection() {
    const { items } = siteConfig.demoSection;

    return (
        <section
            id="demo"
            className="w-full relative"
        >
            <Feature
                collapseDelay={5000}
                linePosition="bottom"
                featureItems={items}
                lineColor="bg-[#2A48F0]"
            />
        </section>
    );
}
