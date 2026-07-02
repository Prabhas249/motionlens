import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MotionLens — turn UI animations into AI-ready Motion Blueprints";

// The link-preview card for every route (X / LinkedIn / Slack / Discord).
// Dark canvas + cobalt brand chip + the one-line pitch.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0A0A0C 0%, #101018 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(42,72,240,0.35) 0%, rgba(42,72,240,0) 70%)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#2A48F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10V8a1 1 0 0 1 1-1h2" />
                <path d="M14 7h2a1 1 0 0 1 1 1v2" />
                <path d="M17 14v2a1 1 0 0 1-1 1h-2" />
                <path d="M10 17H8a1 1 0 0 1-1-1v-2" />
              </g>
              <circle cx="12" cy="12" r="1.3" fill="#fff" />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, display: "flex" }}>MotionLens</div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -2,
            maxWidth: 950,
            display: "flex",
          }}
        >
          Give your AI agent eyes for motion.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "rgba(255,255,255,0.65)",
            maxWidth: 900,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          Any UI animation → an exact Motion Blueprint: timings, easing, choreography, and
          ready-to-paste code.
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 24,
            color: "#7B93FF",
            display: "flex",
            fontFamily: "monospace",
          }}
        >
          motionlens.dev
        </div>
      </div>
    ),
    size,
  );
}
