import type { Metadata } from "next";
import { Section } from "@marketing/components/page-shell";
import { PostShell, Code } from "@marketing/components/post-shell";
import { POSTS } from "@marketing/lib/posts";

const post = POSTS.find((p) => p.slug === "feather-computer-hero-animation-teardown")!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
};

export default function Page() {
  return (
    <PostShell post={post}>
      <Section title="The animation">
        <p>
          Open <a href="https://feather.computer" className="font-medium text-[#2A48F0] hover:underline">feather.computer</a>{" "}
          and the hero doesn&apos;t fade in — it <em>detonates</em>. A &ldquo;Got Mail?&rdquo; headline appears,
          a dense stack of mail-themed stickers assembles behind it, and then the whole pile explodes
          radially across the viewport, every ticket, envelope, and badge landing in a scattered-but-balanced
          field that keeps breathing for as long as you watch.
        </p>
        <p>
          It feels effortless. It isn&apos;t. We ran the first ten seconds through MotionLens in Precision
          mode and pulled the exact choreography apart. Here&apos;s what makes it work.
        </p>
      </Section>

      <Section title="The choreography, beat by beat">
        <ol className="ml-5 list-decimal space-y-2">
          <li><strong className="text-foreground">Anchor first.</strong> The headline fades into center before anything else moves. Your eye has a home before the chaos starts.</li>
          <li><strong className="text-foreground">Compress.</strong> Stickers scale up rapidly into a dense central stack — a beat of stored energy. This is classic anticipation: the pile <em>is</em> the wind-up.</li>
          <li><strong className="text-foreground">Detonate.</strong> Radial scatter, every item on its own trajectory, finished with a snappy overshoot — the blueprint reads it as <code className="font-mono text-[13px]">ease-out-back</code>. Items overshoot their landing spot and snap back, which is what sells the physicality.</li>
          <li><strong className="text-foreground">Never fully stop.</strong> After landing, every sticker keeps a slow independent drift (~15px translation range) and a gentle rotation oscillation between roughly −3° and +3°. The scene stays alive without demanding attention.</li>
          <li><strong className="text-foreground">Garnish.</strong> A cream bird glides leftward across the headline, and a dashed pill-shaped focus ring draws around the text — two small storytelling touches on top of the system.</li>
          <li><strong className="text-foreground">Reset.</strong> Everything fades out simultaneously and the loop breathes back in.</li>
        </ol>
      </Section>

      <Section title="Why it feels so good">
        <p>
          Three principles carry the whole thing. <strong className="text-foreground">Anticipation</strong>:
          the compressed stack makes the explosion legible — you understand where everything came from.{" "}
          <strong className="text-foreground">Overshoot</strong>: the ease-out-back landing gives weight and
          snap; linear easing here would feel like a PowerPoint transition.{" "}
          <strong className="text-foreground">Ambient afterlife</strong>: the post-explosion drift is doing
          the quiet work — a static field would read as &ldquo;finished loading,&rdquo; while the drift reads
          as &ldquo;alive.&rdquo; The blueprint&apos;s feel tags: <em>tactile, playful, weightless, organized-chaos</em>.
        </p>
      </Section>

      <Section title="Recreating the core mechanic">
        <p>A minimal Framer Motion sketch of the explosion + drift pattern:</p>
        <Code>{`// each sticker: explode from center, then drift forever
<motion.div
  initial={{ x: 0, y: 0, scale: 0.6, opacity: 0 }}
  animate={{
    x: target.x, y: target.y, scale: 1, opacity: 1,
    transition: { type: "spring", stiffness: 260, damping: 18 }, // the overshoot
  }}
>
  <motion.div
    animate={{ rotate: [-3, 3, -3], y: [0, -8, 0] }}
    transition={{ duration: 6 + Math.random() * 3, repeat: Infinity, ease: "easeInOut" }}
  >
    {sticker}
  </motion.div>
</motion.div>`}</Code>
        <p>
          The details that matter: stagger the explosion by a few milliseconds per item, randomize each
          drift duration so the field never synchronizes, and keep the drift amplitude small — the original
          moves items barely 15px.
        </p>
      </Section>

      <Section title="What we honestly can't know from video">
        <p>
          The blueprint declares its blind spots instead of inventing them: the exact spring constants
          behind the overshoot, whether the dot-grid background has its own parallax layer, and the
          per-sticker oscillation frequencies. Those live in feather&apos;s source code, not in any recording —
          a 10-second clip sampled at 12fps tells you the choreography and the curves, not the constants.
        </p>
      </Section>

      <Section title="How this teardown was made">
        <p>This entire analysis was one sentence in Claude Code:</p>
        <Code>{`analyze the first 10 seconds of https://feather.computer with MotionLens in precision mode`}</Code>
        <p>
          MotionLens recorded the page headlessly with real frame timing, watched it, and returned the
          blueprint — motions, timings, easing, and an agent-ready prompt.{" "}
          <a href="/login" className="font-medium text-[#2A48F0] hover:underline">Try it on any site</a> —
          new accounts get 5 free credits, no card.
        </p>
      </Section>
    </PostShell>
  );
}
