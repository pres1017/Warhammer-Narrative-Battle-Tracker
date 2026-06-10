# Warhammer Battle Mapper

A collaborative campaign tracker for Warhammer 40,000 (11th edition) groups —
from three friends to an entire FLGS. Generate a contested star system,
gather your players, and chronicle every battle fought across it.

## Features

- **Seeded solar system generator** — tune planets, star type, danger level,
  and warp storm activity; re-roll until the omens please you, then lock the
  system in. The same seed and knobs always produce the same system.
- **Interactive orbital map** — pan/zoom SVG map with clickable planets,
  moons, asteroid belts, stations, and points of interest, each with
  40k-flavoured classifications and lore blurbs. Battle-count badges mark
  contested worlds.
- **Battle chronicle** — an always-visible sidebar lists battles in campaign
  order. Record factions, players, points, mission, victor, location, and
  narrative notes; drag to reorder the timeline; filter by title, faction,
  player, or planet.
- **Army list import** — attach the actual lists used: New Recruit `.json`,
  BattleScribe `.ros`, or `.rosz`. Parsed into an expandable roster
  (units, wargear, enhancements, points) with the original file kept for
  download.
- **Collaboration** — campaigns are shared via invite code or link; players
  join with just a display name (anonymous auth, no passwords). Changes sync
  to everyone in near-realtime.
- **Roles** — the creator (Warmaster) promotes moderators (Lieutenants);
  everyone can add battles and edit their own, mods can curate everything.
  Enforced server-side with Postgres row-level security.
- **Offline mode** — no backend configured? A single local campaign works
  entirely in your browser.

## Getting started

See [SETUP.md](SETUP.md) for local development, Supabase configuration, and
Vercel deployment.

```
npm install
npm run dev    # http://localhost:3000
npm test       # generator, ordering, and roster-parser tests
```

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres,
Realtime, anonymous auth, Storage) · d3-zoom · dnd-kit · fractional-indexing
· fast-xml-parser · fflate · Vitest
