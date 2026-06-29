import { LazyDither } from "@marketing/components/animations/lazy-dither";
import { CompanyShowcase } from "@marketing/components/section/company-showcase";
import { ConnectSection } from "@marketing/components/section/connection-section";
import { CTASection } from "@marketing/components/section/cta-section";
import { DemoSection } from "@marketing/components/section/demo-section";
import { FAQSection } from "@marketing/components/section/faq-section";
import { FeatureSection } from "@marketing/components/section/feature-section";
import { Footer } from "@marketing/components/section/footer";
import { HeroSection } from "@marketing/components/section/hero-section";
import { PricingSection } from "@marketing/components/section/pricing-section";
import { WorkflowConnectSection } from "@marketing/components/section/workflow-connect-section";
import { HowItWorksSection } from "@marketing/components/section/how-it-works-section";

export default function Home() {
  return (
    <main className="flex flex-col">
      <HeroSection />
      <div className="border-x border-border divide-y divide-border">
        <DemoSection />
        <CompanyShowcase />
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
