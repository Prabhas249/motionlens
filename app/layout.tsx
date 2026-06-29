import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MotionLens",
  description: "Turn any UI animation into an AI-ready Motion Blueprint.",
};

// Root shell only — owns <html>/<body>. Each route group brings its own
// theme + global stylesheet so the marketing and app design systems never
// load on the same page. See app/(marketing) and app/(app).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
