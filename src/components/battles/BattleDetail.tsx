"use client";

import { useEffect, useRef, useState } from "react";
import type { Battle, BattlePhoto, StarSystem } from "@/lib/types";
import type { ArmyList } from "@/lib/rosters/types";
import { downloadArmyFile } from "@/lib/rosters/download";
import { participantVp } from "@/lib/score";
import { RosterView } from "./RosterView";

interface BattleDetailProps {
  battle: Battle;
  system: StarSystem;
  armyLists: ArmyList[];
  index: number;
  canEdit: boolean;
  photos: BattlePhoto[];
  canDeletePhoto: (photo: BattlePhoto) => boolean;
  onAddPhoto: (file: File) => Promise<void>;
  onDeletePhoto: (photoId: string) => void;
  /** Resolves a photo to a displayable URL (signed URL or data URI). */
  photoSrc: (photo: BattlePhoto) => Promise<string>;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onFocusLocation?: (bodyId: string) => void;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function PhotoThumb({
  photo,
  photoSrc,
  onOpen,
}: {
  photo: BattlePhoto;
  photoSrc: (photo: BattlePhoto) => Promise<string>;
  onOpen: (src: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    photoSrc(photo)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photo, photoSrc]);

  if (!src) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded border border-border bg-surface-raised font-mono text-[9px] uppercase text-muted">
        …
      </div>
    );
  }
  return (
    <button onClick={() => onOpen(src)} className="group relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed/data URLs, not static assets */}
      <img
        src={src}
        alt={photo.caption || "Battle photo"}
        className="h-20 w-20 rounded border border-border object-cover transition-transform group-hover:scale-105"
      />
    </button>
  );
}

export function BattleDetail({
  battle,
  system,
  armyLists,
  index,
  canEdit,
  photos,
  canDeletePhoto,
  onAddPhoto,
  onDeletePhoto,
  photoSrc,
  onEdit,
  onDelete,
  onClose,
  onFocusLocation,
}: BattleDetailProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photos are limited to 8 MB.");
      return;
    }
    setUploading(true);
    setPhotoError(null);
    try {
      await onAddPhoto(file);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }
  const location = battle.locationId
    ? system.bodies.find((b) => b.id === battle.locationId)
    : null;

  return (
    <div className="gothic-panel flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Engagement {String(index + 1).padStart(2, "0")}
            {battle.foughtAt ? ` · ${battle.foughtAt}` : ""}
          </p>
          <h3 className="text-xl text-accent">
            {battle.title || "Untitled Engagement"}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close battle detail"
          className="rounded px-2 py-0.5 text-muted hover:bg-surface-raised hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {battle.mission && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Mission
            </dt>
            <dd>{battle.mission}</dd>
          </div>
        )}
        {location && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Location
            </dt>
            <dd>
              <button
                onClick={() => onFocusLocation?.(location.id)}
                className="text-accent underline-offset-2 hover:underline"
              >
                {location.name}
              </button>
            </dd>
          </div>
        )}
        {battle.winner && (
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Victor
            </dt>
            <dd className="text-accent">⚜ {battle.winner}</dd>
          </div>
        )}
      </dl>

      {battle.participants.length > 0 && (
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Combatants
          </h4>
          <table className="mt-1 w-full text-sm">
            <tbody>
              {battle.participants.map((p) => {
                const vp = participantVp(p, battle.scoreMode);
                return (
                  <tr key={p.key} className="border-t border-border/60">
                    <td className="py-1 pr-2">{p.playerName || "—"}</td>
                    <td className="py-1 pr-2 text-muted">{p.faction || "—"}</td>
                    <td className="py-1 pr-2 text-right font-mono text-muted">
                      {p.points !== null ? `${p.points} pts` : ""}
                    </td>
                    <td className="py-1 text-right font-mono">
                      {vp !== null && (
                        <span className="text-accent">
                          {vp} VP
                          {battle.scoreMode === "detailed" && (
                            <span className="ml-1 text-[11px] text-muted">
                              (P {p.vpPrimary ?? 0} · S {p.vpSecondary ?? 0})
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {battle.participants.map((p) => {
            const list = p.armyListId
              ? armyLists.find((l) => l.id === p.armyListId)
              : null;
            if (!list) return null;
            return (
              <details key={p.key} className="mt-2">
                <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-accent hover:underline">
                  ⚙ {p.playerName || p.faction} — army list
                </summary>
                <div className="mt-1">
                  <RosterView roster={list.roster} />
                  <button
                    onClick={() => void downloadArmyFile(list)}
                    className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted underline-offset-2 hover:text-accent hover:underline"
                  >
                    ⬇ Download {list.sourceFilename}
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      )}

      {battle.notes && (
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Chronicle
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm italic text-foreground/90">
            {battle.notes}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Pict-Captures · {photos.length}
          </h4>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-accent disabled:opacity-50"
          >
            {uploading ? "Transmitting…" : "+ Add Photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => void pickPhoto(e)}
            className="hidden"
          />
        </div>
        {photoError && <p className="mt-1 text-sm text-danger">{photoError}</p>}
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative">
                <PhotoThumb
                  photo={photo}
                  photoSrc={photoSrc}
                  onOpen={setLightbox}
                />
                {canDeletePhoto(photo) && (
                  <button
                    onClick={() => onDeletePhoto(photo.id)}
                    aria-label="Delete photo"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-[10px] text-muted hover:text-danger"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed/data URLs, not static assets */}
          <img
            src={lightbox}
            alt="Battle photo"
            className="max-h-full max-w-full rounded border border-border shadow-2xl"
          />
        </div>
      )}

      {canEdit && (
        <div className="mt-1 flex justify-end gap-3 border-t border-border pt-3">
          <button
            onClick={onDelete}
            className="rounded border border-danger/50 px-3 py-1.5 font-display text-sm text-danger hover:bg-danger/10"
          >
            Strike from Record
          </button>
          <button
            onClick={onEdit}
            className="rounded border border-accent-dim px-3 py-1.5 font-display text-sm text-accent hover:bg-surface-raised"
          >
            Amend
          </button>
        </div>
      )}
    </div>
  );
}
