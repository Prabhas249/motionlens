// Blog post registry — single source of truth for the index page and sitemap.
// Each post is a static page at app/(marketing)/blog/<slug>/page.tsx.
export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  tag: string;
  minutes: number;
};

export const POSTS: Post[] = [
  {
    slug: "feather-computer-hero-animation-teardown",
    title: "Teardown: feather.computer's radial sticker explosion",
    description:
      "A frame-accurate breakdown of one of the best hero animations on the web right now — the timings, the ease-out-back overshoot, the ambient drift — extracted by MotionLens in one sentence.",
    date: "2026-07-02",
    tag: "Teardown",
    minutes: 6,
  },
  {
    slug: "animation-to-code-claude-code-mcp",
    title: "Turn any UI animation into Framer Motion code with Claude Code",
    description:
      "The two-minute setup that lets your AI agent watch a screen recording — or a live website — and hand back exact timings, easing, and ready-to-paste code.",
    date: "2026-07-02",
    tag: "Tutorial",
    minutes: 5,
  },
  {
    slug: "why-ai-agents-cant-see-motion",
    title: "Why AI coding agents can't see motion (and how we gave them eyes)",
    description:
      "Video models sample ~1fps by default and miss entire choreographies. How MotionLens measures motion from pixels, records with real frame timing, and declares what it can't know instead of hallucinating it.",
    date: "2026-07-02",
    tag: "Engineering",
    minutes: 7,
  },
];
