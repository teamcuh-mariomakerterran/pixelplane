/**
 * D_Scope — Nested spatial hierarchy & overlap priority (Gemini 2026-08-04)
 *
 * 1. Child overrides parent: smallest containing cluster owns the asset
 * 2. Manual pin (explicit wire) beats spatial always
 * 3. Multi-touch: report all containing pads for UI dual-highlight
 */

import type { WireZone } from "@/lib/pixel/types";
import { centerOf, pointInRect, type SpatialRect } from "./scope";

export type OwnershipResult = {
  /** Winning zone under nested rules (null if none) */
  owner: WireZone | null;
  /** All zones whose rect contains the point (for dual-highlight) */
  overlapping: WireZone[];
  /** true if manual pin should override (caller supplies pin) */
  reason: "manual_pin" | "nested_smallest" | "none";
};

function area(z: SpatialRect) {
  return Math.max(1, z.w) * Math.max(1, z.h);
}

/** Zones that contain world point (center of asset), enabled only */
export function zonesContainingPoint(
  zones: WireZone[],
  px: number,
  py: number,
  pad = 0,
): WireZone[] {
  return zones.filter(
    (z) => z.enabled && pointInRect(px, py, { x: z.x, y: z.y, w: z.w, h: z.h }, pad),
  );
}

/**
 * Resolve owner: among containing zones, pick smallest area (child over parent).
 * If manualFolderId is set on the asset path, caller should pass manualZone match.
 */
export function resolveSpatialOwner(
  zones: WireZone[],
  px: number,
  py: number,
  opts?: {
    /** If asset has explicit folder pin, prefer zone wired to that folder */
    manualFolderId?: string | null;
    pad?: number;
  },
): OwnershipResult {
  const overlapping = zonesContainingPoint(zones, px, py, opts?.pad ?? 0);

  if (opts?.manualFolderId) {
    const pinned =
      zones.find((z) => z.folderId === opts.manualFolderId && z.enabled) ??
      overlapping.find((z) => z.folderId === opts.manualFolderId) ??
      null;
    if (pinned) {
      return { owner: pinned, overlapping, reason: "manual_pin" };
    }
  }

  if (!overlapping.length) {
    return { owner: null, overlapping: [], reason: "none" };
  }

  // Child overrides parent = smallest bounding pad
  const owner = [...overlapping].sort((a, b) => area(a) - area(b))[0] ?? null;
  return { owner, overlapping, reason: "nested_smallest" };
}

export function resolveOwnerForArtboard(
  zones: WireZone[],
  board: { x: number; y: number; width: number; height: number; folderId?: string | null },
) {
  const { cx, cy } = centerOf({ x: board.x, y: board.y, width: board.width, height: board.height });
  return resolveSpatialOwner(zones, cx, cy, { manualFolderId: board.folderId });
}

/** Soft pad for family clusters — still nested by hard rect first */
export function resolveWithSoftPad(
  zones: WireZone[],
  px: number,
  py: number,
  softPad: number,
) {
  const hard = resolveSpatialOwner(zones, px, py, { pad: 0 });
  if (hard.owner) return hard;
  return resolveSpatialOwner(zones, px, py, { pad: softPad });
}
