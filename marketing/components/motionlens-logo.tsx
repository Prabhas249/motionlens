"use client";

import { motion } from "motion/react";

/**
 * MotionLens mark — a camera-style focus frame that "locks on" (the corners
 * breathe inward) with a moving dot inside (the motion trail). Uses
 * currentColor, so it inherits text color from its parent.
 */
export function MotionLensLogo({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  const corners = [
    "M4 9 V6 A2 2 0 0 1 6 4 H9",
    "M15 4 H18 A2 2 0 0 1 20 6 V9",
    "M20 15 V18 A2 2 0 0 1 18 20 H15",
    "M9 20 H6 A2 2 0 0 1 4 18 V15",
  ];

  const loop = { duration: 2.6, repeat: Infinity, ease: "easeInOut" } as const;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* focus frame that locks on */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={animated ? { scale: [1.07, 1, 1.07] } : undefined}
        transition={loop}
      >
        {corners.map((d) => (
          <path key={d} d={d} />
        ))}
      </motion.g>

      {/* motion-trail echo */}
      {animated && (
        <motion.circle
          cy="12"
          r="1.5"
          fill="currentColor"
          stroke="none"
          opacity={0.3}
          initial={{ cx: 12 }}
          animate={{ cx: [10.3, 13.7, 10.3] }}
          transition={{ ...loop, delay: 0.16 }}
        />
      )}

      {/* the dot inside the frame */}
      <motion.circle
        cy="12"
        r="1.6"
        fill="currentColor"
        stroke="none"
        initial={{ cx: 12 }}
        animate={animated ? { cx: [10.3, 13.7, 10.3] } : { cx: 12 }}
        transition={loop}
      />
    </svg>
  );
}
