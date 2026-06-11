import { describe, expect, it } from "vitest";
import type { Battle, Body, Participant } from "./types";
import { computeStats, winningParticipant } from "./stats";

let nextKey = 0;
function participant(patch: Partial<Participant>): Participant {
  return {
    key: `p${nextKey++}`,
    playerName: "",
    faction: "",
    points: null,
    armyListId: null,
    ...patch,
  };
}

function battle(patch: Partial<Battle>): Battle {
  return {
    id: crypto.randomUUID(),
    locationId: null,
    sortKey: "a0",
    title: "",
    mission: "",
    foughtAt: null,
    winner: "",
    participants: [],
    notes: "",
    scoreMode: "simple",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...patch,
  };
}

const ALICE = () =>
  participant({ playerName: "Alice", faction: "Ultramarines", vp: 80 });
const BOB = () =>
  participant({ playerName: "Bob", faction: "Death Guard", vp: 55 });

describe("winningParticipant", () => {
  it("matches winner by player name, case-insensitively", () => {
    const b = battle({ participants: [ALICE(), BOB()], winner: "alice" });
    expect(winningParticipant(b)?.playerName).toBe("Alice");
  });

  it("falls back to faction match", () => {
    const b = battle({ participants: [ALICE(), BOB()], winner: "Death Guard" });
    expect(winningParticipant(b)?.playerName).toBe("Bob");
  });

  it("returns null for unresolvable or missing winners", () => {
    expect(winningParticipant(battle({ participants: [ALICE(), BOB()] }))).toBeNull();
    const mirror = battle({
      participants: [
        participant({ playerName: "A", faction: "Orks" }),
        participant({ playerName: "B", faction: "Orks" }),
      ],
      winner: "Orks",
    });
    expect(winningParticipant(mirror)).toBeNull();
  });
});

describe("computeStats", () => {
  it("is safe on an empty campaign", () => {
    const stats = computeStats([], []);
    expect(stats.byPlayer).toEqual([]);
    expect(stats.byFaction).toEqual([]);
    expect(stats.contested).toEqual([]);
    expect(stats.holdings).toEqual([]);
  });

  it("tallies wins, points, and VP", () => {
    const battles = [
      battle({ participants: [ALICE(), BOB()], winner: "Alice" }),
      battle({ participants: [ALICE(), BOB()], winner: "Bob" }),
      battle({ participants: [ALICE(), BOB()], winner: "Alice" }),
    ];
    const stats = computeStats(battles, []);
    const alice = stats.byPlayer.find((r) => r.name === "Alice")!;
    const bob = stats.byPlayer.find((r) => r.name === "Bob")!;
    expect(alice).toMatchObject({
      games: 3,
      wins: 2,
      losses: 1,
      campaignPoints: 6,
      vpFor: 240,
      vpAgainst: 165,
      scoredGames: 3,
    });
    expect(bob).toMatchObject({ wins: 1, losses: 2, campaignPoints: 3 });
    // Sorted by campaign points.
    expect(stats.byPlayer[0].name).toBe("Alice");
    expect(stats.byFaction[0].name).toBe("Ultramarines");
  });

  it("battles without a resolvable winner count games but score nothing", () => {
    const stats = computeStats(
      [battle({ participants: [ALICE(), BOB()], winner: "a draw, honestly" })],
      []
    );
    const alice = stats.byPlayer.find((r) => r.name === "Alice")!;
    expect(alice.games).toBe(1);
    expect(alice.wins + alice.losses).toBe(0);
    expect(alice.campaignPoints).toBe(0);
  });

  it("counts contested worlds and holdings", () => {
    const bodies = [
      {
        id: "w1",
        kind: "planet",
        parentId: null,
        name: "Vorlag",
        classification: null,
        orbitIndex: 0,
        visual: {
          orbitRadius: 100,
          angle: 0,
          sizePx: 10,
          palette: ["#000", "#fff"],
          hasRings: false,
        },
        blurb: "",
        tags: [],
        controlledBy: "Ultramarines",
      },
    ] as Body[];
    const stats = computeStats(
      [battle({ locationId: "w1", participants: [ALICE(), BOB()] })],
      bodies
    );
    expect(stats.contested).toEqual([
      { bodyId: "w1", name: "Vorlag", battles: 1, controlledBy: "Ultramarines" },
    ]);
    expect(stats.holdings).toEqual([{ faction: "Ultramarines", worlds: 1 }]);
  });
});
