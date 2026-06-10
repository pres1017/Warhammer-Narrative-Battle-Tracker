export type RosterFormat = "newrecruit_json" | "ros" | "rosz";

export interface RosterUnit {
  name: string;
  modelCount: number;
  points: number | null;
  wargear: string[];
  enhancements: string[];
}

export interface NormalizedRoster {
  /** Roster name as exported ("Death Guard 2k ..."). */
  name: string;
  /** Catalogue/faction name ("Chaos - Death Guard"). */
  faction: string;
  detachment: string;
  totalPoints: number | null;
  units: RosterUnit[];
  /** Non-fatal parse issues, surfaced in the UI. */
  warnings: string[];
}

export interface ParsedRosterFile {
  format: RosterFormat;
  roster: NormalizedRoster;
}

/** An imported army list attached to a battle participant. */
export interface ArmyList {
  id: string;
  battleId: string | null;
  participantKey: string;
  format: RosterFormat;
  sourceFilename: string;
  roster: NormalizedRoster;
}
