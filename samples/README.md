# Army List Samples

Drop example army-list exports here. They are used as test fixtures for the
roster parsers (`src/lib/rosters/`), so the more variety the better:

- `.json` — New Recruit JSON export
- `.ros` — BattleScribe / New Recruit roster XML export
- `.rosz` — zipped `.ros`

Any filename is fine; the parser tests pick up every file in this folder
automatically. Ideally include lists from a couple of different factions and
at least one with enhancements/wargear options.
