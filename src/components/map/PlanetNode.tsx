"use client";

import type { Body } from "@/lib/types";
import { bodyPosition } from "./SystemMap";

interface PlanetNodeProps {
  planet: Body;
  moons: Body[];
  stations: Body[];
  selectedBodyId: string | null;
  onSelect: (id: string) => void;
  showLabel: boolean;
  battleCount: number;
}

export function PlanetNode({
  planet,
  moons,
  stations,
  selectedBodyId,
  onSelect,
  showLabel,
  battleCount,
}: PlanetNodeProps) {
  const { x, y } = bodyPosition(planet);
  const r = planet.visual.sizePx;
  const [base, highlight] = planet.visual.palette;
  const gradientId = `planet-${planet.id}`;
  const selected = selectedBodyId === planet.id;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="35%">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="100%" stopColor={base} />
        </radialGradient>
      </defs>

      {selected && (
        <circle
          r={r + 8}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          className="animate-pulse"
        />
      )}

      <g
        className="cursor-pointer"
        filter={selected ? "url(#body-glow)" : undefined}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(planet.id);
        }}
      >
        <circle r={r} fill={`url(#${gradientId})`} />
        {planet.visual.hasRings && (
          <ellipse
            rx={r * 1.8}
            ry={r * 0.5}
            fill="none"
            stroke={highlight}
            strokeOpacity={0.5}
            strokeWidth={1.5}
            transform="rotate(-20)"
          />
        )}
      </g>

      {moons.map((moon, i) => {
        const moonAngle = moon.visual.angle;
        const moonDist = r + 9 + i * 7;
        return (
          <g
            key={moon.id}
            className="cursor-pointer"
            transform={`translate(${Math.cos(moonAngle) * moonDist}, ${Math.sin(moonAngle) * moonDist})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(moon.id);
            }}
          >
            {selectedBodyId === moon.id && (
              <circle r={moon.visual.sizePx + 3} fill="none" stroke="var(--accent)" strokeWidth={1} />
            )}
            <circle r={moon.visual.sizePx} fill={moon.visual.palette[0]} />
          </g>
        );
      })}

      {stations.map((station, i) => {
        const angle = station.visual.angle;
        const dist = r + 14 + (moons.length + i) * 7;
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist;
        return (
          <g
            key={station.id}
            className="cursor-pointer"
            transform={`translate(${sx}, ${sy}) rotate(45)`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(station.id);
            }}
          >
            {selectedBodyId === station.id && (
              <rect
                x={-station.visual.sizePx - 3}
                y={-station.visual.sizePx - 3}
                width={(station.visual.sizePx + 3) * 2}
                height={(station.visual.sizePx + 3) * 2}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={1}
              />
            )}
            <rect
              x={-station.visual.sizePx}
              y={-station.visual.sizePx}
              width={station.visual.sizePx * 2}
              height={station.visual.sizePx * 2}
              fill={station.visual.palette[0]}
              stroke={station.visual.palette[1]}
              strokeWidth={1}
            />
          </g>
        );
      })}

      {battleCount > 0 && (
        <g transform={`translate(${r * 0.9}, ${-r * 0.9})`}>
          <circle r={7} fill="var(--danger)" />
          <text
            textAnchor="middle"
            dy="3.5"
            className="fill-white font-mono text-[9px] font-bold"
          >
            {battleCount}
          </text>
        </g>
      )}

      {showLabel && (
        <text
          y={r + 16}
          textAnchor="middle"
          className="pointer-events-none fill-foreground font-mono text-[10px] tracking-wider"
        >
          {planet.name}
        </text>
      )}
    </g>
  );
}
