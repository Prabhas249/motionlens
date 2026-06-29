import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// This landing site lives in a subfolder of a monorepo whose repo root also
// holds a separate Next.js app (the product, with its own middleware.ts).
// Without pinning the root, Turbopack walks UP to the repo root, treats it as
// the project root, and tries to compile the product's middleware.ts — which
// fails because this app's "@/" maps to ./src. Pin everything to this folder.
const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: here },
  outputFileTracingRoot: here,
};

export default nextConfig;
