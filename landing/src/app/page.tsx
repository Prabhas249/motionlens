import { LazyDither } from "@/components/animations/lazy-dither";
import { CompanyShowcase } from "@/components/section/company-showcase";
import { ConnectSection } from "@/components/section/connection-section";
import { CTASection } from "@/components/section/cta-section";
import { DemoSection } from "@/components/section/demo-section";
import { FAQSection } from "@/components/section/faq-section";
import { FeatureSection } from "@/components/section/feature-section";
import { Footer } from "@/components/section/footer";
import { HeroSection } from "@/components/section/hero-section";
import { PricingSection } from "@/components/section/pricing-section";
import { WorkflowConnectSection } from "@/components/section/workflow-connect-section";
import { HowItWorksSection } from "@/components/section/how-it-works-section";

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
