/**
 * Sub-tile footing collision & overhangs (Brian catch · Gemini confirm)
 * Prevents full-tile "invisible walls" on 2.5D roofs/awnings.
 * Footing = ground contact rect (often bottom strip).
 * Overhang = visual top of tile that sorts above actors (walk under awning).
 */

export type FootingDef = {
  id: string;
  name: string;
  /** full tile size */
  tileW: number;
  tileH: number;
  /**
   * Collision rect in tile-local space (bottom-pinned typical).
   * e.g. 64×64 tile with 64×20 footing at y=44
   */
  footX: number;
  footY: number;
  footW: number;
  footH: number;
  /**
   * Overhang band (local) — drawn above player when actor is "under" it.
   * Usually the top portion of a building facade / awning.
   */
  overhangY: number;
  overhangH: number;
  /** if true, actors can occupy the non-footing area */
  walkUnder: boolean;
  color: string;
};

export type FootingInstance = {
  id: string;
  defId: string;
  /** world top-left of full tile visual */
  x: number;
  y: number;
  def: FootingDef;
};

/** World-space footing AABB for collision */
export function footingWorldBox(inst: FootingInstance) {
  const d = inst.def;
  return {
    x: inst.x + d.footX,
    y: inst.y + d.footY,
    w: d.footW,
    h: d.footH,
  };
}

/** World-space overhang band (visual only for z-sort) */
export function overhangWorldBox(inst: FootingInstance) {
  const d = inst.def;
  return {
    x: inst.x,
    y: inst.y + d.overhangY,
    w: d.tileW,
    h: d.overhangH,
  };
}

export function pointInAabb(
  px: number,
  py: number,
  b: { x: number; y: number; w: number; h: number },
) {
  return px >= b.x && py >= b.y && px < b.x + b.w && py < b.y + b.h;
}

/** AABB overlap */
export function aabbOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Resolve movement against footings only (not full tile).
 * Returns corrected position.
 */
export function resolveFootingMove(
  x: number,
  y: number,
  bodyW: number,
  bodyH: number,
  dx: number,
  dy: number,
  instances: FootingInstance[],
): { x: number; y: number; hit: boolean } {
  let nx = x + dx;
  let ny = y + dy;
  let hit = false;
  const body = { x: nx - bodyW / 2, y: ny - bodyH / 2, w: bodyW, h: bodyH };

  for (const inst of instances) {
    const foot = footingWorldBox(inst);
    if (!aabbOverlap(body, foot)) continue;
    hit = true;
    // separate on smaller penetration axis
    const overlapX =
      Math.min(body.x + body.w, foot.x + foot.w) - Math.max(body.x, foot.x);
    const overlapY =
      Math.min(body.y + body.h, foot.y + foot.h) - Math.max(body.y, foot.y);
    if (overlapX < overlapY) {
      if (body.x + body.w / 2 < foot.x + foot.w / 2) nx -= overlapX;
      else nx += overlapX;
    } else {
      if (body.y + body.h / 2 < foot.y + foot.h / 2) ny -= overlapY;
      else ny += overlapY;
    }
  }
  return { x: nx, y: ny, hit };
}

/**
 * Z-sort key: if actor center is below overhang bottom and horizontally under tile,
 * actor draws first (under), then overhang. If actor is south of footing, normal.
 * Returns true if overhang should draw AFTER actor (actor is under roof).
 */
export function actorUnderOverhang(
  actorX: number,
  actorY: number,
  inst: FootingInstance,
): boolean {
  if (!inst.def.walkUnder) return false;
  const oh = overhangWorldBox(inst);
  const foot = footingWorldBox(inst);
  // under = within tile X, north of footing top, within overhang vertical span-ish
  const inX = actorX >= inst.x && actorX <= inst.x + inst.def.tileW;
  const aboveFoot = actorY < foot.y;
  const nearOverhang = actorY >= oh.y - 8 && actorY <= foot.y + 4;
  return inX && aboveFoot && nearOverhang;
}

export function seedFootingDefs(): FootingDef[] {
  return [
    {
      id: "awning_64",
      name: "Shop awning 64",
      tileW: 64,
      tileH: 64,
      footX: 0,
      footY: 44,
      footW: 64,
      footH: 20,
      overhangY: 0,
      overhangH: 36,
      walkUnder: true,
      color: "#b45309",
    },
    {
      id: "building_wall_48",
      name: "Building wall footing",
      tileW: 48,
      tileH: 64,
      footX: 0,
      footY: 40,
      footW: 48,
      footH: 24,
      overhangY: 0,
      overhangH: 32,
      walkUnder: true,
      color: "#57534e",
    },
    {
      id: "full_block",
      name: "Solid block (full tile collision)",
      tileW: 32,
      tileH: 32,
      footX: 0,
      footY: 0,
      footW: 32,
      footH: 32,
      overhangY: 0,
      overhangH: 0,
      walkUnder: false,
      color: "#44403c",
    },
  ];
}

export function placeFooting(
  def: FootingDef,
  x: number,
  y: number,
): FootingInstance {
  return {
    id: `ft_${Math.random().toString(36).slice(2, 9)}`,
    defId: def.id,
    x,
    y,
    def,
  };
}
