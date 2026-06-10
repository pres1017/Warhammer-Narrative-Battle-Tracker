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
}

export function bodyPosition(body: Body): { x: number; y: number } {
  return {
    x: Math.cos(body.visual.angle) * body.visual.orbitRadius,
    y: Math.sin(body.visual.angle) * body.visual.orbitRadius,
  };
}

export const SystemMap = forwardRef<SystemMapHandle, SystemMapProps>(
  function SystemMap({ system, selectedBodyId, onSelectBody, battleCounts }, ref) {
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

    const maxOrbit = Math.max(
      ...system.bodies.map((b) => b.visual.orbitRadius),
      200
    );

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
          <filter id="body-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g ref={worldRef}>
          <Starfield seed={system.seed} radius={maxOrbit + 250} />

          {/* Warp storm overlay */}
          {system.warpStormIntensity > 0 && (
            <circle
              r={maxOrbit + 120}
              fill="none"
              stroke="var(--eldritch)"
              strokeWidth={30 * system.warpStormIntensity}
              strokeOpacity={0.12 * system.warpStormIntensity}
              strokeDasharray="160 70"
            />
          )}

          {/* Orbit rings */}
          {[...planets, ...freeStations].map((b) => (
            <circle
              key={`orbit-${b.id}`}
              r={b.visual.orbitRadius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="4 6"
            />
          ))}

          {belts.map((belt) => (
            <BeltRing key={belt.id} belt={belt} seed={system.seed} />
          ))}

          {/* Star */}
          <g>
            <circle r={system.star.radiusPx * 3} fill="url(#star-glow)" />
            <circle r={system.star.radiusPx} fill={system.star.color} />
            {showLabels && (
              <text
                y={system.star.radiusPx + 18}
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
            />
          ))}
        </g>
      </svg>
    );
  }
);
