import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// PNG render of the brand mark (components/logo.tsx) — iOS ignores SVG favicons.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2A48F0",
          borderRadius: 40,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
          <g
            stroke="#fff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 10V8a1 1 0 0 1 1-1h2" />
            <path d="M14 7h2a1 1 0 0 1 1 1v2" />
            <path d="M17 14v2a1 1 0 0 1-1 1h-2" />
            <path d="M10 17H8a1 1 0 0 1-1-1v-2" />
          </g>
          <circle cx="12" cy="12" r="1.3" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
