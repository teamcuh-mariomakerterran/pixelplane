/**
 * House memory — the interior wears its data.
 * Lights, smash, keys, sit-ghost, crumbs, roaches, voicemail persist
 * across enter/exit and engine sessions.
 */

import type { FixtureDef, LightDef, RoomDef } from "@/lib/vault/types";
import { roomFloor } from "@/lib/vault/types";

export type HauntKind =
  | "enter"
  | "exit"
  | "sit"
  | "sleep"
  | "smash"
  | "pickup"
  | "light"
  | "unlock"
  | "phone"
  | "window"
  | "roach";

export type HauntEvent = {
  id: string;
  kind: HauntKind;
  roomId: string;
  x: number;
  y: number;
  t: number;
  label: string;
};

export type Roach = {
  id: string;
  x: number;
  y: number;
  roomId: string;
  vx: number;
  vy: number;
  life: number;
};

export type Crumb = {
  x: number;
  y: number;
  roomId: string;
};

export type IndoorBits = {
  assetId: string;
  roomId: string;
  floor: number;
  fixtures: FixtureDef[];
  lights: LightDef[];
  rooms: RoomDef[];
  activated: Record<string, boolean>;
  gone: Record<string, boolean>;
  sitting: boolean;
  keys: string[];
  unlocked: Record<string, boolean>;
  lightsOn: Record<string, boolean>;
  lastSit: { x: number; y: number; roomId: string } | null;
  savedAt: number | null;
  crumbs: Crumb[];
  roaches: Roach[];
  phoneRinging: boolean;
  phoneAnswered: boolean;
  phoneRingAt: number | null;
  voicemail: string | null;
  visited: boolean;
  events: HauntEvent[];
};

const LS = "pixelplane_house_v1";

export function emptyBits(assetId: string, rooms: RoomDef[], fixtures: FixtureDef[], lights: LightDef[]): IndoorBits {
  const start = rooms.find((r) => roomFloor(r) === 0) ?? rooms[0];
  const lightsOn: Record<string, boolean> = {};
  for (const L of lights) lightsOn[L.id] = L.on !== false && !rooms.find((r) => r.id === L.roomId)?.dark;
  return {
    assetId,
    roomId: start?.id ?? "main",
    floor: start ? roomFloor(start) : 0,
    fixtures: fixtures.map((f) => ({ ...f })),
    lights: lights.map((l) => ({ ...l })),
    rooms: rooms.map((r) => ({ ...r })),
    activated: {},
    gone: {},
    sitting: false,
    keys: [],
    unlocked: {},
    lightsOn,
    lastSit: null,
    savedAt: null,
    crumbs: [],
    roaches: [],
    phoneRinging: false,
    phoneAnswered: false,
    phoneRingAt: null,
    voicemail: null,
    visited: false,
    events: [],
  };
}

export function loadHouseMemory(): Record<string, IndoorBits> {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return {};
    const j = JSON.parse(raw) as Record<string, IndoorBits>;
    if (!j || typeof j !== "object") return {};
    const out: Record<string, IndoorBits> = {};
    for (const [k, v] of Object.entries(j)) {
      if (!v || typeof v !== "object") continue;
      out[k] = {
        ...v,
        keys: v.keys ?? [],
        unlocked: v.unlocked ?? {},
        lightsOn: v.lightsOn ?? {},
        crumbs: v.crumbs ?? [],
        roaches: v.roaches ?? [],
        events: v.events ?? [],
        sitting: !!v.sitting,
        phoneRinging: !!v.phoneRinging,
        phoneAnswered: !!v.phoneAnswered,
        visited: !!v.visited,
        gone: v.gone ?? {},
        activated: v.activated ?? {},
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function reconcileBits(
  bits: IndoorBits,
  rooms: RoomDef[],
  fixtures: FixtureDef[],
  lights: LightDef[],
): IndoorBits {
  if (bits.rooms.length === rooms.length && bits.fixtures.length === fixtures.length) return bits;
  const next = emptyBits(bits.assetId, rooms, fixtures, lights);
  next.keys = bits.keys ?? [];
  next.unlocked = bits.unlocked ?? {};
  next.savedAt = bits.savedAt ?? null;
  next.visited = bits.visited;
  next.events = bits.events ?? [];
  next.voicemail = bits.voicemail;
  next.phoneAnswered = bits.phoneAnswered;
  next.lastSit = bits.lastSit;
  const names = new Set(fixtures.map((f) => f.name));
  for (const f of bits.fixtures) {
    if (!names.has(f.name)) continue;
    const nf = fixtures.find((x) => x.name === f.name);
    if (!nf) continue;
    if (bits.gone[f.id]) next.gone[nf.id] = true;
    if (bits.activated[f.id]) next.activated[nf.id] = true;
  }
  return next;
}

export function persistHouseMemory(mem: Record<string, IndoorBits>) {
  try {
    const slim: Record<string, IndoorBits> = {};
    for (const [k, v] of Object.entries(mem)) {
      slim[k] = {
        ...v,
        events: (v.events ?? []).slice(-48),
        roaches: (v.roaches ?? []).slice(0, 12),
        crumbs: (v.crumbs ?? []).slice(0, 16),
      };
    }
    localStorage.setItem(LS, JSON.stringify(slim));
  } catch {
    /* */
  }
}

let _seq = 0;
export function recordHaunt(bits: IndoorBits, kind: HauntKind, x: number, y: number, label: string) {
  bits.events = bits.events ?? [];
  bits.events.push({
    id: `hx${Date.now().toString(36)}${(++_seq).toString(36)}`,
    kind,
    roomId: bits.roomId,
    x,
    y,
    t: Date.now(),
    label,
  });
  if (bits.events.length > 64) bits.events = bits.events.slice(-48);
}

export function roomIsLit(bits: IndoorBits, roomId: string): boolean {
  const room = bits.rooms.find((r) => r.id === roomId);
  const roomLights = bits.lights.filter((l) => l.roomId === roomId);
  if (!roomLights.length) return !room?.dark;
  return roomLights.some((l) => bits.lightsOn[l.id] !== false);
}

export function toggleRoomLights(bits: IndoorBits, roomId: string, switchId?: string) {
  const targets = bits.lights.filter((l) => l.roomId === roomId && (!switchId || l.switchId === switchId || !l.switchId));
  const anyOn = targets.some((l) => bits.lightsOn[l.id] !== false);
  for (const l of targets) bits.lightsOn[l.id] = !anyOn;
  return !anyOn;
}

export function tickRoaches(bits: IndoorBits, px: number, py: number, dt: number) {
  bits.roaches = bits.roaches ?? [];
  bits.crumbs = bits.crumbs ?? [];
  const room = bits.rooms.find((r) => r.id === bits.roomId);
  if (!room) return;
  const lit = roomIsLit(bits, bits.roomId);
  if (bits.crumbs.some((c) => c.roomId === bits.roomId) && bits.roaches.length < 8 && Math.random() < dt * 0.7) {
    const c = bits.crumbs[Math.floor(Math.random() * bits.crumbs.length)]!;
    bits.roaches.push({
      id: `rc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      x: c.x + (Math.random() - 0.5) * 10,
      y: c.y + (Math.random() - 0.5) * 8,
      roomId: c.roomId,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      life: 18 + Math.random() * 20,
    });
  }
  for (const r of bits.roaches) {
    if (r.roomId !== bits.roomId) continue;
    const dx = r.x - px;
    const dy = r.y - py;
    const d = Math.hypot(dx, dy) || 1;
    const flee = d < (lit ? 48 : 28) ? 90 : 8;
    r.vx += (dx / d) * flee * dt + (Math.random() - 0.5) * 30 * dt;
    r.vy += (dy / d) * flee * dt + (Math.random() - 0.5) * 30 * dt;
    if (lit) {
      r.vx += (Math.random() - 0.5) * 80 * dt;
      r.vy += (Math.random() - 0.5) * 80 * dt;
    }
    const spd = Math.hypot(r.vx, r.vy);
    if (spd > 70) {
      r.vx = (r.vx / spd) * 70;
      r.vy = (r.vy / spd) * 70;
    }
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.x = Math.max(room.x + 4, Math.min(room.x + room.w - 4, r.x));
    r.y = Math.max(room.y + 4, Math.min(room.y + room.h - 4, r.y));
    r.life -= dt;
  }
  bits.roaches = bits.roaches.filter((r) => r.life > 0);
}

export function dropCrumbs(bits: IndoorBits, x: number, y: number) {
  bits.crumbs = bits.crumbs ?? [];
  bits.crumbs.push({ x, y, roomId: bits.roomId });
  if (bits.crumbs.length > 16) bits.crumbs.shift();
}

export function peekWindowCopy(dayPhase: number): string {
  const night = dayPhase > 0.58 && dayPhase < 0.92;
  const dusk = dayPhase > 0.4 && dayPhase < 0.62;
  if (night) return "Street neon crawls the glass. The neighbor's blinds are open — their radio leaks the same song.";
  if (dusk) return "Dusk paints the lot amber. Someone on the walkup is smoking. They don't wave.";
  return "Daylight makes this place look worse. The lot is empty except for a car that hasn't moved in weeks.";
}
