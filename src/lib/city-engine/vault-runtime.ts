/**
 * Compile vault buildings into indoor scenes + outdoor lots.
 */

import type { IndoorScene } from "./indoors";
import type { FixtureDef, LightDef, RoomDef, VaultAsset } from "@/lib/vault/types";
import { roomFloor } from "@/lib/vault/types";
import { useAssetVault } from "@/store/asset-vault";
import { emptyBits, type IndoorBits } from "./house-memory";

export type VaultLot = {
  assetId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type { IndoorBits };

export type Connector = {
  room: RoomDef;
  x: number;
  y: number;
  kind: "door" | "stair";
  locked: boolean;
  keyId?: string | null;
};

export function compileVaultScene(asset: VaultAsset, lot: VaultLot): IndoorScene {
  const rooms = asset.rooms.length
    ? asset.rooms
    : [{ id: "main", name: "Room", x: 0, y: 0, w: 160, h: 112 }];
  const maxX = Math.max(...rooms.map((r) => r.x + r.w), 80);
  const maxY = Math.max(...rooms.map((r) => r.y + r.h), 64);
  const ts = 8;
  const tw = Math.max(8, Math.ceil(maxX / ts));
  const th = Math.max(6, Math.ceil(maxY / ts));
  const tiles = new Uint8Array(tw * th).fill(1);

  for (const r of rooms) {
    const x0 = Math.floor(r.x / ts);
    const y0 = Math.floor(r.y / ts);
    const x1 = Math.ceil((r.x + r.w) / ts);
    const y1 = Math.ceil((r.y + r.h) / ts);
    for (let y = y0 + 1; y < y1 - 1; y++) {
      for (let x = x0 + 1; x < x1 - 1; x++) {
        if (x >= 0 && y >= 0 && x < tw && y < th) tiles[y * tw + x] = 0;
      }
    }
    if (r.window) {
      const wx = Math.min(tw - 2, Math.max(1, Math.floor((r.x + r.w * 0.55) / ts)));
      const wy = Math.max(0, Math.floor(r.y / ts));
      if (wy < th) tiles[wy * tw + wx] = 5;
    }
  }

  // punch doorways on shared edges
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]!;
      const b = rooms[j]!;
      if (roomFloor(a) !== roomFloor(b)) continue;
      const gap = punchShared(a, b, ts);
      if (!gap) continue;
      for (const [tx, ty] of gap) {
        if (tx >= 0 && ty >= 0 && tx < tw && ty < th) tiles[ty * tw + tx] = 0;
      }
    }
  }

  const ground = rooms.filter((r) => roomFloor(r) === 0);
  const first = ground[0] ?? rooms[0]!;
  const doorTx = Math.floor((first.x + first.w / 2) / ts);
  const doorTy = Math.min(th - 1, Math.ceil((first.y + first.h) / ts) - 1);
  if (doorTx >= 0 && doorTx < tw) tiles[doorTy * tw + doorTx] = 2;

  const doors = asset.doors.length
    ? asset.doors.map((d) => ({
        x: lot.x + (d.nx + d.nw / 2) * lot.w,
        y: lot.y + (d.ny + d.nh / 2) * lot.h,
        label: d.label ?? asset.name,
      }))
    : [{ x: lot.x + lot.w / 2, y: lot.y + lot.h, label: asset.name }];

  return {
    id: `vault-${asset.id}`,
    name: asset.name,
    kind: "custom",
    tw,
    th,
    tileSize: ts,
    tiles,
    spawnTX: doorTx,
    spawnTY: Math.max(1, doorTy - 2),
    exteriorDoors: doors,
    floor: "#4a4450",
    wall: "#1c1820",
    accent: "#e8a838",
  };
}

function punchShared(a: RoomDef, b: RoomDef, ts: number): [number, number][] {
  const cells: [number, number][] = [];
  const overlapY = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const overlapX = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  if (Math.abs(a.x + a.w - b.x) < 10 && overlapY > 16) {
    const mid = (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2;
    const ty = Math.floor(mid / ts);
    const tx = Math.floor(((a.x + a.w + b.x) / 2) / ts);
    cells.push([tx, ty], [tx, ty - 1]);
  } else if (Math.abs(b.x + b.w - a.x) < 10 && overlapY > 16) {
    const mid = (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2;
    const ty = Math.floor(mid / ts);
    const tx = Math.floor(((b.x + b.w + a.x) / 2) / ts);
    cells.push([tx, ty], [tx, ty - 1]);
  } else if (Math.abs(a.y + a.h - b.y) < 10 && overlapX > 16) {
    const mid = (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2;
    const tx = Math.floor(mid / ts);
    const ty = Math.floor(((a.y + a.h + b.y) / 2) / ts);
    cells.push([tx, ty], [tx - 1, ty]);
  } else if (Math.abs(b.y + b.h - a.y) < 10 && overlapX > 16) {
    const mid = (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2;
    const tx = Math.floor(mid / ts);
    const ty = Math.floor(((b.y + b.h + a.y) / 2) / ts);
    cells.push([tx, ty], [tx - 1, ty]);
  }
  return cells;
}

export function placeVaultLots(cityW: number, cityH: number): VaultLot[] {
  const assets = useAssetVault.getState().assets.filter((a) => a.enterable);
  const cx = cityW * 0.5;
  const cy = cityH * 0.36;
  return assets.map((a, i) => ({
    assetId: a.id,
    name: a.name,
    x: cx + (i - (assets.length - 1) / 2) * 88,
    y: cy,
    w: 56,
    h: 48,
  }));
}

export function bitsFor(asset: VaultAsset): IndoorBits {
  return emptyBits(asset.id, asset.rooms, asset.fixtures, asset.lights);
}

export function roomOf(bits: IndoorBits, id: string) {
  return bits.rooms.find((r) => r.id === id) ?? bits.rooms[0] ?? null;
}

export function connectorsFor(bits: IndoorBits): Connector[] {
  const cur = roomOf(bits, bits.roomId);
  if (!cur) return [];
  const curF = roomFloor(cur);
  const out: Connector[] = [];

  for (const r of bits.rooms) {
    if (r.id === cur.id) continue;
    const rf = roomFloor(r);
    if (rf !== curF) {
      const related = r.parentId === cur.id || cur.parentId === r.id || !!r.downstairs || !!cur.downstairs;
      if (!related) continue;
      const locked = !!(r.locked || r.secret) && !bits.unlocked[r.id] && !(r.keyId && bits.keys.includes(r.keyId));
      out.push({
        room: r,
        x: cur.x + 16,
        y: curF > rf ? cur.y + cur.h - 12 : cur.y + 12,
        kind: "stair",
        locked,
        keyId: r.keyId,
      });
      continue;
    }
    const shared =
      Math.abs(r.x - (cur.x + cur.w)) < 12 ||
      Math.abs(cur.x - (r.x + r.w)) < 12 ||
      Math.abs(r.y - (cur.y + cur.h)) < 12 ||
      Math.abs(cur.y - (r.y + r.h)) < 12;
    if (!shared) continue;
    let x = r.x + 8;
    let y = r.y + r.h / 2;
    if (Math.abs(r.x - (cur.x + cur.w)) < 12) {
      x = cur.x + cur.w - 6;
      y = (Math.max(cur.y, r.y) + Math.min(cur.y + cur.h, r.y + r.h)) / 2;
    } else if (Math.abs(cur.x - (r.x + r.w)) < 12) {
      x = cur.x + 6;
      y = (Math.max(cur.y, r.y) + Math.min(cur.y + cur.h, r.y + r.h)) / 2;
    } else if (Math.abs(r.y - (cur.y + cur.h)) < 12) {
      x = (Math.max(cur.x, r.x) + Math.min(cur.x + cur.w, r.x + r.w)) / 2;
      y = cur.y + cur.h - 6;
    } else {
      x = (Math.max(cur.x, r.x) + Math.min(cur.x + cur.w, r.x + r.w)) / 2;
      y = cur.y + 6;
    }
    const locked = !!(r.locked || r.secret) && !bits.unlocked[r.id] && !(r.keyId && bits.keys.includes(r.keyId));
    out.push({ room: r, x, y, kind: "door", locked, keyId: r.keyId });
  }

  for (const f of bits.fixtures) {
    if (f.roomId !== cur.id || bits.gone[f.id]) continue;
    if (f.mode !== "stair" || !f.stairTo) continue;
    const dest = bits.rooms.find((r) => r.id === f.stairTo);
    if (!dest) continue;
    const locked = !!f.locked && !bits.unlocked[f.id] && !(f.keyId && bits.keys.includes(f.keyId));
    out.push({
      room: dest,
      x: f.x + f.w / 2,
      y: f.y + f.h / 2,
      kind: "stair",
      locked,
      keyId: f.keyId,
    });
  }
  return out;
}

export function connectorNear(bits: IndoorBits, x: number, y: number, rad = 34): Connector | null {
  let best: Connector | null = null;
  let bd = rad;
  for (const c of connectorsFor(bits)) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

export function nearestFixture(bits: IndoorBits, x: number, y: number, rad = 22) {
  let best: FixtureDef | null = null;
  let bd = rad;
  for (const f of bits.fixtures) {
    if (f.roomId !== bits.roomId) continue;
    if (bits.gone[f.id]) continue;
    if (f.hiddenUntil && !bits.activated[f.hiddenUntil]) continue;
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    const d = Math.hypot(cx - x, cy - y);
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

export function fixtureSolidAt(bits: IndoorBits, x: number, y: number): boolean {
  for (const f of bits.fixtures) {
    if (f.roomId !== bits.roomId || bits.gone[f.id]) continue;
    if (f.hiddenUntil && !bits.activated[f.hiddenUntil]) continue;
    if (!f.solid && !f.base) continue;
    if (x > f.x + 3 && x < f.x + f.w - 3 && y > f.y + 3 && y < f.y + f.h - 3) return true;
  }
  return false;
}

export function lightForRoom(bits: IndoorBits, roomId: string): LightDef[] {
  return bits.lights.filter((l) => l.roomId === roomId);
}
