import { LazyDither } from "@marketing/components/animations/lazy-dither";
import { ExamplesSection } from "@marketing/components/section/examples-section";
import { ConnectSection } from "@marketing/components/section/connection-section";
import { CTASection } from "@marketing/components/section/cta-section";
import { FAQSection } from "@marketing/components/section/faq-section";
import { FeatureSection } from "@marketing/components/section/feature-section";
import { Footer } from "@marketing/components/section/footer";
import { HeroSection } from "@marketing/components/section/hero-section";
import { PricingSection } from "@marketing/components/section/pricing-section";
import { WorkflowConnectSection } from "@marketing/components/section/workflow-connect-section";
import { HowItWorksSection } from "@marketing/components/section/how-it-works-section";

export default function Home() {
  return (
    <main className="flex w-full flex-col pt-16">
      {/* hero: no side lines, open background */}
      <HeroSection />
      {/* framed column starts at the examples strip */}
      <div className="flex flex-col divide-y divide-border border-x border-t border-border">
        <ExamplesSection />
        <HowItWorksSection />
        <WorkflowConnectSection />
        <FeatureSection />
        <ConnectSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
        <Footer />
      </div>
      <LazyDither />
    </main>
  );
}
