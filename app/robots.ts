import type { MetadataRoute } from "next";

// The app surface (dashboard/settings/auth) is auth-gated and worthless to
// crawlers — keep them on the marketing pages where the story is.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/settings", "/login", "/signup", "/mcp", "/api/"],
      },
    ],
    sitemap: "https://motionlens.dev/sitemap.xml",
  };
}
