"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { Body, StarSystem } from "@/lib/types";
import { rngFromSeed } from "@/lib/generator/prng";
import { PlanetNode } from "./PlanetNode";
import { BeltRing } from "./BeltRing";
import { StationGlyph } from "./StationGlyph";
import { Starfield } from "./Starfield";

export interface SystemMapHandle {
  zoomToBody: (bodyId: string) => void;
}

interface SystemMapProps {
  system: StarSystem;
  selectedBodyId: string | null;
  onSelectBody: (bodyId: string | null) => void;
  /** Battles fought per body id, shown as a badge. */
  battleCounts?: Record<string, number>;
  /** Bodies whose battles match the sidebar filter; pulsed gold on the map. */
  highlightedIds?: Set<string> | null;
  /** When true, bodies render faction control rings. */
  territoryEnabled?: boolean;
}

export function bodyPosition(body: Body): { x: number; y: number } {
  return {
    x: Math.cos(body.visual.angle) * body.visual.orbitRadius,
    y: Math.sin(body.visual.angle) * body.visual.orbitRadius,
  };
}

export const SystemMap = forwardRef<SystemMapHandle, SystemMapProps>(
  function SystemMap(
    {
      system,
      selectedBodyId,
      onSelectBody,
      battleCounts,
      highlightedIds,
      territoryEnabled,
    },
    ref
  ) {
    const svgRef = useRef<SVGSVGElement>(null);
    const worldRef = useRef<SVGGElement>(null);
    const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [showLabels, setShowLabels] = useState(true);

    const planets = useMemo(
      () => system.bodies.filter((b) => b.kind === "planet"),
      [system]
    );
    const belts = useMemo(
      () => system.bodies.filter((b) => b.kind === "belt"),
      [system]
    );
    const freeStations = useMemo(
      () =>
        system.bodies.filter(
          (b) => (b.kind === "station" || b.kind === "poi") && !b.parentId
        ),
      [system]
    );
    const childrenOf = useMemo(() => {
      const map = new Map<string, Body[]>();
      for (const b of system.bodies) {
        if (!b.parentId) continue;
        const list = map.get(b.parentId) ?? [];
        list.push(b);
        map.set(b.parentId, list);
      }
      return map;
    }, [system]);

    const maxOrbit = Math.max(
      ...system.bodies.map((b) => b.visual.orbitRadius),
      200
    );

    // Seeded nebula clouds drifting behind the system.
    const nebulae = useMemo(() => {
      const rng = rngFromSeed(`${system.seed}-nebulae`);
      return Array.from({ length: 4 }, (_, i) => ({
        x: (rng() - 0.5) * maxOrbit * 2.2,
        y: (rng() - 0.5) * maxOrbit * 2.2,
        rx: maxOrbit * (0.5 + rng() * 0.6),
        ry: maxOrbit * (0.3 + rng() * 0.45),
        rotate: rng() * 180,
        warp: i % 2 === 0,
        opacity: 0.35 + rng() * 0.3,
      }));
    }, [system.seed, maxOrbit]);

    useEffect(() => {
      const svg = svgRef.current;
      const world = worldRef.current;
      if (!svg || !world) return;

      const behavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.4, 6])
        .on("zoom", (event) => {
          // Write the transform straight to the DOM; React never re-renders
          // during pan/zoom frames.
          world.setAttribute("transform", event.transform.toString());
          setShowLabels((prev) => {
            const next = event.transform.k >= 0.7;
            return next === prev ? prev : next;
          });
        });

      zoomRef.current = behavior;
      const selection = select(svg);
      selection.call(behavior);
      // Start centered on the star.
      const { width, height } = svg.getBoundingClientRect();
      selection.call(
        behavior.transform,
        zoomIdentity.translate(width / 2, height / 2)
      );
      return () => {
        selection.on(".zoom", null);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      zoomToBody(bodyId: string) {
        const svg = svgRef.current;
        const behavior = zoomRef.current;
        const body = system.bodies.find((b) => b.id === bodyId);
        if (!svg || !behavior || !body) return;
        const target = body.parentId
          ? system.bodies.find((b) => b.id === body.parentId) ?? body
          : body;
        const { x, y } = bodyPosition(target);
        const { width, height } = svg.getBoundingClientRect();
        const k = 2;
        select(svg)
          .transition()
          .duration(600)
          .call(
            behavior.transform,
            zoomIdentity.translate(width / 2 - x * k, height / 2 - y * k).scale(k)
          );
      },
    }));

    const starR = system.star.radiusPx;

    return (
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        onClick={() => onSelectBody(null)}
        role="img"
        aria-label={`Map of the ${system.star.name} system`}
      >
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0%" stopColor={system.star.color} stopOpacity="0.9" />
            <stop offset="40%" stopColor={system.star.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={system.star.color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="star-core" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="55%" stopColor={system.star.color} />
            <stop offset="100%" stopColor={system.star.color} stopOpacity="0.85" />
          </radialGradient>
          <radialGradient id="nebula-warp">
            <stop offset="0%" stopColor="var(--eldritch)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--eldritch)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nebula-dust">
            <stop offset="0%" stopColor="#2c3a6e" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#2c3a6e" stopOpacity="0" />
          </radialGradient>
          <filter id="body-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g ref={worldRef}>
          {nebulae.map((n, i) => (
            <ellipse
              key={`nebula-${i}`}
              cx={n.x}
              cy={n.y}
              rx={n.rx}
              ry={n.ry}
              transform={`rotate(${n.rotate} ${n.x} ${n.y})`}
              fill={n.warp ? "url(#nebula-warp)" : "url(#nebula-dust)"}
              opacity={n.opacity}
            />
          ))}

          <Starfield seed={system.seed} radius={maxOrbit + 250} />

          {/* Warp storm overlay: slow counter-rotating rings of unreality */}
          {system.warpStormIntensity > 0 && (
            <g>
              {Array.from({ length: system.warpStormIntensity }, (_, i) => (
                <circle
                  key={i}
                  r={maxOrbit + 90 + i * 45}
                  fill="none"
                  stroke="var(--eldritch)"
                  strokeWidth={18 + 8 * system.warpStormIntensity}
                  strokeOpacity={0.10 + 0.04 * system.warpStormIntensity}
                  strokeDasharray="140 90"
                  className="animate-spin-slower"
                  style={{
                    transformOrigin: "0px 0px",
                    animationDuration: `${240 + i * 90}s`,
                    animationDirection: i % 2 ? "reverse" : "normal",
                  }}
                />
              ))}
            </g>
          )}

          {/* Orbit rings */}
          {[...planets, ...freeStations].map((b) => (
            <circle
              key={`orbit-${b.id}`}
              r={b.visual.orbitRadius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
              strokeOpacity={0.85}
              strokeDasharray="3 7"
              strokeLinecap="round"
            />
          ))}

          {belts.map((belt) => (
            <BeltRing
              key={belt.id}
              belt={belt}
              seed={system.seed}
              highlighted={highlightedIds?.has(belt.id) ?? false}
            />
          ))}

          {/* Star: corona rays, layered glow, white-hot core */}
          <g>
            <circle r={starR * 4} fill="url(#star-glow)" />
            <g
              className="animate-spin-slower"
              style={{ transformOrigin: "0px 0px" }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <path
                  key={i}
                  d={`M 0 ${-starR * 0.18} L ${starR * (i % 2 ? 3.4 : 4.6)} 0 L 0 ${starR * 0.18} Z`}
                  transform={`rotate(${i * 30})`}
                  fill={system.star.color}
                  opacity={0.07}
                />
              ))}
            </g>
            <circle r={starR * 1.25} fill={system.star.color} opacity={0.35} />
            <circle r={starR} fill="url(#star-core)" />
            {showLabels && (
              <text
                y={starR + 20}
                textAnchor="middle"
                className="fill-muted font-mono text-[11px] uppercase tracking-widest"
              >
                {system.star.name}
              </text>
            )}
          </g>

          {planets.map((planet) => (
            <PlanetNode
              key={planet.id}
              planet={planet}
              moons={(childrenOf.get(planet.id) ?? []).filter(
                (b) => b.kind === "moon"
              )}
              stations={(childrenOf.get(planet.id) ?? []).filter(
                (b) => b.kind === "station"
              )}
              selectedBodyId={selectedBodyId}
              onSelect={onSelectBody}
              showLabel={showLabels}
              battleCount={battleCounts?.[planet.id] ?? 0}
              highlighted={highlightedIds?.has(planet.id) ?? false}
              controlledBy={territoryEnabled ? planet.controlledBy : undefined}
            />
          ))}

          {freeStations.map((station) => (
            <StationGlyph
              key={station.id}
              body={station}
              selected={selectedBodyId === station.id}
              onSelect={onSelectBody}
              showLabel={showLabels}
              battleCount={battleCounts?.[station.id] ?? 0}
              highlighted={highlightedIds?.has(station.id) ?? false}
              controlledBy={
                territoryEnabled ? station.controlledBy : undefined
              }
            />
          ))}
        </g>
      </svg>
    );
  }
);
