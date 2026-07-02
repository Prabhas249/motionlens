import { Navbar } from "@marketing/components/section/navbar";
import { ThemeProvider } from "@marketing/components/theme-provider";
import { siteConfig } from "@marketing/lib/site";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from "geist/font/pixel";
import "../../marketing/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelFontVars = [
  GeistPixelSquare.variable,
  GeistPixelGrid.variable,
  GeistPixelCircle.variable,
  GeistPixelTriangle.variable,
  GeistPixelLine.variable,
].join(" ");

export const viewport: Viewport = {
  themeColor: "black",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "MotionLens — Turn UI animations into AI-ready Motion Blueprints",
    template: `%s · ${siteConfig.name}`,
  },
  description:
    "MotionLens watches any UI animation — a screen recording or a live website — and hands your AI coding agent an exact Motion Blueprint: timings, easing, choreography, and ready-to-paste Framer Motion, CSS, and GSAP code. Works in Claude Code and Cursor via MCP.",
  keywords: [
    "UI animation analysis",
    "motion design spec",
    "AI coding agent",
    "Framer Motion code from video",
    "animation to code",
    "MCP server",
    "Claude Code",
    "Cursor",
    "micro-interactions",
    "motion blueprint",
  ],
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    url: siteConfig.url,
    title: "MotionLens — Give your AI agent eyes for motion",
    description:
      "Any UI animation → an exact Motion Blueprint your AI agent can build from: timings, easing, choreography, and ready-to-paste code.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MotionLens — Give your AI agent eyes for motion",
    description:
      "Any UI animation → an exact Motion Blueprint your AI agent can build from: timings, easing, choreography, and ready-to-paste code.",
  },
  robots: { index: true, follow: true },
};

// Marketing/landing surface. Its globals + Geist fonts + Navbar only load on
// these routes (currently just "/"), keeping it isolated from the app theme.
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} ${pixelFontVars} antialiased font-sans overflow-x-clip`}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="relative mx-auto max-w-7xl">
          {/* editorial gradient behind navbar + hero — light mode only; dark mode = fully dark */}
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-svh bg-background [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,var(--secondary)_100%)] dark:[background:var(--background)]" />
          {/* subtle on-brand cobalt glow at the very top */}
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[65vh] [background:radial-gradient(60%_50%_at_50%_0%,rgba(42,72,240,0.10),transparent_70%)]" />
          <Navbar />
          {children}
        </div>
      </ThemeProvider>
    </div>
  );
}
