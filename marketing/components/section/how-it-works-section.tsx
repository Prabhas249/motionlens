import HowItWorks, { type Step } from "@marketing/components/how-it-works";
import TextReveal from "@marketing/components/forgeui/text-reveal";

const steps: Step[] = [
  {
    title: "Drop a video",
    description:
      "Drag in any screen recording of a UI animation — from any app, site, or prototype.",
    colorTheme: "orange",
  },
  {
    title: "MotionLens decodes it",
    description:
      "Every layer, timing, easing, and sequence becomes a structured Motion Blueprint.",
    colorTheme: "blue",
  },
  {
    title: "See the storyboard",
    description:
      "Each key moment is annotated frame-by-frame, so the motion is crystal clear before you build.",
    colorTheme: "purple",
  },
  {
    title: "Your agent builds it",
    description:
      "Paste the Blueprint into Cursor or Claude and get the animation back as real, pixel-perfect code.",
    colorTheme: "orange",
  },
];

export function HowItWorksSection() {
  return (
    <div className="bg-white dark:bg-black">
      <div
        id="how-it-works"
        className="mx-auto max-w-4xl px-6 pt-12 text-center md:pt-16"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2A48F0] dark:text-blue-400">
          How it works
        </p>
        <TextReveal
          text="Four steps from a screen recording to agent-ready code"
          duration={0.5}
          staggerDelay={0.12}
          className="mx-auto mt-4 max-w-3xl text-4xl font-medium leading-[1.05] tracking-tighter text-neutral-900 md:text-5xl lg:text-6xl dark:text-white"
        />
        <p className="mx-auto mt-6 max-w-md text-balance text-base leading-relaxed text-neutral-500 md:text-lg dark:text-neutral-400">
          No manual annotation — drop a clip, get a Blueprint, ship the motion.
        </p>
      </div>
      <HowItWorks features={steps} className="pt-12! md:pt-16!" />
    </div>
  );
}
