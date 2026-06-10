"use client";

import { useMemo } from "react";
import { rngFromSeed } from "@/lib/generator/prng";

/** Seeded decorative star dots behind the system. */
export function Starfield({ seed, radius }: { seed: string; radius: number }) {
  const stars = useMemo(() => {
    const rng = rngFromSeed(`${seed}-starfield`);
    return Array.from({ length: 220 }, () => ({
      x: (rng() - 0.5) * radius * 2,
      y: (rng() - 0.5) * radius * 2,
      r: rng() * 1.2 + 0.2,
      o: 0.15 + rng() * 0.55,
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
          fill="#cfd4e8"
          fillOpacity={star.o}
        />
      ))}
    </g>
  );
}
