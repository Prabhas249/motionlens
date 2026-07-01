/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel's serverless runtime has no ffmpeg. Keep ffmpeg-static external (don't
  // bundle its JS) AND force its binary to be traced into the function bundle so
  // storyboard frames, motion-energy and clip compression run in production.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/ffmpeg-static/**"],
  },
};
export default nextConfig;
