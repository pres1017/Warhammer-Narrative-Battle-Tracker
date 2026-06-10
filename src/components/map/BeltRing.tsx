"use client";

import { useMemo } from "react";
import type { Body } from "@/lib/types";
import { rngFromSeed } from "@/lib/generator/prng";

export function BeltRing({ belt, seed }: { belt: Body; seed: string }) {
  const rocks = useMemo(() => {
    const rng = rngFromSeed(`${seed}-${belt.id}`);
    const count = 90;
    return Array.from({ length: count }, () => {
      const angle = rng() * Math.PI * 2;
      const radius = belt.visual.orbitRadius + (rng() - 0.5) * 22;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        r: 0.6 + rng() * 1.6,
        o: 0.3 + rng() * 0.5,
      };
    });
  }, [belt, seed]);

  return (
    <g>
      {rocks.map((rock, i) => (
        <circle
          key={i}
          cx={rock.x}
          cy={rock.y}
          r={rock.r}
          fill={belt.visual.palette[0]}
          fillOpacity={rock.o}
        />
      ))}
    </g>
  );
}
