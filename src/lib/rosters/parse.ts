import { XMLParser } from "fast-xml-parser";
import { unzipSync } from "fflate";
import { normalizeRoster } from "./normalize";
import type { NormalizedRoster, ParsedRosterFile, RosterFormat } from "./types";

function failed(format: RosterFormat, message: string): ParsedRosterFile {
  const roster: NormalizedRoster = {
    name: "",
    faction: "Unknown faction",
    detachment: "",
    totalPoints: null,
    units: [],
    warnings: [message],
  };
  return { format, roster };
}

const XML_LIST_TAGS = new Set([
  "force",
  "selection",
  "cost",
  "category",
  "profile",
  "rule",
  "characteristic",
]);

function parseRos(text: string): unknown {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: false,
    isArray: (tagName) => XML_LIST_TAGS.has(tagName),
  });
  const doc = parser.parse(text) as Record<string, unknown>;
  return doc.roster;
}

function decode(data: Uint8Array): string {
  return new TextDecoder("utf-8").decode(data);
}

/**
 * Parses an army list export. Never throws: unreadable files come back as an
 * empty roster with a warning describing the problem.
 */
export function parseRosterFile(
  filename: string,
  data: Uint8Array
): ParsedRosterFile {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (ext === "json") {
    try {
      const doc = JSON.parse(decode(data)) as Record<string, unknown>;
      if (!doc || typeof doc !== "object" || !("roster" in doc)) {
        return failed(
          "newrecruit_json",
          "JSON file does not look like a roster export (no top-level \"roster\")."
        );
      }
      return { format: "newrecruit_json", roster: normalizeRoster(doc.roster) };
    } catch {
      return failed("newrecruit_json", "Could not parse the JSON file.");
    }
  }

  if (ext === "ros") {
    try {
      const roster = parseRos(decode(data));
      if (!roster) {
        return failed("ros", "XML file has no <roster> element.");
      }
      return { format: "ros", roster: normalizeRoster(roster) };
    } catch {
      return failed("ros", "Could not parse the .ros XML file.");
    }
  }

  if (ext === "rosz") {
    try {
      const entries = unzipSync(data);
      const rosEntry =
        Object.keys(entries).find((name) =>
          name.toLowerCase().endsWith(".ros")
        ) ?? Object.keys(entries)[0];
      if (!rosEntry) {
        return failed("rosz", "The .rosz archive is empty.");
      }
      const roster = parseRos(decode(entries[rosEntry]));
      if (!roster) {
        return failed("rosz", "The .rosz archive contains no <roster>.");
      }
      return { format: "rosz", roster: normalizeRoster(roster) };
    } catch {
      return failed("rosz", "Could not unzip or parse the .rosz file.");
    }
  }

  return failed(
    "ros",
    `Unsupported file type ".${ext}" — expected .json, .ros, or .rosz.`
  );
}
