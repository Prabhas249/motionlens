import type React from "react";

// MotionLens brand mark — cobalt focus-frame chip (matches the landing navbar + favicon).
export const LogoIcon = (props: React.ComponentProps<"svg">) => (
	<svg viewBox="0 0 24 24" fill="none" {...props}>
		<rect width="24" height="24" rx="6" fill="#2A48F0" />
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
);

export const Logo = LogoIcon;
