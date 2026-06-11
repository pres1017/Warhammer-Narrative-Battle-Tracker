"use client";

import { useMemo } from "react";
import { rngFromSeed } from "@/lib/generator/prng";

const TINTS = ["#cfd4e8", "#ffd9a0", "#a8c4ff", "#e8e8e8"];

/** Seeded decorative star dots behind the system; a few twinkle. */
export function Starfield({ seed, radius }: { seed: string; radius: number }) {
  const stars = useMemo(() => {
    const rng = rngFromSeed(`${seed}-starfield`);
    return Array.from({ length: 240 }, () => ({
      x: (rng() - 0.5) * radius * 2,
      y: (rng() - 0.5) * radius * 2,
      r: rng() * 1.2 + 0.2,
      o: 0.15 + rng() * 0.55,
      color: TINTS[Math.floor(rng() * TINTS.length)],
      twinkle: rng() < 0.25,
      delay: rng() * 6,
      duration: 2.5 + rng() * 4,
    }));
  }, [seed, radius]);

  return (
    <g>
      {stars.map((star, i) => (
        <circle
          key={i}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill={star.color}
          fillOpacity={star.o}
          className={star.twinkle ? "animate-twinkle" : undefined}
          style={
            star.twinkle
              ? {
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${star.duration}s`,
                }
              : undefined
          }
        />
      ))}
    </g>
  );
}
