"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { motion, stagger, useAnimate, useInView } from "motion/react";

const TextReveal = ({
  text,
  className,
  filter = true,
  duration = 0.5,
  staggerDelay = 0.2,
}: {
  text: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  staggerDelay?: number;
}) => {
  const [scope, animate] = useAnimate();
  const inView = useInView(scope, { once: true, margin: "-80px" });
  const [forced, setForced] = useState(false);
  const textArray = text.split(" ");

  // Safety net: never let the heading stay invisible if the observer misses.
  useEffect(() => {
    const t = setTimeout(() => setForced(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!inView && !forced) return;
    animate(
      "span",
      {
        opacity: 1,
        filter: filter ? "blur(0px)" : "none",
      },
      {
        duration: duration,
        delay: stagger(staggerDelay),
        ease: "easeOut",
      },
    );
  }, [animate, inView, forced, duration, filter, staggerDelay]);

  return (
    <div className={cn("leading-normal", className)}>
      <motion.div ref={scope}>
        {textArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className="inline-block"
              style={{
                filter: filter ? "blur(8px)" : "none",
                marginRight: "0.28em",
                opacity: 0,
              }}
            >
              {word}
            </motion.span>
          );
        })}
      </motion.div>
    </div>
  );
};

export default TextReveal;
