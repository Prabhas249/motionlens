/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel's serverless runtime has no ffmpeg. Force the ffmpeg-static binary to
  // be traced into the analyze function bundle so storyboard frames, motion-energy
  // and clip compression actually run in production.
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};
export default nextConfig;
