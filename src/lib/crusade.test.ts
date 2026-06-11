import { describe, expect, it } from "vitest";
import { rankForXp, rankIndex } from "./crusade";

describe("rankForXp", () => {
  it("maps the Crusade XP thresholds", () => {
    expect(rankForXp(0)).toBe("Battle-ready");
    expect(rankForXp(5)).toBe("Battle-ready");
    expect(rankForXp(6)).toBe("Blooded");
    expect(rankForXp(15)).toBe("Blooded");
    expect(rankForXp(16)).toBe("Battle-hardened");
    expect(rankForXp(30)).toBe("Battle-hardened");
    expect(rankForXp(31)).toBe("Heroic");
    expect(rankForXp(50)).toBe("Heroic");
    expect(rankForXp(51)).toBe("Legendary");
    expect(rankForXp(999)).toBe("Legendary");
  });

  it("rankIndex matches rankForXp boundaries", () => {
    for (const xp of [0, 5, 6, 15, 16, 30, 31, 50, 51]) {
      const names = [
        "Battle-ready",
        "Blooded",
        "Battle-hardened",
        "Heroic",
        "Legendary",
      ];
      expect(names[rankIndex(xp)]).toBe(rankForXp(xp));
    }
  });
});
