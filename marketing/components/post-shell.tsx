import { PageShell } from "@marketing/components/page-shell";
import type { Post } from "@marketing/lib/posts";

// Wraps a blog post in the editorial shell + BlogPosting structured data.
export function PostShell({ post, children }: { post: Post; children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "MotionLens", url: "https://motionlens.dev" },
    publisher: { "@type": "Organization", name: "MotionLens", url: "https://motionlens.dev" },
    mainEntityOfPage: `https://motionlens.dev/blog/${post.slug}`,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageShell
        eyebrow={`${post.tag} · ${new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · ${post.minutes} min`}
        title={post.title}
        intro={post.description}
      >
        {children}
      </PageShell>
    </>
  );
}

export function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
      {children}
    </pre>
  );
}
