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

// Structured data: lets Google show MotionLens as a software product with
// real prices instead of a bare link.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "MotionLens",
  url: "https://motionlens.dev",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Turn any UI animation — screen recording or live website — into an AI-ready Motion Blueprint: timings, easing, choreography, and ready-to-paste Framer Motion, CSS, and GSAP code.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro", price: "9", priceCurrency: "USD" },
    { "@type": "Offer", name: "Studio", price: "19", priceCurrency: "USD" },
  ],
};

export default function Home() {
  return (
    <main className="flex w-full flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
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
