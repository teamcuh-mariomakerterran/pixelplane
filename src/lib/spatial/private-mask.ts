/**
 * A3 — Private Mask / Layer Bubble
 * Temporary (or sticky) rectangles: hide from peers, doodle space, observer-ok.
 */

import { uid } from "@/lib/utils";

export type MaskMode =
  | "private" // only you see contents under/near mask chrome
  | "witness" // peers see dim silhouette, can't edit through
  | "focus"; // dims everything outside (solo focus bubble)

export type PrivateMask = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  mode: MaskMode;
  /** owner display / peer id */
  ownerId: string;
  ownerName: string;
  color: string;
  createdAt: number;
  /** if set, auto-remove after ms (ADHD doodle bubble) */
  expiresAt?: number | null;
};

export function createMask(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  mode?: MaskMode;
  ownerId?: string;
  ownerName?: string;
  name?: string;
  ttlMs?: number | null;
}): PrivateMask {
  const now = Date.now();
  return {
    id: uid("mask"),
    name: opts.name ?? (opts.mode === "focus" ? "Focus bubble" : "Private bubble"),
    x: opts.x,
    y: opts.y,
    w: Math.max(32, opts.w),
    h: Math.max(32, opts.h),
    mode: opts.mode ?? "private",
    ownerId: opts.ownerId ?? "local",
    ownerName: opts.ownerName ?? "You",
    color:
      opts.mode === "witness" ? "#a78bfa" : opts.mode === "focus" ? "#e8a838" : "#38bdf8",
    createdAt: now,
    expiresAt: opts.ttlMs ? now + opts.ttlMs : null,
  };
}

export function pruneExpired(masks: PrivateMask[], now = Date.now()): PrivateMask[] {
  return masks.filter((m) => !m.expiresAt || m.expiresAt > now);
}

export function pointInMask(m: PrivateMask, px: number, py: number) {
  return px >= m.x && py >= m.y && px <= m.x + m.w && py <= m.y + m.h;
}

/** True if this client should hide artboard pixels under a foreign private mask */
export function isOccludedForViewer(
  masks: PrivateMask[],
  px: number,
  py: number,
  selfId: string,
): PrivateMask | null {
  for (const m of masks) {
    if (m.mode !== "private") continue;
    if (m.ownerId === selfId || m.ownerId === "local") continue;
    if (pointInMask(m, px, py)) return m;
  }
  return null;
}
