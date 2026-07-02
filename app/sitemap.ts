import type { MetadataRoute } from "next";
import { POSTS } from "@marketing/lib/posts";
import { listShowcaseSlugs } from "@/lib/showcase";

const BASE = "https://motionlens.dev";

// Marketing routes only — the app surface is auth-gated (see robots.ts).
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.9, changeFrequency: "weekly" },
  { path: "/animations", priority: 0.9, changeFrequency: "weekly" },
  { path: "/api-reference", priority: 0.8, changeFrequency: "weekly" },
  { path: "/integrations", priority: 0.7, changeFrequency: "monthly" },
  { path: "/multi-agent-workflows", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/community", priority: 0.4, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.3, changeFrequency: "monthly" },
  { path: "/brand", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Gallery pages are DB-driven — the sitemap grows as showcases are curated.
  let slugs: string[] = [];
  try { slugs = await listShowcaseSlugs(); } catch { /* sitemap still ships */ }
  return [
    ...ROUTES.map((r) => ({
      url: `${BASE}${r.path}`,
      lastModified: new Date(),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...POSTS.map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...slugs.map((slug) => ({
      url: `${BASE}/animations/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
