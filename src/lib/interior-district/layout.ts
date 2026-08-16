import { uid } from "@/lib/utils";
import { roomFloor, type VaultAsset } from "@/lib/vault/types";
import type { InteriorDistrict, RoomPad } from "./types";

const FLOOR_COLOR = ["#3ecfcf", "#e8a838", "#c084fc", "#e85d5d", "#4ecb71"];

export function createInteriorDistrict(name = "Interior District", ox = 80, oy = 80): InteriorDistrict {
  return {
    id: uid("intd"),
    name,
    x: ox,
    y: oy,
    w: 720,
    h: 420,
    color: "#3ecfcf",
    vaultAssetId: null,
    zones: {
      plan: { x: 16, y: 28, w: 420, h: 376, label: "Floor plan" },
      flow: { x: 448, y: 28, w: 256, h: 180, label: "Circulation" },
      air: { x: 448, y: 220, w: 256, h: 184, label: "Atmosphere" },
    },
    roomPads: [],
    links: [],
    lightPads: [],
  };
}

export function hydrateFromVault(d: InteriorDistrict, asset: VaultAsset): InteriorDistrict {
  const rooms = asset.rooms.length ? asset.rooms : [];
  const minX = Math.min(0, ...rooms.map((r) => r.x));
  const minY = Math.min(0, ...rooms.map((r) => r.y));
  const spanW = Math.max(160, ...rooms.map((r) => r.x + r.w - minX));
  const spanH = Math.max(112, ...rooms.map((r) => r.y + r.h - minY));
  const zone = d.zones.plan;
  const sx = (zone.w - 24) / spanW;
  const sy = (zone.h - 24) / spanH;
  const s = Math.min(sx, sy, 1.4);
  const pads: RoomPad[] = rooms.map((r, i) => ({
    id: uid("rpad"),
    roomId: r.id,
    name: r.name,
    x: zone.x + 12 + (r.x - minX) * s,
    y: zone.y + 12 + (r.y - minY) * s,
    w: Math.max(48, r.w * s),
    h: Math.max(36, r.h * s),
    floor: roomFloor(r),
    dark: !!r.dark,
    locked: !!r.locked || !!r.secret,
    window: !!r.window,
    color: FLOOR_COLOR[(roomFloor(r) + 2) % FLOOR_COLOR.length] ?? "#3ecfcf",
  }));
  const padByRoom = new Map(pads.map((p) => [p.roomId, p]));
  const links = [];
  for (const r of rooms) {
    if (r.parentId && padByRoom.has(r.parentId) && padByRoom.has(r.id)) {
      links.push({
        id: uid("clink"),
        fromPadId: padByRoom.get(r.parentId)!.id,
        toPadId: padByRoom.get(r.id)!.id,
        kind: "stair" as const,
        locked: !!r.locked || !!r.secret,
        keyId: r.keyId,
      });
    }
  }
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]!;
      const b = rooms[j]!;
      if (roomFloor(a) !== roomFloor(b)) continue;
      const shared =
        Math.abs(a.x + a.w - b.x) < 12 ||
        Math.abs(b.x + b.w - a.x) < 12 ||
        Math.abs(a.y + a.h - b.y) < 12 ||
        Math.abs(b.y + b.h - a.y) < 12;
      if (!shared) continue;
      const pa = padByRoom.get(a.id);
      const pb = padByRoom.get(b.id);
      if (!pa || !pb) continue;
      links.push({
        id: uid("clink"),
        fromPadId: pa.id,
        toPadId: pb.id,
        kind: "door" as const,
        locked: false,
        keyId: null,
      });
    }
  }
  const air = d.zones.air;
  const lightPads = asset.lights.map((L, i) => {
    const pad = padByRoom.get(L.roomId);
    return {
      id: uid("lpad"),
      roomPadId: pad?.id ?? pads[0]?.id ?? "",
      x: air.x + 16 + (i % 4) * 58,
      y: air.y + 28 + Math.floor(i / 4) * 40,
      color: L.color,
      flicker: L.flicker,
    };
  });
  return {
    ...d,
    name: `${asset.name} · interior`,
    vaultAssetId: asset.id,
    roomPads: pads,
    links,
    lightPads,
  };
}

export function zoneWorld(
  d: InteriorDistrict,
  key: keyof InteriorDistrict["zones"],
) {
  const z = d.zones[key];
  return { x: d.x + z.x, y: d.y + z.y, w: z.w, h: z.h };
}

export function padWorld(d: InteriorDistrict, pad: RoomPad) {
  return { x: d.x + pad.x, y: d.y + pad.y, w: pad.w, h: pad.h };
}
