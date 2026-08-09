/**
 * D_Hitbox — drag-draw boxes + onion ghost propagation (Gemini slice 1).
 */

import { uid } from "@/lib/utils";
import type { CollisionBox, CollisionBoxKind } from "./types";

/** Ghost prior-frame boxes onto current frame for onion-skin editing */
export function ghostBoxesForFrame(
  boxes: CollisionBox[],
  frameIndex: number,
): CollisionBox[] {
  if (frameIndex <= 0) return [];
  return boxes
    .filter((b) => b.frameIndex === frameIndex - 1)
    .map((b) => ({
      ...b,
      id: `ghost_${b.id}`,
      // tag as ghost via eventTag for render
      eventTag: b.eventTag ? `ghost:${b.eventTag}` : "ghost",
    }));
}

/** One-click: copy boxes from frame 0 (or source) to every frame in strip */
export function applyBoxesToAllFrames(
  boxes: CollisionBox[],
  frameCount: number,
  opts?: { kind?: CollisionBoxKind; sourceFrame?: number },
): CollisionBox[] {
  const src = opts?.sourceFrame ?? 0;
  const seed = boxes.filter(
    (b) => b.frameIndex === src && (!opts?.kind || b.kind === opts.kind),
  );
  if (!seed.length || frameCount < 1) return boxes;

  // keep other frames' non-matching kinds; replace target kind across frames
  const kinds = new Set(seed.map((s) => s.kind));
  const kept = boxes.filter(
    (b) => b.frameIndex === src || !kinds.has(b.kind),
  );
  const out = [...kept];
  for (let f = 0; f < frameCount; f++) {
    if (f === src) continue;
    // remove existing of these kinds on frame f
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i]!.frameIndex === f && kinds.has(out[i]!.kind)) out.splice(i, 1);
    }
    for (const s of seed) {
      out.push({
        ...s,
        id: uid("col"),
        frameIndex: f,
      });
    }
  }
  return out;
}

/** Propagate box from current frame to next only (soft ghost commit) */
export function propagateToNextFrame(
  boxes: CollisionBox[],
  frameIndex: number,
  frameCount: number,
): CollisionBox[] {
  const next = frameIndex + 1;
  if (next >= frameCount) return boxes;
  const src = boxes.filter((b) => b.frameIndex === frameIndex);
  const withoutNextDup = boxes.filter((b) => b.frameIndex !== next);
  const copies = src.map((s) => ({
    ...s,
    id: uid("col"),
    frameIndex: next,
  }));
  return [...withoutNextDup, ...copies];
}
