/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel's serverless runtime has no ffmpeg. Keep ffmpeg-static external (don't
  // bundle its JS) AND force its binary to be traced into the function bundle so
  // storyboard frames, motion-energy and clip compression run in production.
  serverExternalPackages: ["ffmpeg-static", "@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/ffmpeg-static/**"],
    // analyze_url records pages with headless chromium, then assembles the mp4
    // with ffmpeg — both binaries must ride along in the MCP function bundle.
    "/api/mcp": ["./node_modules/ffmpeg-static/**", "./node_modules/@sparticuz/chromium/**"],
  },
};
export default nextConfig;
