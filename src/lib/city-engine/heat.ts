/**
 * Wanted heat response — pursuit units when stars climb.
 * Clean-room: original chase logic, no franchise assets.
 */

import { ENGINE, VEHICLE_DEFS, type VehicleDef } from "./config";
import type { EngineState, EntityVehicle } from "./sim";

export type HeatUnit = {
  id: string;
  vehicleId: string;
  aggression: number; // 0–1
};

export function wantedStars(wanted: number): number {
  return Math.max(0, Math.min(5, Math.floor(wanted + 0.001)));
}

/** Spawn pursuit traffic that peels toward the player. */
export function ensureHeatUnits(s: EngineState) {
  const stars = wantedStars(s.player.wanted);
  if (!s.heatUnits) s.heatUnits = [];
  const heat = s.heatUnits;

  const target = Math.min(4, stars);
  while (heat.length > target) {
    const u = heat.pop()!;
    s.vehicles = s.vehicles.filter((v) => v.id !== u.vehicleId);
  }
  while (heat.length < target) {
    const def =
      VEHICLE_DEFS.find((d) => d.id === "sedan") ?? VEHICLE_DEFS[4]!;
    const ang = Math.random() * Math.PI * 2;
    const dist = 220 + Math.random() * 160;
    const id = `heat_${Date.now().toString(36)}_${heat.length}`;
    const veh: EntityVehicle = {
      id,
      defId: def.id,
      x: s.player.x + Math.cos(ang) * dist,
      y: s.player.y + Math.sin(ang) * dist,
      rot: ang + Math.PI,
      speed: 60,
      traffic: false,
      heat: true,
    };
    s.vehicles.push(veh);
    heat.push({
      id: `hu_${heat.length}`,
      vehicleId: id,
      aggression: 0.55 + stars * 0.08,
    });
  }
}

/** Steer heat vehicles toward player. */
export function stepHeat(s: EngineState, dt: number) {
  if (!s.heatUnits?.length) return;
  const stars = wantedStars(s.player.wanted);
  if (stars <= 0) {
    for (const u of s.heatUnits) {
      s.vehicles = s.vehicles.filter((v) => v.id !== u.vehicleId);
    }
    s.heatUnits = [];
    return;
  }

  for (const u of s.heatUnits) {
    const v = s.vehicles.find((x) => x.id === u.vehicleId);
    if (!v) continue;
    if (s.player.mode === "drive" && s.player.vehicleId === v.id) continue;
    const dx = s.player.x - v.x;
    const dy = s.player.y - v.y;
    const dist = Math.hypot(dx, dy) || 1;
    const desired = Math.atan2(dy, dx);
    let diff = desired - v.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    v.rot += Math.max(-2.8, Math.min(2.8, diff * 3.2)) * dt;
    const def: VehicleDef =
      VEHICLE_DEFS.find((d) => d.id === v.defId) ?? VEHICLE_DEFS[4]!;
    const max = def.maxSpeed * (0.55 + u.aggression * 0.35 + stars * 0.05);
    v.speed += ENGINE.driveAccel * 0.55 * dt;
    v.speed = Math.min(max, v.speed);
    if (dist < 36) v.speed *= 0.85;
    const nx = v.x + Math.cos(v.rot) * v.speed * dt;
    const ny = v.y + Math.sin(v.rot) * v.speed * dt;
    if (nx > 8 && ny > 8 && nx < s.worldW - 8 && ny < s.worldH - 8) {
      v.x = nx;
      v.y = ny;
    } else {
      v.rot += Math.PI * 0.5;
      v.speed *= 0.4;
    }
  }
}

/** Street decor billboards fed from plane pack URLs — each entry is a SHEET;
 *  CityEngineView slices a single cell so we don't draw whole contact sheets. */
export type StreetDecor = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  url: string;
  label: string;
  /** which cell in the sheet (stable per decor) */
  cellIndex: number;
};

const DECOR_URLS = [
  "/packs/goodies/citykit/storefronts_neon_signs.jpg",
  "/packs/goodies/citykit/alleys_neon_street.jpg",
  "/packs/goodies/citykit/towers_neon_tech.jpg",
  "/packs/goodies/citykit/vehicles_police_fleet.jpg",
  "/packs/goodies/citykit/factories_color_plants.jpg",
  "/packs/goodies/citykit/apartments_purple_neon.jpg",
  "/packs/goodies/citykit/roads_elevated_highway.jpg",
  "/packs/goodies/citykit/cars_neon_topdown.jpg",
  "/packs/goodies/citykit/cars_weaponized.jpg",
  "/packs/goodies/citykit/buildings_neon_fronts.jpg",
  "/packs/goodies/citykit/cars_clean_damaged.jpg",
  "/packs/goodies/citykit/hangars_warehouse_front.jpg",
];

export function spawnStreetDecor(
  px: number,
  py: number,
  worldW: number,
  worldH: number,
): StreetDecor[] {
  const out: StreetDecor[] = [];
  // ring of unique sheet cells around the player — not whole sheets
  for (let i = 0; i < DECOR_URLS.length; i++) {
    const ang = (i / DECOR_URLS.length) * Math.PI * 2;
    const dist = 120 + (i % 4) * 70;
    const x = Math.max(40, Math.min(worldW - 80, px + Math.cos(ang) * dist));
    const y = Math.max(40, Math.min(worldH - 80, py + Math.sin(ang) * dist));
    // world footprint of a single prop (not the sheet)
    const isVehicle = /cars|vehicles|police/i.test(DECOR_URLS[i]!);
    out.push({
      id: `decor_${i}`,
      x,
      y,
      w: isVehicle ? 42 : 56,
      h: isVehicle ? 28 : 48,
      url: DECOR_URLS[i]!,
      label: DECOR_URLS[i]!.split("/").pop()?.replace(".jpg", "") ?? "decor",
      cellIndex: i % 6, // variety across cells in each sheet
    });
  }
  // second ring — more cells from same sheets
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.4;
    const dist = 320 + (i % 3) * 40;
    const url = DECOR_URLS[i % DECOR_URLS.length]!;
    const isVehicle = /cars|vehicles|police/i.test(url);
    out.push({
      id: `decor_r2_${i}`,
      x: Math.max(40, Math.min(worldW - 80, px + Math.cos(ang) * dist)),
      y: Math.max(40, Math.min(worldH - 80, py + Math.sin(ang) * dist)),
      w: isVehicle ? 40 : 52,
      h: isVehicle ? 26 : 44,
      url,
      label: url.split("/").pop()?.replace(".jpg", "") ?? "decor",
      cellIndex: (i + 2) % 8,
    });
  }
  return out;
}
