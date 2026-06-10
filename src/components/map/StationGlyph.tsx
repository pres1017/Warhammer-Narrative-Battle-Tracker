"use client";

import type { Body } from "@/lib/types";
import { bodyPosition } from "./SystemMap";

interface StationGlyphProps {
  body: Body;
  selected: boolean;
  onSelect: (id: string) => void;
  showLabel: boolean;
  battleCount: number;
}

/** Free-floating station or point of interest (space hulk, rok, gate...). */
export function StationGlyph({
  body,
  selected,
  onSelect,
  showLabel,
  battleCount,
}: StationGlyphProps) {
  const { x, y } = bodyPosition(body);
  const s = body.visual.sizePx;
  const hostile = body.tags.includes("Hostile");

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(body.id);
      }}
    >
      {selected && (
        <circle
          r={s + 7}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          className="animate-pulse"
        />
      )}
      <g filter={selected ? "url(#body-glow)" : undefined}>
        {body.kind === "poi" ? (
          // Diamond glyph for points of interest.
          <path
            d={`M 0 ${-s} L ${s} 0 L 0 ${s} L ${-s} 0 Z`}
            fill={hostile ? "var(--danger)" : body.visual.palette[0]}
            stroke={body.visual.palette[1]}
            strokeWidth={1}
          />
        ) : (
          <rect
            x={-s}
            y={-s}
            width={s * 2}
            height={s * 2}
            transform="rotate(45)"
            fill={body.visual.palette[0]}
            stroke={body.visual.palette[1]}
            strokeWidth={1}
          />
        )}
      </g>
      {battleCount > 0 && (
        <g transform={`translate(${s + 4}, ${-s - 4})`}>
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
          y={s + 14}
          textAnchor="middle"
          className="pointer-events-none fill-muted font-mono text-[9px] tracking-wider"
        >
          {body.name}
        </text>
      )}
    </g>
  );
}
