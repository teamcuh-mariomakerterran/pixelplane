import { ENGINE, VEHICLE_DEFS, type VehicleDef } from "./config";
import {
  createBuiltinIndoors,
  indoorRuntime,
  indoorSolidAt,
  indoorOnExitDoor,
  nearestExteriorDoor,
  bakeIndoorPixels,
  type IndoorScene,
  type IndoorRuntime,
} from "./indoors";
import {
  spawnStreetProps,
  nearestProp,
  damageProp,
  vehicleHitsProp,
  tickProps,
  propLabel,
  type WorldProp,
} from "./world-props";
import {
  getPerspective,
  zoomTargets,
  type PerspectiveId,
  type PerspectiveProfile,
} from "./perspective";
import {
  applyQuestEvent,
  questHudLine,
  type QuestRuntime,
  type QuestEvent,
} from "./quest-runtime";
import { useMemoryWeb } from "@/store/memory-web";
import { resolveFootingMove, actorUnderOverhang } from "./footing";
import {
  ensureHeatUnits,
  stepHeat,
  spawnStreetDecor,
  wantedStars,
  type HeatUnit,
  type StreetDecor,
} from "./heat";
import { evalRules, createCooldowns, type RuleCooldowns } from "@/lib/rules/engine-bridge";
import { useRuleCards } from "@/store/rule-cards";
import { useSoundSprites } from "@/store/sound-sprites";
import type { RuleCard } from "@/store/rule-cards";

export type Mode = "foot" | "drive";
export type Realm = "outdoor" | "indoor";

export type EntityVehicle = {
  id: string;
  defId: string;
  x: number;
  y: number;
  rot: number;
  speed: number;
  traffic: boolean;
  /** pursuit unit (heat) */
  heat?: boolean;
};

export type Player = {
  x: number;
  y: number;
  rot: number;
  mode: Mode;
  vehicleId: string | null;
  wanted: number;
};

export type EngineState = {
  /** Active perspective profile id — growth seam for future templates */
  perspectiveId: PerspectiveId;
  profile: PerspectiveProfile;
  realm: Realm;
  worldW: number;
  worldH: number;
  outdoorW: number;
  outdoorH: number;
  outdoorReturn: { x: number; y: number } | null;
  indoorScenes: IndoorScene[];
  indoor: IndoorRuntime | null;
  indoorBake: { data: Uint8ClampedArray; w: number; h: number } | null;
  player: Player;
  vehicles: EntityVehicle[];
  props: WorldProp[];
  smashFlash: number;
  /** lifetime smash destroys this session */
  smashCount: number;
  quest: QuestRuntime | null;
  /** Memory-web agents currently simulated in-world */
  npcs: {
    id: string;
    name: string;
    x: number;
    y: number;
    color: string;
    factionId?: string | null;
    label?: string | null;
  }[];
  camX: number;
  camY: number;
  camZoom: number;
  targetZoom: number;
  keys: Record<string, boolean>;
  mapReady: boolean;
  roadMask: Uint8Array | null;
  maskW: number;
  maskH: number;
  t: number;
  showMinimap: boolean;
  status: string;
  interactHint: string | null;
  /** live socket textures engineKey → ImageBitmap-ish canvas cache flag */
  liveRev: Record<string, number>;
  /** sub-tile footing colliders from City District */
  footings: import("./footing").FootingInstance[];
  underOverhang: boolean;
  /** Layer IV — wanted heat pursuit */
  heatUnits: HeatUnit[];
  /** Layer IV — plane-fed street decor billboards */
  decor: StreetDecor[];
  /** Layer IV — rule card cooldowns */
  ruleCd: RuleCooldowns;
  /** last speed mult from rules */
  ruleSpeedMult: number;
  /** camera shake remaining (seconds) */
  shake: number;
  /** Layer IV+ foot dust particles */
  dust: { x: number; y: number; life: number; vx: number; vy: number }[];
  /** ambient day phase 0–1 */
  dayPhase: number;
};

export function createEngineState(
  perspectiveId: PerspectiveId = "topdown_openworld",
): EngineState {
  const profile = getPerspective(perspectiveId);
  return {
    perspectiveId: profile.id,
    profile,
    realm: "outdoor",
    worldW: 512 * ENGINE.mapScale,
    worldH: 512 * ENGINE.mapScale,
    outdoorW: 512 * ENGINE.mapScale,
    outdoorH: 512 * ENGINE.mapScale,
    outdoorReturn: null,
    indoorScenes: [],
    indoor: null,
    indoorBake: null,
    player: {
      x: 256 * ENGINE.mapScale,
      y: 256 * ENGINE.mapScale,
      rot: 0,
      mode: "foot",
      vehicleId: null,
      wanted: 0,
    },
    vehicles: [],
    props: [],
    smashFlash: 0,
    smashCount: 0,
    quest: null,
    npcs: [],
    camX: 0,
    camY: 0,
    camZoom: profile.zoom.action,
    targetZoom: profile.zoom.action,
    keys: {},
    mapReady: false,
    roadMask: null,
    maskW: 0,
    maskH: 0,
    t: 0,
    showMinimap: true,
    status: "Walk the city · E: vehicle/door · F: smash props",
    interactHint: null,
    liveRev: {},
    footings: [],
    underOverhang: false,
    heatUnits: [],
    decor: [],
    ruleCd: createCooldowns(),
    ruleSpeedMult: 1,
    shake: 0,
    dust: [],
    dayPhase: 0.35,
  };
}

export function setQuestRuntime(s: EngineState, quest: QuestRuntime | null) {
  s.quest = quest;
  if (quest) {
    s.status = questHudLine(quest) || s.status;
  }
}

function emitQuest(s: EngineState, ev: QuestEvent) {
  if (!s.quest) return;
  s.quest = applyQuestEvent(s.quest, ev);
  const line = questHudLine(s.quest);
  if (line) s.status = line;
  if (s.quest.completed) {
    s.status = `QUEST COMPLETE · ${s.quest.name}`;
  }
}

function noteDestroyed(s: EngineState, before: WorldProp[], after: WorldProp[], kindHint?: string) {
  for (const p of before) {
    if (p.gone) continue;
    const a = after.find((x) => x.id === p.id);
    if (a?.gone) {
      s.smashCount += 1;
      emitQuest(s, {
        kind: "smash",
        propKind: kindHint ?? p.kind,
        at: s.t,
      });
    }
  }
}

function applyRuleEffect(
  s: EngineState,
  effect: ReturnType<typeof evalRules>,
): boolean {
  if (effect.status) s.status = effect.status;
  if (effect.hint) s.interactHint = effect.hint;
  if (effect.wantedDelta) {
    s.player.wanted = Math.max(
      0,
      Math.min(5, s.player.wanted + effect.wantedDelta),
    );
  }
  if (effect.speedMult) s.ruleSpeedMult = effect.speedMult;
  return !!effect.playSiren;
}

function getRuleCards(): RuleCard[] {
  try {
    return useRuleCards.getState().cards;
  } catch {
    return [];
  }
}

function playSirenSafe() {
  try {
    useSoundSprites.getState().playKind("siren", 1);
  } catch {
    /* ignore */
  }
}

export function initIndoors(s: EngineState, extra: IndoorScene[] = []) {
  const builtins = createBuiltinIndoors(s.outdoorW, s.outdoorH);
  const map = new Map<string, IndoorScene>();
  for (const sc of builtins) map.set(sc.id, sc);
  for (const sc of extra) map.set(sc.id, sc);
  s.indoorScenes = [...map.values()];
}

export function spawnWorldProps(s: EngineState) {
  s.props = spawnStreetProps(s.player.x, s.player.y, s.outdoorW, s.outdoorH);
  s.decor = spawnStreetDecor(s.player.x, s.player.y, s.outdoorW, s.outdoorH);
}

export function buildRoadMask(
  imageData: ImageData,
  worldW: number,
  worldH: number,
): { mask: Uint8Array; w: number; h: number } {
  const w = imageData.width;
  const h = imageData.height;
  const mask = new Uint8Array(w * h);
  const d = imageData.data;
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4]!;
    const g = d[i * 4 + 1]!;
    const b = d[i * 4 + 2]!;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = (r + g + b) / 3;
    mask[i] = lum > 40 && lum < 140 && sat < 0.25 ? 1 : 0;
  }
  return { mask, w, h };
}

export function isRoad(s: EngineState, x: number, y: number): boolean {
  if (!s.roadMask || !s.maskW) return true;
  const mx = Math.floor((x / s.worldW) * s.maskW);
  const my = Math.floor((y / s.worldH) * s.maskH);
  if (mx < 0 || my < 0 || mx >= s.maskW || my >= s.maskH) return false;
  return s.roadMask[my * s.maskW + mx] === 1;
}

function defOf(id: string): VehicleDef {
  return VEHICLE_DEFS.find((v) => v.id === id) ?? VEHICLE_DEFS[4]!;
}

export function spawnStarterVehicles(s: EngineState) {
  const cx = s.player.x;
  const cy = s.player.y;
  const defs = VEHICLE_DEFS;
  s.vehicles = [];
  for (let i = 0; i < 5; i++) {
    const d = defs[i % defs.length]!;
    s.vehicles.push({
      id: `v${i}`,
      defId: d.id,
      x: cx + (i - 2) * 55,
      y: cy + 80 + (i % 2) * 30,
      rot: -Math.PI / 2 + (i - 2) * 0.08,
      speed: 0,
      traffic: false,
    });
  }
  for (let i = 0; i < 10; i++) {
    const d = defs[(i + 3) % defs.length]!;
    const ang = (i / 10) * Math.PI * 2;
    s.vehicles.push({
      id: `t${i}`,
      defId: d.id,
      x: cx + Math.cos(ang) * 280,
      y: cy + Math.sin(ang) * 280,
      rot: ang + Math.PI / 2,
      speed: 40 + (i % 3) * 15,
      traffic: true,
    });
  }
}

export function nearestVehicle(s: EngineState): EntityVehicle | null {
  let best: EntityVehicle | null = null;
  let bestD = ENGINE.enterRadius as number;
  for (const v of s.vehicles) {
    if (s.player.mode === "drive" && v.id === s.player.vehicleId) continue;
    const d = Math.hypot(v.x - s.player.x, v.y - s.player.y);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function enterIndoor(s: EngineState, scene: IndoorScene) {
  s.outdoorReturn = { x: s.player.x, y: s.player.y };
  s.realm = "indoor";
  s.indoor = indoorRuntime(scene);
  s.indoorBake = bakeIndoorPixels(scene);
  s.worldW = scene.tw * scene.tileSize;
  s.worldH = scene.th * scene.tileSize;
  s.player.x = (scene.spawnTX + 0.5) * scene.tileSize;
  s.player.y = (scene.spawnTY + 0.5) * scene.tileSize;
  s.player.mode = "foot";
  s.player.vehicleId = null;
  s.targetZoom = zoomTargets(s.profile, "indoor");
  s.status = `Inside ${scene.name}`;
  emitQuest(s, { kind: "enter_indoor", at: s.t });
}

export function exitIndoor(s: EngineState) {
  if (!s.outdoorReturn) return;
  s.realm = "outdoor";
  s.indoor = null;
  s.indoorBake = null;
  s.worldW = s.outdoorW;
  s.worldH = s.outdoorH;
  s.player.x = s.outdoorReturn.x;
  s.player.y = s.outdoorReturn.y + 18;
  s.outdoorReturn = null;
  s.targetZoom = zoomTargets(s.profile, "foot");
  s.status = "Back on the street";
  emitQuest(s, { kind: "exit_indoor", at: s.t });
}

export function trySmash(s: EngineState) {
  if (s.realm === "indoor") {
    s.status = "Nothing to smash indoors (yet)";
    return;
  }
  if (s.player.mode === "drive") {
    s.status = "Exit vehicle to melee · or ram props at speed";
    return;
  }
  const p = nearestProp(s.props, s.player.x, s.player.y, 72);
  if (!p) {
    s.status = "No smashable prop in range";
    return;
  }
  const before = s.props.map((x) => ({ ...x }));
  s.props = s.props.map((x) => (x.id === p.id ? damageProp(x, 16) : x));
  s.smashFlash = 0.25;
  s.shake = Math.max(s.shake, 0.18);
  noteDestroyed(s, before, s.props, p.kind);
  const after = s.props.find((x) => x.id === p.id);
  if (after?.gone) {
    s.player.wanted = Math.min(5, s.player.wanted + 0.35);
    const cards = getRuleCards();
    const effect = evalRules(cards, { type: "smash" }, s.player.wanted);
    const siren = applyRuleEffect(s, effect);
    if (siren && s.t - s.ruleCd.sirenAt > 1.2) {
      playSirenSafe();
      s.ruleCd.sirenAt = s.t;
    }
    ensureHeatUnits(s);
    try {
      useMemoryWeb.getState().engineSmashAt(p.x + p.w / 2, p.y + p.h / 2, 160);
      s.npcs = s.npcs.map((n) => ({
        ...n,
        label: useMemoryWeb.getState().dialogueFor(n.id),
      }));
    } catch {
      /* ignore */
    }
    if (!s.quest?.completed) {
      const stars = wantedStars(s.player.wanted);
      s.status = `Smashed ${propLabel(p)}! · total ${s.smashCount}${stars ? ` · ★${stars}` : ""}`;
    }
  } else {
    s.status = `Hit ${propLabel(p)} · ${after?.hp ?? 0} HP left`;
  }
}

export function tryEnterExit(s: EngineState) {
  if (s.realm === "indoor" && s.indoor) {
    if (indoorOnExitDoor(s.indoor, s.player.x, s.player.y)) {
      exitIndoor(s);
      return;
    }
    const ts = s.indoor.scene.tileSize;
    for (let ty = 0; ty < s.indoor.scene.th; ty++) {
      for (let tx = 0; tx < s.indoor.scene.tw; tx++) {
        if (s.indoor.scene.tiles[ty * s.indoor.scene.tw + tx] !== 2) continue;
        const dx = tx * ts + ts / 2 - s.player.x;
        const dy = ty * ts + ts / 2 - s.player.y;
        if (Math.hypot(dx, dy) < 28) {
          exitIndoor(s);
          return;
        }
      }
    }
    s.status = "Find the glowing exit door";
    return;
  }

  const veh = nearestVehicle(s);
  const door = nearestExteriorDoor(
    s.indoorScenes,
    s.player.x,
    s.player.y,
    ENGINE.doorRadius ?? 52,
  );

  const vehD = veh ? Math.hypot(veh.x - s.player.x, veh.y - s.player.y) : Infinity;
  const doorD = door?.dist ?? Infinity;

  if (s.player.mode === "drive" && s.player.vehicleId) {
    const v = s.vehicles.find((x) => x.id === s.player.vehicleId);
    if (v) {
      v.speed = 0;
      v.traffic = false;
      s.player.x = v.x + Math.cos(v.rot + Math.PI / 2) * 22;
      s.player.y = v.y + Math.sin(v.rot + Math.PI / 2) * 22;
    }
    s.player.mode = "foot";
    s.player.vehicleId = null;
    s.targetZoom = zoomTargets(s.profile, "foot");
    s.status = "On foot · closer camera";
    return;
  }

  if (door && doorD <= vehD) {
    enterIndoor(s, door.scene);
    return;
  }

  if (veh) {
    s.player.mode = "drive";
    s.player.vehicleId = veh.id;
    veh.traffic = false;
    veh.speed = 0;
    s.targetZoom = zoomTargets(s.profile, "drive");
    s.status = `Driving ${defOf(veh.defId).name} · city view`;
    emitQuest(s, { kind: "enter_vehicle", at: s.t });
    const cards = getRuleCards();
    const effect = evalRules(cards, { type: "enter_vehicle" }, s.player.wanted);
    applyRuleEffect(s, effect);
    return;
  }

  s.status = "No vehicle or door in range";
}

function key(s: EngineState, ...codes: string[]) {
  return codes.some((c) => s.keys[c]);
}

export function step(s: EngineState, dt: number) {
  s.t += dt;
  const p = s.player;
  s.interactHint = null;
  s.ruleSpeedMult = 1;
  if (s.smashFlash > 0) s.smashFlash = Math.max(0, s.smashFlash - dt);
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);
  s.props = tickProps(s.props, dt);
  // ambient day/night cycle ~90s full day
  s.dayPhase = (s.dayPhase + dt / 90) % 1;
  // dust age
  s.dust = s.dust
    .map((d) => ({
      ...d,
      life: d.life - dt,
      x: d.x + d.vx * dt,
      y: d.y + d.vy * dt,
    }))
    .filter((d) => d.life > 0);

  {
    const cards = getRuleCards();
    const sprinting = key(s, "ShiftLeft", "ShiftRight");
    const braking = key(s, "Space");
    const effect = evalRules(
      cards,
      { type: "tick", wanted: p.wanted, sprinting, braking },
      p.wanted,
    );
    const siren = applyRuleEffect(s, effect);
    if (siren) {
      const stars = wantedStars(p.wanted);
      if (stars > s.ruleCd.wantedSirenLevel || s.t - s.ruleCd.sirenAt > 4) {
        playSirenSafe();
        s.ruleCd.sirenAt = s.t;
        s.ruleCd.wantedSirenLevel = stars;
      }
    }
  }

  if (s.realm === "indoor" && s.indoor) {
    p.mode = "foot";
    p.vehicleId = null;
    let mx = 0,
      my = 0;
    if (key(s, "KeyW", "ArrowUp")) my -= 1;
    if (key(s, "KeyS", "ArrowDown")) my += 1;
    if (key(s, "KeyA", "ArrowLeft")) mx -= 1;
    if (key(s, "KeyD", "ArrowRight")) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      mx /= len;
      my /= len;
      const spd =
        ENGINE.footSpeed *
        (key(s, "ShiftLeft", "ShiftRight") ? 1.55 : 1) *
        s.ruleSpeedMult;
      const nx = p.x + mx * spd * dt;
      const ny = p.y + my * spd * dt;
      if (!indoorSolidAt(s.indoor, nx, p.y)) p.x = nx;
      if (!indoorSolidAt(s.indoor, p.x, ny)) p.y = ny;
      p.rot = Math.atan2(my, mx);
    }
    if (indoorOnExitDoor(s.indoor, p.x, p.y)) {
      s.interactHint = "E · Exit building";
    }
    s.targetZoom = zoomTargets(s.profile, "indoor");
    s.camZoom += (s.targetZoom - s.camZoom) * s.profile.zoom.lerp;
    s.camX = p.x;
    s.camY = p.y;
    return;
  }

  if (p.mode === "foot") {
    let mx = 0,
      my = 0;
    if (key(s, "KeyW", "ArrowUp")) my -= 1;
    if (key(s, "KeyS", "ArrowDown")) my += 1;
    if (key(s, "KeyA", "ArrowLeft")) mx -= 1;
    if (key(s, "KeyD", "ArrowRight")) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      mx /= len;
      my /= len;
      const spd =
        ENGINE.footSpeed *
        (key(s, "ShiftLeft", "ShiftRight") ? 1.55 : 1) *
        s.ruleSpeedMult;
      const dx = mx * spd * dt;
      const dy = my * spd * dt;
      if (s.footings.length) {
        const res = resolveFootingMove(p.x, p.y, 14, 14, dx, dy, s.footings);
        p.x = res.x;
        p.y = res.y;
      } else {
        p.x += dx;
        p.y += dy;
      }
      p.rot = Math.atan2(my, mx);
      // foot dust
      if (Math.random() < 0.35) {
        s.dust.push({
          x: p.x + (Math.random() - 0.5) * 8,
          y: p.y + (Math.random() - 0.5) * 8,
          life: 0.35 + Math.random() * 0.25,
          vx: -mx * 12 + (Math.random() - 0.5) * 20,
          vy: -my * 12 + (Math.random() - 0.5) * 20,
        });
        if (s.dust.length > 80) s.dust.splice(0, s.dust.length - 80);
      }
    }
    s.underOverhang = s.footings.some((f) => actorUnderOverhang(p.x, p.y, f));
    const veh = nearestVehicle(s);
    const door = nearestExteriorDoor(s.indoorScenes, p.x, p.y, ENGINE.doorRadius);
    if (door && door.dist < (veh ? Math.hypot(veh.x - p.x, veh.y - p.y) : Infinity)) {
      s.interactHint = `E · Enter ${door.scene.name}`;
    } else if (veh) {
      s.interactHint = `E · Enter ${defOf(veh.defId).name}`;
    }
    const near = nearestProp(s.props, p.x, p.y, 72);
    if (near && !s.interactHint) s.interactHint = `F · Smash ${propLabel(near)}`;
  }

  if (p.mode === "drive" && p.vehicleId) {
    const v = s.vehicles.find((x) => x.id === p.vehicleId);
    if (v) {
      const d = defOf(v.defId);
      const max =
        d.maxSpeed *
        (key(s, "ShiftLeft", "ShiftRight") ? 1.15 : 1) *
        s.ruleSpeedMult;
      if (key(s, "KeyW", "ArrowUp")) v.speed += ENGINE.driveAccel * dt;
      if (key(s, "KeyS", "ArrowDown")) v.speed -= ENGINE.driveAccel * 0.7 * dt;
      if (key(s, "Space")) {
        v.speed *= Math.max(0, 1 - ENGINE.driveBrake * dt * 0.02);
        if (Math.abs(v.speed) < 8) v.speed = 0;
      }
      v.speed -= v.speed * ENGINE.driveDrag * dt;
      v.speed = Math.max(-max * 0.35, Math.min(max, v.speed));
      if (Math.abs(v.speed) > 5) {
        const steer =
          (key(s, "KeyA", "ArrowLeft") ? -1 : 0) +
          (key(s, "KeyD", "ArrowRight") ? 1 : 0);
        v.rot += steer * ENGINE.steerRate * (v.speed / max) * dt;
      }
      const nx = v.x + Math.cos(v.rot) * v.speed * dt;
      const ny = v.y + Math.sin(v.rot) * v.speed * dt;
      if (nx >= 0 && ny >= 0 && nx <= s.worldW && ny <= s.worldH) {
        v.x = nx;
        v.y = ny;
      } else {
        v.speed *= 0.4;
        if (Math.abs(v.speed) > 40) p.wanted = Math.min(5, p.wanted + 0.15);
      }
      const before = s.props.map((x) => ({ ...x }));
      const ram = vehicleHitsProp(s.props, v.x, v.y, v.speed);
      s.props = ram.props;
      if (ram.hit) {
        s.smashFlash = 0.2;
        s.shake = Math.max(s.shake, 0.12);
        p.wanted = Math.min(5, p.wanted + 0.08);
        v.speed *= 0.85;
        noteDestroyed(s, before, s.props);
        const cards = getRuleCards();
        const effect = evalRules(cards, { type: "smash" }, p.wanted);
        applyRuleEffect(s, effect);
        ensureHeatUnits(s);
      }
      p.x = v.x;
      p.y = v.y;
      p.rot = v.rot;
    }
  }

  for (const v of s.vehicles) {
    if (!v.traffic || v.id === p.vehicleId) continue;
    if (s.heatUnits.some((h) => h.vehicleId === v.id)) continue;
    const d = defOf(v.defId);
    v.speed = Math.min(d.maxSpeed * 0.35, v.speed + 20 * dt);
    const nx = v.x + Math.cos(v.rot) * v.speed * dt;
    const ny = v.y + Math.sin(v.rot) * v.speed * dt;
    if (canDrive(s, nx, ny) && isRoad(s, nx, ny)) {
      v.x = nx;
      v.y = ny;
    } else {
      v.rot += (Math.random() > 0.5 ? 1 : -1) * 1.2 * dt;
      v.speed *= 0.5;
    }
    if (v.x < 0) v.x = s.worldW;
    if (v.y < 0) v.y = s.worldH;
    if (v.x > s.worldW) v.x = 0;
    if (v.y > s.worldH) v.y = 0;
  }

  ensureHeatUnits(s);
  stepHeat(s, dt);

  p.wanted = Math.max(0, p.wanted - ENGINE.wantedDecay * dt);
  s.targetZoom =
    p.mode === "drive"
      ? zoomTargets(s.profile, "drive")
      : zoomTargets(s.profile, "foot");
  s.camZoom += (s.targetZoom - s.camZoom) * s.profile.zoom.lerp;
  s.camX = p.x;
  s.camY = p.y;
  p.x = Math.max(8, Math.min(s.worldW - 8, p.x));
  p.y = Math.max(8, Math.min(s.worldH - 8, p.y));
}

function canDrive(s: EngineState, x: number, y: number) {
  if (x < 0 || y < 0 || x > s.worldW || y > s.worldH) return false;
  return true;
}

export function vehicleDef(id: string) {
  return defOf(id);
}

export function syncNpcsFromMemory(s: EngineState) {
  const web = useMemoryWeb.getState().web;
  s.npcs = web.agents
    .filter((a) => a.kind === "npc" && a.active)
    .map((a) => ({
      id: a.id,
      name: a.name,
      x: a.engineX ?? s.player.x + 80,
      y: a.engineY ?? s.player.y + 40,
      color: a.color,
      factionId: a.factionId,
      label: useMemoryWeb.getState().dialogueFor(a.id),
    }));
}

export { wantedStars };
