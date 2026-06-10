import type { ArmyList } from "./types";
import { base64ToBytes } from "./file";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Downloads the original army file: from the embedded base64 for local
 * campaigns, or via a signed Storage URL for cloud campaigns.
 */
export async function downloadArmyFile(list: ArmyList): Promise<void> {
  if (list.rawBase64) {
    const bytes = base64ToBytes(list.rawBase64);
    saveBlob(
      new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }),
      list.sourceFilename
    );
    return;
  }
  if (list.storagePath) {
    const { getSupabase } = await import("@/lib/supabase");
    const { data, error } = await getSupabase()
      .storage.from("army-files")
      .download(list.storagePath);
    if (error || !data) {
      window.alert("Could not download the army file.");
      return;
    }
    saveBlob(data, list.sourceFilename);
  }
}
