"use client";

import type { Body } from "@/lib/types";
import { factionColor } from "@/lib/factions";
import { bodyPosition } from "./SystemMap";

interface StationGlyphProps {
  body: Body;
  selected: boolean;
  onSelect: (id: string) => void;
  showLabel: boolean;
  battleCount: number;
  /** Pulsed when this body's battles match the sidebar filter. */
  highlighted?: boolean;
  /** Faction holding this body (territory control), if any. */
  controlledBy?: string;
}

/** Free-floating station or point of interest (space hulk, rok, gate...). */
export function StationGlyph({
  body,
  selected,
  onSelect,
  showLabel,
  battleCount,
  highlighted,
  controlledBy,
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
      {controlledBy && (
        <circle
          r={s + 4}
          fill="none"
          stroke={factionColor(controlledBy)}
          strokeWidth={1.5}
          strokeOpacity={0.85}
        />
      )}
      {highlighted && !selected && (
        <circle
          r={s + 9}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeDasharray="7 5"
          className="animate-pulse"
        />
      )}
      {hostile && !selected && (
        <circle
          r={s + 5}
          fill="none"
          stroke="var(--danger)"
          strokeOpacity={0.4}
          strokeWidth={1}
          strokeDasharray="3 4"
          className="animate-pulse"
        />
      )}
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
          <circle r={7} fill="var(--danger)" stroke="#000" strokeOpacity={0.4} />
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
          paintOrder="stroke"
          stroke="var(--background)"
          strokeWidth={3}
          className={`pointer-events-none font-mono text-[9px] tracking-wider ${
            highlighted ? "fill-accent" : "fill-muted"
          }`}
        >
          {body.name}
        </text>
      )}
    </g>
  );
}
