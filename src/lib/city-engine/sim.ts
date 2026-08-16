import { ENGINE, VEHICLE_DEFS, type VehicleDef } from "./config";
import {
  indoorSolidAt,
  indoorOnExitDoor,
  nearestExteriorDoor,
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
  emitQuest,
  questHudLine,
  type QuestRuntime,
} from "./quest-runtime";
import {
  connectorNear,
  nearestFixture,
  fixtureSolidAt,
  type VaultLot,
  type IndoorBits,
} from "./vault-runtime";
import {
  loadHouseMemory,
  tickRoaches,
  recordHaunt,
  dropCrumbs,
  roomIsLit,
} from "./house-memory";
import { roomFloor } from "@/lib/vault/types";
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
import type { RuleCard } from "@/store/rule-cards";
import { inferLoco, type LocoState } from "./lab-locomotion";
import { type EngineHost, noopHost } from "./host";
import { stepEngineModules } from "./modules";
import {
  addPop,
  burstDust,
  burstRing,
  hopJuice,
  juiceImpact,
  playJuice,
  sampleRibbon,
  spawnGhost,
  tickJuice,
  type JuiceGhost,
  type JuiceMote,
  type JuicePop,
  type JuiceRing,
  type JuiceShard,
  type JuiceSpark,
  type ProcBurst,
  type RibbonPt,
} from "./juice";
import {
  initIndoors,
  enterIndoor,
  exitIndoor,
  interactFixture,
} from "./indoor-session";

export type { RibbonPt, ProcBurst, JuicePop, JuiceRing, JuiceShard, JuiceMote, JuiceGhost, JuiceSpark };
export { initIndoors, enterIndoor, exitIndoor };

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
  /** Desk/play door — never serialized. */
  host: EngineHost;
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
  vaultLots: VaultLot[];
  indoorBits: IndoorBits | null;
  houseMemory: Record<string, IndoorBits>;
  dialog: { text: string; t: number } | null;
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
  /** camera shake remaining (seconds) — kept in sync with trauma */
  shake: number;
  /** Layer IV+ foot dust particles */
  dust: { x: number; y: number; life: number; vx: number; vy: number }[];
  /** ambient day phase 0–1 */
  dayPhase: number;
  /** Juice: trauma 0..1, shake magnitude = trauma² */
  trauma: number;
  /** Hitstop remaining (seconds) — freeze sim, keep rendering */
  hitstop: number;
  /** Camera zoom punch 0..1 */
  punch: number;
  /** Player squash 0..1 (smash impact) */
  squash: number;
  combo: number;
  comboTimer: number;
  pops: JuicePop[];
  skids: { x: number; y: number; rot: number; life: number }[];
  boostTrail: { x: number; y: number; rot: number; life: number }[];
  /** Time-ribbon: ~240ms position history */
  ribbon: RibbonPt[];
  procBursts: ProcBurst[];
  /** directional camera kick */
  kickX: number;
  kickY: number;
  wasBoosting: boolean;
  wasMoving: boolean;
  /** expanding impact rings */
  rings: JuiceRing[];
  /** flying smash shards */
  shards: JuiceShard[];
  /** RGB split remaining 0..1 */
  chroma: number;
  /** footstep sfx cooldown */
  footCd: number;
  /** lab locomotion */
  loco: { state: LocoState; frame: number; acc: number; clip: string };
  /** motion ghosts */
  ghosts: JuiceGhost[];
  /** glass sparks */
  sparks: JuiceSpark[];
  /** ambient motes */
  motes: JuiceMote[];
  /** white hit flash 0..1 */
  flash: number;
  /** cinematic bars 0..1 */
  letterbox: number;
  /** camera bank from steering */
  bank: number;
  ghostCd: number;
};

export function createEngineState(
  perspectiveId: PerspectiveId = "topdown_openworld",
  host: EngineHost = noopHost(),
): EngineState {
  const profile = getPerspective(perspectiveId);
  return {
    host,
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
    vaultLots: [],
    indoorBits: null,
    houseMemory: loadHouseMemory(),
    dialog: null,
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
    trauma: 0,
    hitstop: 0,
    punch: 0,
    squash: 0,
    combo: 0,
    comboTimer: 0,
    pops: [],
    skids: [],
    boostTrail: [],
    ribbon: [],
    procBursts: [],
    kickX: 0,
    kickY: 0,
    wasBoosting: false,
    wasMoving: false,
    rings: [],
    shards: [],
    chroma: 0,
    footCd: 0,
    loco: { state: "idle", frame: 0, acc: 0, clip: "" },
    ghosts: [],
    sparks: [],
    motes: [],
    flash: 0,
    letterbox: 0,
    bank: 0,
    ghostCd: 0,
  };
}

export function setQuestRuntime(s: EngineState, quest: QuestRuntime | null) {
  s.quest = quest;
  if (quest) {
    s.status = questHudLine(quest) || s.status;
  }
}

function followCam(s: EngineState, dt: number, look: number) {
  const p = s.player;
  const tx = p.x + Math.cos(p.rot) * look;
  const ty = p.y + Math.sin(p.rot) * look;
  const k = 1 - Math.exp(-9 * dt);
  s.camX += (tx - s.camX) * k;
  s.camY += (ty - s.camY) * k;
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
  if (effect.fireTrigger) {
    s.host.fireTrigger(effect.fireTrigger);
  }
  return !!effect.playSiren;
}

function getRuleCards(s: EngineState): RuleCard[] {
  return [...s.host.rules()];
}

function playSirenSafe(s?: EngineState) {
  let pan = 0;
  if (s) {
    const hv = s.heatUnits
      .map((u) => s.vehicles.find((v) => v.id === u.vehicleId))
      .find(Boolean);
    if (hv) {
      const dx = hv.x - s.camX;
      pan = Math.max(-1, Math.min(1, dx / 220));
    }
    s.host.playSfx("siren", 1, pan);
  }
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

export function trySmash(s: EngineState) {
  if (s.realm === "indoor" && s.indoorBits) {
    const bits = s.indoorBits;
    const roach = (bits.roaches ?? []).find(
      (r) => r.roomId === bits.roomId && Math.hypot(r.x - s.player.x, r.y - s.player.y) < 18,
    );
    if (roach) {
      bits.roaches = bits.roaches.filter((r) => r.id !== roach.id);
      juiceImpact(s, roach.x, roach.y, true);
      s.status = "Smashed a roach";
      recordHaunt(bits, "roach", roach.x, roach.y, "Killed a roach");
      return;
    }
    const f = nearestFixture(bits, s.player.x, s.player.y, 28);
    if (f?.destructible) {
      bits.gone[f.id] = true;
      juiceImpact(s, f.x + f.w / 2, f.y + f.h / 2, true);
      s.status = `Smashed ${f.name}`;
      recordHaunt(bits, "smash", f.x, f.y, `Smashed ${f.name}`);
      if (f.crumbs) dropCrumbs(bits, f.x + f.w / 2, f.y + f.h / 2);
      return;
    }
    s.status = "Nothing smashable here";
    return;
  }
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
  const after = s.props.find((x) => x.id === p.id);
  juiceImpact(s, p.x + p.w / 2, p.y + p.h / 2, !!after?.gone);
  noteDestroyed(s, before, s.props, p.kind);
  if (after?.gone) {
    s.player.wanted = Math.min(5, s.player.wanted + 0.35);
    const cards = getRuleCards(s);
    const effect = evalRules(cards, { type: "smash" }, s.player.wanted);
    const siren = applyRuleEffect(s, effect);
    if (siren && s.t - s.ruleCd.sirenAt > 1.2) {
      playSirenSafe(s);
      s.ruleCd.sirenAt = s.t;
    }
    ensureHeatUnits(s);
    s.host.smashAt(p.x + p.w / 2, p.y + p.h / 2, 160);
    s.npcs = s.npcs.map((n) => ({
      ...n,
      label: s.host.dialogueFor(n.id),
    }));
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
    if (s.indoorBits) {
      const next = connectorNear(s.indoorBits, s.player.x, s.player.y);
      if (next) {
        if (next.locked) {
          const need = next.keyId;
          if (need && s.indoorBits.keys.includes(need)) {
            s.indoorBits.unlocked[next.room.id] = true;
            s.status = `Unlocked · ${next.room.name}`;
            recordHaunt(s.indoorBits, "unlock", next.x, next.y, `Unlocked ${next.room.name}`);
            playJuice(s, "chord", 1.1, s.player.x);
          } else {
            s.status = need ? "Locked. Need a key." : "Locked.";
            s.dialog = { text: "The door sticks. Something downstairs doesn't want company.", t: 4 };
            playJuice(s, "hit", 0.7, s.player.x);
            return;
          }
        }
        const dest = next.room;
        s.indoorBits.roomId = dest.id;
        s.indoorBits.floor = roomFloor(dest);
        s.player.x = dest.x + Math.min(28, dest.w * 0.35);
        s.player.y = dest.y + Math.min(32, dest.h * 0.4);
        s.status = next.kind === "stair" ? `${roomFloor(dest) < 0 ? "Downstairs" : "Upstairs"} · ${dest.name}` : dest.name;
        recordHaunt(s.indoorBits, "enter", s.player.x, s.player.y, dest.name);
        playJuice(s, "hop_in", 1.05, s.player.x);
        return;
      }
      const f = nearestFixture(s.indoorBits, s.player.x, s.player.y, 24);
      if (f?.interactable && !s.indoorBits.gone[f.id]) {
        interactFixture(s, f.id);
        return;
      }
    }
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
    playJuice(s, "hop_out", 1);
    hopJuice(s, "OUT");
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
    playJuice(s, "hop_in", 1);
    hopJuice(s, "IN");
    emitQuest(s, { kind: "enter_vehicle", at: s.t });
    const cards = getRuleCards(s);
    const effect = evalRules(cards, { type: "enter_vehicle" }, s.player.wanted);
    applyRuleEffect(s, effect);
    return;
  }

  s.status = "No vehicle or door in range";
}

function key(s: EngineState, ...codes: string[]) {
  return codes.some((c) => s.keys[c]);
}

function tickLoco(s: EngineState, moving: boolean, dt: number) {
  const running = moving && key(s, "ShiftLeft", "ShiftRight");
  const next = inferLoco({
    moving,
    running,
    smashing: s.smashFlash > 0,
    sitting: !!s.indoorBits?.sitting,
  });
  if (next !== s.loco.state) {
    s.loco.state = next;
    s.loco.frame = 0;
    s.loco.acc = 0;
  }
  const fps = next === "run" ? 12 : next === "walk" ? 10 : 5;
  s.loco.acc += dt * fps;
  while (s.loco.acc >= 1) {
    s.loco.acc -= 1;
    s.loco.frame += 1;
  }
}

export function step(s: EngineState, dt: number) {
  s.t += dt;
  tickJuice(s, dt);
  if (s.hitstop > 0) {
    s.hitstop = Math.max(0, s.hitstop - dt);
    return;
  }
  try {
    stepWorld(s, dt);
  } finally {
    stepEngineModules(s, dt);
  }
}

function stepWorld(s: EngineState, dt: number) {
  s.t += dt;
  tickJuice(s, dt);
  if (s.hitstop > 0) {
    s.hitstop = Math.max(0, s.hitstop - dt);
    return;
  }
  const p = s.player;
  const wantedBefore = p.wanted;
  s.interactHint = null;
  s.ruleSpeedMult = 1;
  if (s.smashFlash > 0) s.smashFlash = Math.max(0, s.smashFlash - dt);
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);
  s.props = tickProps(s.props, dt);
  // ambient day/night cycle ~90s full day
  s.dayPhase = (s.dayPhase + dt / 90) % 1;
  if (!s.motes) s.motes = [];
  if (s.motes.length < 28 && Math.random() < 0.38) {
    const night = s.dayPhase > 0.58 && s.dayPhase < 0.92;
    const dusk = s.dayPhase > 0.4 && s.dayPhase < 0.62;
    s.motes.push({
      x: s.camX + (Math.random() - 0.5) * 380,
      y: s.camY + (Math.random() - 0.5) * 260,
      vx: (Math.random() - 0.5) * 14,
      vy: night ? -10 - Math.random() * 16 : 5 + Math.random() * 12,
      life: 1.1 + Math.random() * 1.8,
      size: 1 + Math.random() * 1.8,
      color: night ? "#7dd3fc" : dusk ? "#fb923c" : "#e7e0c8",
    });
  }
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
    const cards = getRuleCards(s);
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
        playSirenSafe(s);
        s.ruleCd.sirenAt = s.t;
        s.ruleCd.wantedSirenLevel = stars;
      }
    }
  }

  if (s.realm === "indoor" && s.indoor) {
    p.mode = "foot";
    p.vehicleId = null;
    const bits = s.indoorBits;
    if (bits) {
      tickRoaches(bits, p.x, p.y, dt);
      if (bits.phoneRingAt != null && s.t >= bits.phoneRingAt && !bits.phoneAnswered) {
        bits.phoneRinging = true;
        if (Math.floor(s.t * 2) !== Math.floor((s.t - dt) * 2)) {
          playJuice(s, "blip", 0.65, p.x);
        }
      }
    }
    let mx = 0,
      my = 0;
    if (!(bits?.sitting)) {
      if (key(s, "KeyW", "ArrowUp")) my -= 1;
      if (key(s, "KeyS", "ArrowDown")) my += 1;
      if (key(s, "KeyA", "ArrowLeft")) mx -= 1;
      if (key(s, "KeyD", "ArrowRight")) mx += 1;
    }
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
      const blockedX = indoorSolidAt(s.indoor, nx, p.y) || (bits ? fixtureSolidAt(bits, nx, p.y) : false);
      const blockedY = indoorSolidAt(s.indoor, p.x, ny) || (bits ? fixtureSolidAt(bits, p.x, ny) : false);
      if (!blockedX) p.x = nx;
      if (!blockedY) p.y = ny;
      p.rot = Math.atan2(my, mx);
      if (Math.random() < 0.28) {
        s.dust.push({
          x: p.x + (Math.random() - 0.5) * 6,
          y: p.y + 4,
          life: 0.28,
          vx: (Math.random() - 0.5) * 12,
          vy: -8 - Math.random() * 10,
        });
      }
      if (bits && (mx || my)) {
        const auto = connectorNear(bits, p.x, p.y, 12);
        if (auto && auto.kind === "door" && !auto.locked) {
          const dest = auto.room;
          const dx = dest.x + dest.w * 0.5 - p.x;
          const dy = dest.y + dest.h * 0.5 - p.y;
          const len = Math.hypot(dx, dy) || 1;
          p.x += (dx / len) * 14;
          p.y += (dy / len) * 14;
          bits.roomId = dest.id;
          bits.floor = roomFloor(dest);
          s.status = dest.name;
        }
      }
    }
    tickLoco(s, !!(mx || my), dt);
    if (indoorOnExitDoor(s.indoor, p.x, p.y)) {
      s.interactHint = "E · Exit building";
    } else if (bits) {
      const f = nearestFixture(bits, p.x, p.y, 24);
      const nxt = connectorNear(bits, p.x, p.y);
      if (bits.sitting) {
        s.interactHint = "E · Stand (again to sleep if this is the couch)";
      } else if (bits.phoneRinging && f?.phone) {
        s.interactHint = "E · Answer the phone";
      } else if (f?.interactable && !bits.gone[f.id]) {
        s.interactHint = `E · ${f.name}`;
      } else if (nxt) {
        s.interactHint = nxt.locked
          ? `E · ${nxt.room.name} (locked)`
          : nxt.kind === "stair"
            ? `E · ${nxt.room.name} (${roomFloor(nxt.room) < 0 ? "down" : "up"})`
            : `E · ${nxt.room.name}`;
      } else if (bits.phoneRinging) {
        s.interactHint = "The phone is ringing";
      } else if (bits && !roomIsLit(bits, bits.roomId)) {
        s.interactHint = "Dark · find a switch";
      }
    }
    s.targetZoom = zoomTargets(s.profile, "indoor");
    s.camZoom += (s.targetZoom - s.camZoom) * s.profile.zoom.lerp;
    followCam(s, dt, 10);
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
      s.footCd = (s.footCd ?? 0) - dt;
      const sprint = key(s, "ShiftLeft", "ShiftRight");
      if (s.footCd <= 0) {
        playJuice(s, "foot", sprint ? 1.08 : 0.92);
        s.footCd = sprint ? 0.22 : 0.32;
      }
      if (!s.wasMoving) s.squash = Math.min(1, s.squash + 0.25);
      s.wasMoving = true;
      if (sprint) sampleRibbon(s, p.x, p.y);
    } else {
      if (s.wasMoving) {
        s.squash = Math.min(1, s.squash + 0.4);
        burstDust(s, p.x, p.y, 8);
        burstRing(s, p.x, p.y, "#c4b89a", 0.22);
      }
      s.wasMoving = false;
    }
    tickLoco(s, !!(mx || my), dt);
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
        s.bank += steer * dt * 3.2;
        s.bank = Math.max(-1, Math.min(1, s.bank));
        if (Math.abs(steer) > 0 && Math.abs(v.speed) > 45 && Math.random() < 0.45) {
          s.skids.push({ x: v.x, y: v.y, rot: v.rot, life: 0.85 });
          if (s.skids.length > 48) s.skids.splice(0, s.skids.length - 48);
        }
      }
      const boosting = key(s, "ShiftLeft", "ShiftRight") && Math.abs(v.speed) > 28;
      if (boosting && !s.wasBoosting) {
        playJuice(s, "boost", 1.05);
        s.letterbox = Math.min(1, s.letterbox + 0.7);
        s.punch = Math.min(1, s.punch + 0.35);
      }
      s.wasBoosting = boosting;
      if (boosting) {
        s.letterbox = Math.max(s.letterbox, 0.55);
        if ((s.ghostCd || 0) <= 0) {
          spawnGhost(s, v.x, v.y, v.rot);
          s.ghostCd = 0.045;
        }
      }
      if (boosting && Math.random() < 0.55) {
        s.boostTrail.push({
          x: v.x - Math.cos(v.rot) * 14,
          y: v.y - Math.sin(v.rot) * 14,
          rot: v.rot,
          life: 0.22,
        });
        if (s.boostTrail.length > 28) s.boostTrail.splice(0, s.boostTrail.length - 28);
      }
      if (key(s, "Space") && Math.abs(v.speed) > 30 && Math.random() < 0.5) {
        s.skids.push({ x: v.x, y: v.y, rot: v.rot, life: 0.7 });
        if (Math.random() < 0.35) playJuice(s, "skid", 0.95, v.x);
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
        const destroyed = before.some(
          (bp) => !bp.gone && s.props.find((x) => x.id === bp.id)?.gone,
        );
        juiceImpact(s, v.x, v.y, destroyed);
        p.wanted = Math.min(5, p.wanted + 0.08);
        v.speed *= 0.85;
        noteDestroyed(s, before, s.props);
        const cards = getRuleCards(s);
        const effect = evalRules(cards, { type: "smash" }, p.wanted);
        applyRuleEffect(s, effect);
        ensureHeatUnits(s);
      }
      p.x = v.x;
      p.y = v.y;
      p.rot = v.rot;
      if (boosting || Math.abs(v.speed) > 50 || s.chroma > 0.1) {
        sampleRibbon(s, v.x, v.y);
      }
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

  if (Math.floor(p.wanted) > Math.floor(wantedBefore)) {
    s.flash = Math.max(s.flash || 0, 0.6);
    s.letterbox = Math.max(s.letterbox || 0, 0.45);
    playJuice(s, "siren", 0.88 + Math.floor(p.wanted) * 0.06);
    addPop(s, p.x, p.y - 22, `${Math.floor(p.wanted)}★ HEAT`, "#ef4444");
    burstRing(s, p.x, p.y, "#ef4444", 0.4);
  }
  p.wanted = Math.max(0, p.wanted - ENGINE.wantedDecay * dt);
  const driveSpeed = p.vehicleId
    ? Math.abs(s.vehicles.find((v) => v.id === p.vehicleId)?.speed ?? 0)
    : 0;
  const boosting = s.wasBoosting && p.mode === "drive";
  s.targetZoom =
    p.mode === "drive"
      ? zoomTargets(s.profile, "drive") * (boosting ? 0.86 : 1)
      : zoomTargets(s.profile, "foot");
  s.camZoom += (s.targetZoom - s.camZoom) * s.profile.zoom.lerp;
  followCam(s, dt, p.mode === "drive" ? 46 + driveSpeed * 0.32 : 18);
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
  const agents = s.host.memoryAgents();
  s.npcs = agents.map((a) => ({
    id: a.id,
    name: a.name,
    x: a.engineX ?? s.player.x + 80,
    y: a.engineY ?? s.player.y + 40,
    color: a.color,
    factionId: a.factionId,
    label: s.host.dialogueFor(a.id),
  }));
}

export { wantedStars };
