import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { cn } from "@/lib/utils";

// App font lives on <html> so EVERYTHING inherits it — including dropdowns,
// dialogs and tooltips, which render through a portal to <body> (outside any
// route-group wrapper). The marketing routes override their own font on their
// own wrapper. Moving this onto a nested div is what made menus use a system font.
const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MotionLens",
  description: "Turn any UI animation into an AI-ready Motion Blueprint.",
};

// Root shell only — owns <html>/<body>. Each route group brings its own
// theme + global stylesheet so the marketing and app design systems never
// load on the same page. See app/(marketing) and app/(app).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        {children}
        <Analytics />
        {/* GA4 — renders only once NEXT_PUBLIC_GA_ID (G-XXXXXXX) is set */}
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
