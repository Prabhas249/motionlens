import dynamic from "next/dynamic";
import { HeroSection } from "@marketing/components/section/hero-section";

// Everything below the fold is code-split so the hero (the LCP element)
// hydrates first instead of waiting for the whole landing bundle. SSR stays
// on — crawlers still get full HTML; only the client JS is deferred.
const ExamplesSection = dynamic(() => import("@marketing/components/section/examples-section").then(m => m.ExamplesSection));
const ConnectSection = dynamic(() => import("@marketing/components/section/connection-section").then(m => m.ConnectSection));
const CTASection = dynamic(() => import("@marketing/components/section/cta-section").then(m => m.CTASection));
const FAQSection = dynamic(() => import("@marketing/components/section/faq-section").then(m => m.FAQSection));
const FeatureSection = dynamic(() => import("@marketing/components/section/feature-section").then(m => m.FeatureSection));
const Footer = dynamic(() => import("@marketing/components/section/footer").then(m => m.Footer));
const PricingSection = dynamic(() => import("@marketing/components/section/pricing-section").then(m => m.PricingSection));
const WorkflowConnectSection = dynamic(() => import("@marketing/components/section/workflow-connect-section").then(m => m.WorkflowConnectSection));
const HowItWorksSection = dynamic(() => import("@marketing/components/section/how-it-works-section").then(m => m.HowItWorksSection));
const LazyDither = dynamic(() => import("@marketing/components/animations/lazy-dither").then(m => m.LazyDither));

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
