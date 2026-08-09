/**
 * Spatial Proximity Scoping (Gemini D — adopted 2026-08-02)
 * Canvas coordinates are organizational structure: assets near/under a
 * feed plane, quest tree, or custom cluster auto-scope without every manual wire.
 */

import type {
  AnimRegion,
  Artboard,
  DestructibleProp,
  ParticleSystem,
  QuestTree,
  WireZone,
} from "@/lib/pixel/types";

export type SpatialRect = { x: number; y: number; w: number; h: number };

export type ScopedBundle = {
  artboards: Artboard[];
  anims: AnimRegion[];
  particles: ParticleSystem[];
  destructibles: DestructibleProp[];
  questTrees: QuestTree[];
  /** expanded search used (base rect + padding) */
  rect: SpatialRect;
  count: number;
};

export function centerOf(r: { x: number; y: number; w?: number; h?: number; width?: number; height?: number; frameW?: number; frameH?: number }) {
  const w = r.w ?? r.width ?? r.frameW ?? 1;
  const h = r.h ?? r.height ?? r.frameH ?? 1;
  return { cx: r.x + w / 2, cy: r.y + h / 2 };
}

export function pointInRect(px: number, py: number, r: SpatialRect, pad = 0) {
  return (
    px >= r.x - pad &&
    py >= r.y - pad &&
    px <= r.x + r.w + pad &&
    py <= r.y + r.h + pad
  );
}

export function expandRect(r: SpatialRect, pad: number): SpatialRect {
  return {
    x: r.x - pad,
    y: r.y - pad,
    w: r.w + pad * 2,
    h: r.h + pad * 2,
  };
}

/** Soft falloff 1 at center → 0 at edge of pad ring (for heat / ranking). */
export function proximityScore(px: number, py: number, r: SpatialRect, pad: number): number {
  if (!pointInRect(px, py, r, pad)) return 0;
  if (pointInRect(px, py, r, 0)) return 1;
  // distance into pad band
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  const d = Math.hypot(dx, dy);
  return Math.max(0, 1 - d / Math.max(1, pad));
}

export type ScopeWorld = {
  artboards: Artboard[];
  animRegions: AnimRegion[];
  particles: ParticleSystem[];
  destructibles: DestructibleProp[];
  questTrees: QuestTree[];
};

/**
 * Collect everything whose center falls inside rect (+ optional proximity pad).
 * pad=0 → strict "under the plane"; pad>0 → soft neighborhood (family cluster).
 */
export function collectScoped(
  world: ScopeWorld,
  rect: SpatialRect,
  opts?: { pad?: number },
): ScopedBundle {
  const pad = opts?.pad ?? 0;
  const r = pad ? expandRect(rect, pad) : rect;

  const artboards = world.artboards.filter((b) => {
    const { cx, cy } = centerOf({ x: b.x, y: b.y, width: b.width, height: b.height });
    return pointInRect(cx, cy, r);
  });
  const anims = world.animRegions.filter((a) => {
    const { cx, cy } = centerOf({
      x: a.x,
      y: a.y,
      w: a.w ?? a.frameW,
      h: a.h ?? a.frameH,
    });
    return pointInRect(cx, cy, r);
  });
  const particles = world.particles.filter((p) => {
    const { cx, cy } = centerOf(p);
    return pointInRect(cx, cy, r);
  });
  const destructibles = world.destructibles.filter((d) => {
    const { cx, cy } = centerOf(d);
    return pointInRect(cx, cy, r);
  });
  const questTrees = world.questTrees.filter((q) => {
    const { cx, cy } = centerOf(q);
    return pointInRect(cx, cy, r);
  });

  const count =
    artboards.length +
    anims.length +
    particles.length +
    destructibles.length +
    questTrees.length;

  return { artboards, anims, particles, destructibles, questTrees, rect: r, count };
}

export function scopeForZone(
  world: ScopeWorld,
  zone: WireZone,
  opts?: { pad?: number },
): ScopedBundle {
  return collectScoped(world, { x: zone.x, y: zone.y, w: zone.w, h: zone.h }, opts);
}

export function scopeForQuest(
  world: ScopeWorld,
  tree: QuestTree,
  opts?: { pad?: number },
): ScopedBundle {
  // quest board + soft neighborhood so smash alley next to tree is included
  const pad = opts?.pad ?? 120;
  return collectScoped(world, { x: tree.x, y: tree.y, w: tree.w, h: tree.h }, { pad });
}

/** Human summary for inspectors / export notes */
export function formatScopeSummary(s: ScopedBundle): string {
  const bits: string[] = [];
  if (s.artboards.length) bits.push(`${s.artboards.length} board${s.artboards.length === 1 ? "" : "s"}`);
  if (s.anims.length) bits.push(`${s.anims.length} anim${s.anims.length === 1 ? "" : "s"}`);
  if (s.destructibles.length) bits.push(`${s.destructibles.length} smash`);
  if (s.particles.length) bits.push(`${s.particles.length} FX`);
  if (s.questTrees.length) bits.push(`${s.questTrees.length} quest`);
  return bits.length ? bits.join(" · ") : "empty scope";
}

/**
 * Auto-link: attach nearest destructible ids onto quest objective nodes that
 * mention smash / crate / break (or all objectives if force).
 */
export function suggestQuestDestructibleLinks(
  tree: QuestTree,
  destructibles: DestructibleProp[],
): { nodeId: string; destructibleIds: string[] }[] {
  if (!destructibles.length) return [];
  const ids = destructibles.map((d) => d.id);
  return tree.nodes
    .filter((n) => n.kind === "objective" || n.kind === "condition")
    .map((n) => {
      const text = `${n.title} ${n.body}`.toLowerCase();
      const smashy =
        /smash|crate|break|destruct|barrel|prop|alley/.test(text) ||
        n.kind === "objective";
      return smashy ? { nodeId: n.id, destructibleIds: ids } : null;
    })
    .filter(Boolean) as { nodeId: string; destructibleIds: string[] }[];
}
