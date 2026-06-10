import { describe, expect, it } from "vitest";
import type { Battle } from "./types";
import { keyForAppend, keyForMove, sortBattles } from "./ordering";

function makeBattle(id: string, sortKey: string): Battle {
  return {
    id,
    locationId: null,
    sortKey,
    title: id,
    mission: "",
    foughtAt: null,
    winner: "",
    participants: [],
    notes: "",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

describe("ordering", () => {
  it("appends after the last battle", () => {
    const battles: Battle[] = [];
    for (let i = 0; i < 10; i++) {
      battles.push(makeBattle(`b${i}`, keyForAppend(battles)));
    }
    const order = sortBattles(battles).map((b) => b.id);
    expect(order).toEqual(battles.map((b) => b.id));
  });

  it("moves to the head of the list", () => {
    const battles = ["a", "b", "c"].reduce<Battle[]>((acc, id) => {
      acc.push(makeBattle(id, keyForAppend(acc)));
      return acc;
    }, []);
    const key = keyForMove(battles, "c", 0);
    battles[2] = { ...battles[2], sortKey: key };
    expect(sortBattles(battles).map((b) => b.id)).toEqual(["c", "a", "b"]);
  });

  it("moves to an arbitrary middle position", () => {
    const battles = ["a", "b", "c", "d"].reduce<Battle[]>((acc, id) => {
      acc.push(makeBattle(id, keyForAppend(acc)));
      return acc;
    }, []);
    const key = keyForMove(battles, "a", 2);
    battles[0] = { ...battles[0], sortKey: key };
    expect(sortBattles(battles).map((b) => b.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("repeated adjacent reorders do not explode key length", () => {
    const battles = ["a", "b", "c"].reduce<Battle[]>((acc, id) => {
      acc.push(makeBattle(id, keyForAppend(acc)));
      return acc;
    }, []);
    // Swap the first two battles back and forth 200 times.
    for (let i = 0; i < 200; i++) {
      const sorted = sortBattles(battles);
      const mover = sorted[1];
      const key = keyForMove(battles, mover.id, 0);
      const idx = battles.findIndex((b) => b.id === mover.id);
      battles[idx] = { ...mover, sortKey: key };
    }
    const maxLen = Math.max(...battles.map((b) => b.sortKey.length));
    expect(maxLen).toBeLessThan(110);
    expect(new Set(battles.map((b) => b.sortKey)).size).toBe(3);
  });

  it("clamps out-of-range target indexes", () => {
    const battles = ["a", "b"].reduce<Battle[]>((acc, id) => {
      acc.push(makeBattle(id, keyForAppend(acc)));
      return acc;
    }, []);
    expect(() => keyForMove(battles, "a", 99)).not.toThrow();
    expect(() => keyForMove(battles, "a", -5)).not.toThrow();
  });
});
