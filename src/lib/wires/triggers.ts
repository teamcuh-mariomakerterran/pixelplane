/**
 * Wire triggers — a feed plane can be armed to fire a craft / mutate action
 * on every board it owns.
 */

import type { Artboard, WireZone } from "@/lib/pixel/types";

export type WireTriggerKind =
  | "none"
  | "boil"
  | "tile_kit"
  | "qa"
  | "mutate"
  | "bloom";

export type WireTrigger = {
  kind: WireTriggerKind;
  armed: boolean;
  lastFiredAt?: number;
};

export const TRIGGER_META: Record<
  WireTriggerKind,
  { label: string; short: string; color: string; hint: string }
> = {
  none: {
    label: "No trigger",
    short: "—",
    color: "#5c6578",
    hint: "Plane is a feed only",
  },
  boil: {
    label: "Boil edges",
    short: "BOIL",
    color: "#3ecfcf",
    hint: "Live 1px life on boards in this plane",
  },
  tile_kit: {
    label: "Grow tile kit",
    short: "TILE",
    color: "#4ecb71",
    hint: "20 variants from the first board in the plane",
  },
  qa: {
    label: "Sprite QA",
    short: "QA",
    color: "#fb923c",
    hint: "Orphans / bleed / stray / palette on boards here",
  },
  mutate: {
    label: "Mutation rails",
    short: "MUTATE",
    color: "#c084fc",
    hint: "Spawn live rails from the first board",
  },
  bloom: {
    label: "Neon bloom",
    short: "BLOOM",
    color: "#e8a838",
    hint: "Bake neon bloom rail on the first board",
  },
};

export const TRIGGER_KINDS: WireTriggerKind[] = [
  "boil",
  "tile_kit",
  "qa",
  "mutate",
  "bloom",
];

export function emptyTrigger(): WireTrigger {
  return { kind: "none", armed: false };
}

export function normalizeTrigger(raw: unknown): WireTrigger {
  if (!raw || typeof raw !== "object") return emptyTrigger();
  const t = raw as Partial<WireTrigger>;
  const kind = (TRIGGER_META[t.kind as WireTriggerKind] ? t.kind : "none") as WireTriggerKind;
  return {
    kind,
    armed: !!t.armed && kind !== "none",
    lastFiredAt: typeof t.lastFiredAt === "number" ? t.lastFiredAt : undefined,
  };
}

export function boardsInZone(zone: WireZone, artboards: Artboard[]): Artboard[] {
  return artboards.filter((b) => {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h;
  });
}

/** Screen-constant badge box in world units. */
export function triggerBadgeBox(zone: WireZone, zoom: number) {
  const z = Math.max(0.2, zoom);
  const w = 54 / z;
  const h = 16 / z;
  return {
    x: zone.x + zone.w - w - 4 / z,
    y: zone.y + 4 / z,
    w,
    h,
  };
}

export function triggerValveBox(zone: WireZone, zoom: number) {
  const z = Math.max(0.2, zoom);
  const s = 12 / z;
  return { x: zone.x + 4 / z, y: zone.y + 4 / z, w: s, h: s };
}

export function hitBox(
  box: { x: number; y: number; w: number; h: number },
  wx: number,
  wy: number,
) {
  return wx >= box.x && wx <= box.x + box.w && wy >= box.y && wy <= box.y + box.h;
}
