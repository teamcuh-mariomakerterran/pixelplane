/**
 * City District — Weighted Tile Mutation Pools (Brian catch · Gemini confirm)
 * One auto-tile rule → many weighted art variants → less grid repetition.
 * Decal pass: un-grid-aligned stamps (skid, litter, graffiti) over tiles.
 */

import { uid } from "@/lib/utils";

export type TileVariant = {
  id: string;
  /** display / asset name */
  sprite: string;
  /** 0–1 relative weight (normalized at roll time) */
  weight: number;
  /** optional tint for procedural stand-in */
  color: string;
};

export type AutoTileRule = {
  id: string;
  name: string;
  /** e.g. Straight_Sidewalk */
  key: string;
  tileW: number;
  tileH: number;
  variants: TileVariant[];
};

export type PlacedTile = {
  id: string;
  ruleId: string;
  ruleKey: string;
  variantId: string;
  sprite: string;
  color: string;
  /** grid cell */
  gx: number;
  gy: number;
  /** world position */
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DecalStamp = {
  id: string;
  kind: "skid" | "litter" | "graffiti" | "puddle" | "custom";
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  color: string;
  alpha: number;
};

export function createRule(
  key: string,
  name: string,
  variants: { sprite: string; weight: number; color: string }[],
  tile = 32,
): AutoTileRule {
  return {
    id: uid("rule"),
    name,
    key,
    tileW: tile,
    tileH: tile,
    variants: variants.map((v) => ({
      id: uid("var"),
      sprite: v.sprite,
      weight: v.weight,
      color: v.color,
    })),
  };
}

/** Weighted pick — stable option via seed for redo/network */
export function pickVariant(
  rule: AutoTileRule,
  seed?: number,
): TileVariant {
  const total = rule.variants.reduce((s, v) => s + Math.max(0, v.weight), 0) || 1;
  let r =
    seed != null
      ? ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1
      : Math.random();
  r *= total;
  let acc = 0;
  for (const v of rule.variants) {
    acc += Math.max(0, v.weight);
    if (r <= acc) return v;
  }
  return rule.variants[rule.variants.length - 1]!;
}

export function placeTile(
  rule: AutoTileRule,
  gx: number,
  gy: number,
  originX = 0,
  originY = 0,
  seed?: number,
): PlacedTile {
  const v = pickVariant(rule, seed ?? gx * 73856093 + gy * 19349663);
  return {
    id: uid("tile"),
    ruleId: rule.id,
    ruleKey: rule.key,
    variantId: v.id,
    sprite: v.sprite,
    color: v.color,
    gx,
    gy,
    x: originX + gx * rule.tileW,
    y: originY + gy * rule.tileH,
    w: rule.tileW,
    h: rule.tileH,
  };
}

/** Paint a rect of cells with weighted mutation */
export function paintTileRect(
  rule: AutoTileRule,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  originX = 0,
  originY = 0,
): PlacedTile[] {
  const out: PlacedTile[] = [];
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  for (let gy = minY; gy <= maxY; gy++) {
    for (let gx = minX; gx <= maxX; gx++) {
      out.push(placeTile(rule, gx, gy, originX, originY));
    }
  }
  return out;
}

export function createDecal(
  kind: DecalStamp["kind"],
  x: number,
  y: number,
): DecalStamp {
  const sizes: Record<DecalStamp["kind"], { w: number; h: number; color: string }> = {
    skid: { w: 48, h: 10, color: "#1a1a1a" },
    litter: { w: 8, h: 8, color: "#94a3b8" },
    graffiti: { w: 28, h: 18, color: "#e85d5d" },
    puddle: { w: 22, h: 14, color: "#38bdf8" },
    custom: { w: 16, h: 16, color: "#a78bfa" },
  };
  const s = sizes[kind];
  return {
    id: uid("decal"),
    kind,
    x,
    y,
    w: s.w,
    h: s.h,
    rot: (Math.random() - 0.5) * 0.8,
    color: s.color,
    alpha: kind === "skid" ? 0.55 : kind === "puddle" ? 0.4 : 0.75,
  };
}

/** Built-in city demo rules */
export function seedCityTileRules(): AutoTileRule[] {
  return [
    createRule(
      "Straight_Sidewalk",
      "Straight sidewalk",
      [
        { sprite: "sidewalk_clean", weight: 0.8, color: "#6b7280" },
        { sprite: "sidewalk_crack", weight: 0.1, color: "#57534e" },
        { sprite: "sidewalk_puddle", weight: 0.05, color: "#64748b" },
        { sprite: "sidewalk_grate", weight: 0.05, color: "#44403c" },
      ],
      32,
    ),
    createRule(
      "Asphalt_Road",
      "Asphalt road",
      [
        { sprite: "road_clean", weight: 0.7, color: "#292524" },
        { sprite: "road_patch", weight: 0.15, color: "#1c1917" },
        { sprite: "road_oil", weight: 0.1, color: "#0c0a09" },
        { sprite: "road_line_fade", weight: 0.05, color: "#3f3f46" },
      ],
      32,
    ),
    createRule(
      "Grass_Lot",
      "Grass lot",
      [
        { sprite: "grass_a", weight: 0.5, color: "#3f6212" },
        { sprite: "grass_b", weight: 0.3, color: "#4d7c0f" },
        { sprite: "grass_dirt", weight: 0.15, color: "#713f12" },
        { sprite: "grass_flower", weight: 0.05, color: "#65a30d" },
      ],
      32,
    ),
  ];
}
