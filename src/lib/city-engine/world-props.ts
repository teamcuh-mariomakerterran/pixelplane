/**
 * Street smashables — crates, barrels, pots. City Engine playtest of Studio destructibles.
 */

export type PropKind = "crate" | "barrel" | "pot" | "sign";

export type WorldProp = {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: string;
  /** residual debris stays a moment */
  debrisT: number;
  gone: boolean;
};

const KIND: Record<
  PropKind,
  { w: number; h: number; hp: number; color: string; name: string }
> = {
  crate: { w: 28, h: 28, hp: 30, color: "#c4a574", name: "Crate" },
  barrel: { w: 24, h: 32, hp: 40, color: "#e85d5d", name: "Barrel" },
  pot: { w: 18, h: 18, hp: 12, color: "#d4a574", name: "Pot" },
  sign: { w: 14, h: 36, hp: 22, color: "#94a3b8", name: "Sign" },
};

export function spawnStreetProps(
  nearX: number,
  nearY: number,
  worldW: number,
  worldH: number,
): WorldProp[] {
  const out: WorldProp[] = [];
  const layouts: { kind: PropKind; dx: number; dy: number }[] = [
    { kind: "crate", dx: 24, dy: -18 },
    { kind: "crate", dx: 52, dy: -14 },
    { kind: "barrel", dx: -36, dy: 12 },
    { kind: "barrel", dx: -58, dy: 10 },
    { kind: "pot", dx: 14, dy: 36 },
    { kind: "pot", dx: 32, dy: 38 },
    { kind: "sign", dx: -20, dy: -40 },
    { kind: "crate", dx: 80, dy: 22 },
    { kind: "barrel", dx: 105, dy: 20 },
    { kind: "crate", dx: -70, dy: -28 },
  ];
  // secondary cluster toward city center-ish
  const cx = worldW * 0.5;
  const cy = worldH * 0.5;
  layouts.push(
    { kind: "crate", dx: cx - nearX - 20, dy: cy - nearY },
    { kind: "crate", dx: cx - nearX + 20, dy: cy - nearY + 10 },
    { kind: "barrel", dx: cx - nearX - 50, dy: cy - nearY + 30 },
  );

  let i = 0;
  for (const L of layouts) {
    const def = KIND[L.kind];
    const x = Math.max(20, Math.min(worldW - 40, nearX + L.dx));
    const y = Math.max(20, Math.min(worldH - 40, nearY + L.dy));
    out.push({
      id: `prop_${i++}`,
      kind: L.kind,
      x,
      y,
      w: def.w,
      h: def.h,
      hp: def.hp,
      maxHp: def.hp,
      color: def.color,
      debrisT: 0,
      gone: false,
    });
  }
  return out;
}

export function propLabel(p: WorldProp) {
  return KIND[p.kind].name;
}

export function damageProp(p: WorldProp, amount: number): WorldProp {
  if (p.gone) return p;
  const hp = Math.max(0, p.hp - amount);
  if (hp <= 0) {
    return { ...p, hp: 0, debrisT: 1.2, gone: true };
  }
  return { ...p, hp };
}

export function nearestProp(
  props: WorldProp[],
  x: number,
  y: number,
  radius: number,
): WorldProp | null {
  let best: WorldProp | null = null;
  let bestD = radius;
  for (const p of props) {
    if (p.gone && p.debrisT <= 0) continue;
    if (p.gone) continue;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function vehicleHitsProp(
  props: WorldProp[],
  vx: number,
  vy: number,
  speed: number,
): { props: WorldProp[]; hit: boolean } {
  if (Math.abs(speed) < 45) return { props, hit: false };
  let hit = false;
  const next = props.map((p) => {
    if (p.gone) return p;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    if (Math.hypot(cx - vx, cy - vy) < Math.max(p.w, p.h) * 0.7 + 18) {
      hit = true;
      return damageProp(p, 18 + Math.abs(speed) * 0.08);
    }
    return p;
  });
  return { props: next, hit };
}

export function tickProps(props: WorldProp[], dt: number): WorldProp[] {
  return props
    .map((p) => {
      if (p.gone && p.debrisT > 0) {
        return { ...p, debrisT: Math.max(0, p.debrisT - dt) };
      }
      return p;
    })
    .filter((p) => !(p.gone && p.debrisT <= 0));
}
