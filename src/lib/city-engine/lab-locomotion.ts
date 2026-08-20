/**
 * Lab → Engine locomotion.
 * Character District pads (idle / walk / run / attack) drive the player
 * sprite. If the lab is empty we seed Hero · idle / Hero · walk from the
 * Night District 8-dir sheet so the city always has a cycle to play.
 */

import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { useCharacterDistrict } from "@/store/character-district";
import { createCharacterDistrict } from "@/lib/character-district/layout";
import { sliceHeroFacings, heroFacingIndex } from "./hero-sheet";
import type { AnimFrame, AnimRegion } from "@/lib/pixel/types";

export type LocoState = "idle" | "walk" | "run" | "attack";

export type Cardinal = "down" | "left" | "right" | "up";

export type LocoClip = {
  name: string;
  canvases: HTMLCanvasElement[];
  fps: number;
  source: "lab" | "hero";
  facing?: string | null;
  flipX?: boolean;
};

const canvasCache = new Map<string, HTMLCanvasElement[]>();
let seeded = false;

function bufferToCanvas(data: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const fw = Math.max(1, w | 0);
  const fh = Math.max(1, h | 0);
  c.width = fw;
  c.height = fh;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  const need = fw * fh * 4;
  let src = data;
  if (src.length !== need) {
    const padded = new Uint8ClampedArray(need);
    padded.set(src.subarray(0, Math.min(src.length, need)));
    src = padded;
  }
  try {
    const copy = new Uint8ClampedArray(src.length);
    copy.set(src);
    ctx.putImageData(new ImageData(copy, fw, fh), 0, 0);
  } catch {
    /* skip bad frame */
  }
  return c;
}

function canvasesForAnim(anim: AnimRegion): HTMLCanvasElement[] {
  const hit = canvasCache.get(anim.id + ":" + anim.frames.length + ":" + (anim.frames[0]?.id ?? ""));
  if (hit) return hit;
  const out = anim.frames.map((f) => bufferToCanvas(f.data, anim.frameW, anim.frameH));
  canvasCache.set(anim.id + ":" + anim.frames.length + ":" + (anim.frames[0]?.id ?? ""), out);
  return out;
}

function canvasToFrame(c: HTMLCanvasElement): AnimFrame {
  const ctx = c.getContext("2d");
  const data = ctx
    ? new Uint8ClampedArray(ctx.getImageData(0, 0, c.width, c.height).data)
    : new Uint8ClampedArray(c.width * c.height * 4);
  return { id: uid("frame"), data };
}

/** 6-frame step: torso holds, legs sway, slight bob. */
export function bakeWalkCycle(cell: HTMLCanvasElement, frames = 6): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  const mid = Math.floor(cell.height * 0.58);
  for (let i = 0; i < frames; i++) {
    const c = document.createElement("canvas");
    c.width = cell.width + 6;
    c.height = cell.height + 6;
    const ctx = c.getContext("2d");
    if (!ctx) {
      out.push(cell);
      continue;
    }
    ctx.imageSmoothingEnabled = false;
    const t = (i / frames) * Math.PI * 2;
    const bob = Math.round(Math.sin(t) * 2);
    const leg = Math.round(Math.sin(t) * 3);
    const lean = Math.round(Math.cos(t) * 1);
    ctx.drawImage(cell, 0, 0, cell.width, mid, 3 + lean, 3 + bob, cell.width, mid);
    ctx.drawImage(
      cell,
      0,
      mid,
      cell.width,
      cell.height - mid,
      3 + leg,
      3 + mid + bob,
      cell.width,
      cell.height - mid,
    );
    out.push(c);
  }
  return out;
}

function findAnimByName(names: string[]): AnimRegion | undefined {
  const anims = useStudio.getState().animRegions;
  const lower = names.map((n) => n.toLowerCase());
  return anims.find((a) =>
    lower.some((n) => a.name.toLowerCase() === n || a.name.toLowerCase().startsWith(n)),
  );
}

function districtClips(state: LocoState): AnimRegion[] {
  try {
    const districts = useCharacterDistrict.getState().districts;
    const anims = useStudio.getState().animRegions;
    const out: AnimRegion[] = [];
    const seen = new Set<string>();
    for (const d of districts) {
      const pad = d.statePads.find((p) => p.state === state);
      const ids = [...(pad?.manualAnimIds ?? []), ...(pad?.animIds ?? [])];
      for (const id of ids) {
        if (seen.has(id)) continue;
        const a = anims.find((x) => x.id === id);
        if (a?.frames.length) {
          seen.add(id);
          out.push(a);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** 0 = east / +X, clockwise, canvas Y-down → south. */
export function cardinalFromRot(rot: number): Cardinal {
  const twoPi = Math.PI * 2;
  let a = rot % twoPi;
  if (a < 0) a += twoPi;
  const sector = Math.round(a / (Math.PI / 2)) % 4;
  return (["right", "down", "left", "up"] as const)[sector]!;
}

function clipFacing(anim: AnimRegion): string | null {
  const tagged = (anim.facing as string | null | undefined) ?? null;
  if (tagged) return tagged.toLowerCase();
  const n = anim.name.toLowerCase();
  for (const dir of ["down", "left", "right", "up", "south", "west", "east", "north"]) {
    if (n.includes(dir)) {
      if (dir === "south") return "down";
      if (dir === "west") return "left";
      if (dir === "east") return "right";
      if (dir === "north") return "up";
      return dir;
    }
  }
  return null;
}

function isHeroSeed(name: string): boolean {
  return name.toLowerCase().startsWith("hero ·");
}

function toLoco(anim: AnimRegion, state: LocoState, source: "lab" | "hero" = "lab"): LocoClip {
  return {
    name: anim.name,
    canvases: canvasesForAnim(anim),
    fps: anim.fps || (state === "run" ? 12 : state === "walk" ? 10 : 6),
    source,
    facing: clipFacing(anim),
    flipX: false,
  };
}

function pickFacing(anims: AnimRegion[], cardinal: Cardinal, state: LocoState): AnimRegion | undefined {
  const aliases: Record<Cardinal, string[]> = {
    down: ["down", "south", "s"],
    left: ["left", "west", "w"],
    right: ["right", "east", "e"],
    up: ["up", "north", "n"],
  };
  const keys = aliases[cardinal];
  return anims.find((a) => {
    const f = clipFacing(a);
    if (f && keys.includes(f)) return true;
    const n = a.name.toLowerCase();
    return keys.some((k) => n.includes(`walk-${k}`) || n.endsWith(` ${k}`) || n.includes(`-${k}`));
  }) ?? anims.find((a) => !isHeroSeed(a.name) && (state !== "idle" || /idle/i.test(a.name)));
}

export function inferLoco(opts: {
  moving: boolean;
  running?: boolean;
  smashing?: boolean;
  sitting?: boolean;
}): LocoState {
  if (opts.smashing) return "attack";
  if (opts.sitting) return "idle";
  if (opts.moving && opts.running) return "run";
  if (opts.moving) return "walk";
  return "idle";
}

export function resolveLocoClip(state: LocoState, rot = 0): LocoClip | null {
  const cardinal = cardinalFromRot(rot);
  const bound = districtClips(state);
  if (bound.length) {
    const authored = bound.filter((a) => !isHeroSeed(a.name));
    const pool = authored.length ? authored : bound;
    const picked =
      state === "walk" || state === "run"
        ? pickFacing(pool, cardinal, state) ?? pool[0]
        : pool.find((a) => /idle/i.test(a.name) || a.stateName === "idle") ?? pool[0];
    if (picked) return toLoco(picked, state, "lab");
  }

  if (state === "walk" || state === "run") {
    const named = findAnimByName([
      `walk-${cardinal}`,
      `cat · walk-${cardinal}`,
      `hero · walk-${cardinal}`,
    ]);
    if (named) return toLoco(named, state, isHeroSeed(named.name) ? "hero" : "lab");
  }

  const named =
    state === "walk"
      ? findAnimByName(["cat · walk-down", "walk-down", "hero · walk", "hero walk", "walk"])
      : state === "run"
        ? findAnimByName(["hero · run", "hero run", "run"])
        : state === "attack"
          ? findAnimByName(["hero · attack", "attack", "smash"])
          : findAnimByName(["cat · idle", "hero · idle", "hero idle", "idle"]);
  if (named && named.frames.length) {
    return toLoco(named, state, isHeroSeed(named.name) ? "hero" : "lab");
  }
  return null;
}

export function seedHeroLabFromImage(img: HTMLImageElement) {
  if (seeded) return;
  if (!img.complete || img.naturalWidth < 8) return;
  const existing = useStudio.getState().animRegions.some((a) =>
    a.name.toLowerCase().startsWith("hero ·"),
  );
  if (existing) {
    seeded = true;
    bindIfNeeded();
    return;
  }
  const facings = sliceHeroFacings(img);
  if (facings.length < 8) return;
  const south = facings[7] ?? facings[4] ?? facings[0]!;
  const idleFrames = [south, facings[4] ?? south].map(canvasToFrame);
  const walkFrames = bakeWalkCycle(south, 6).map(canvasToFrame);
  const fw = south.width;
  const fh = south.height;
  const idle: AnimRegion = {
    id: uid("anim"),
    name: "Hero · idle",
    x: 48,
    y: 2480,
    frameW: fw,
    frameH: fh,
    frames: idleFrames,
    fps: 4,
    playing: true,
    currentFrame: 0,
    onionSkin: false,
  };
  const walk: AnimRegion = {
    id: uid("anim"),
    name: "Hero · walk",
    x: 48 + fw + 28,
    y: 2480,
    frameW: walkFrames[0] ? south.width + 6 : fw,
    frameH: walkFrames[0] ? south.height + 6 : fh,
    frames: walkFrames,
    fps: 10,
    playing: true,
    currentFrame: 0,
    onionSkin: false,
  };
  useStudio.setState((s) => ({
    animRegions: [...s.animRegions, idle, walk],
    status: "Hero locomotion seeded · idle + walk bound to Character District",
  }));
  bindClips(idle.id, walk.id);
  seeded = true;
}

function bindIfNeeded() {
  const idle = findAnimByName(["hero · idle"]);
  const walk = findAnimByName(["hero · walk"]);
  if (idle && walk) bindClips(idle.id, walk.id);
}

function bindClips(idleId: string, walkId: string) {
  const store = useCharacterDistrict.getState();
  if (!store.districts.length) {
    const d = createCharacterDistrict({ name: "Hero Locomotion", x: 40, y: 2360 });
    for (const pad of d.statePads) {
      if (pad.state === "idle") pad.manualAnimIds = [idleId];
      if (pad.state === "walk") pad.manualAnimIds = [walkId];
      if (pad.state === "run") pad.manualAnimIds = [walkId];
    }
    useCharacterDistrict.setState({
      districts: [d],
      activeId: d.id,
    });
    store.rebindStates();
    return;
  }
  useCharacterDistrict.setState((s) => ({
    districts: s.districts.map((d, i) => {
      if (i !== 0) return d;
      return {
        ...d,
        statePads: d.statePads.map((pad) => {
          if (pad.state === "idle" && !pad.manualAnimIds.length && !pad.animIds.length) {
            return { ...pad, manualAnimIds: [idleId] };
          }
          if (
            (pad.state === "walk" || pad.state === "run") &&
            !pad.manualAnimIds.length &&
            !pad.animIds.length
          ) {
            return { ...pad, manualAnimIds: [walkId] };
          }
          return pad;
        }),
      };
    }),
  }));
  useCharacterDistrict.getState().rebindStates();
}

export function drawLocoClip(
  ctx: CanvasRenderingContext2D,
  clip: LocoClip,
  frame: number,
  rot: number,
  x: number,
  y: number,
  zoom: number,
  squash = 1,
) {
  if (!clip.canvases.length) return false;
  const cell = clip.canvases[frame % clip.canvases.length];
  if (!cell) return false;
  const authored = clip.source === "lab" && !clip.name.toLowerCase().startsWith("hero ·");
  const h = (authored ? 36 : 26) * zoom * squash;
  const w = h * (cell.width / Math.max(1, cell.height));
  const facingWest = clip.flipX ?? (!clip.facing && Math.cos(rot) < -0.15);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y - h * 0.38);
  if (facingWest) ctx.scale(-1, 1);
  ctx.drawImage(cell, -w / 2, -h * 0.5, w, h);
  ctx.restore();
  return true;
}

export function drawHeroStep(
  ctx: CanvasRenderingContext2D,
  facings: HTMLCanvasElement[],
  rot: number,
  moving: boolean,
  frame: number,
  x: number,
  y: number,
  zoom: number,
  squash = 1,
) {
  if (!facings.length) return false;
  const cell = facings[heroFacingIndex(rot, moving || true, facings.length)];
  if (!cell) return false;
  const h = 26 * zoom * squash;
  const w = h * (cell.width / Math.max(1, cell.height));
  const t = (frame / 6) * Math.PI * 2;
  const bob = moving ? Math.sin(t) * 1.6 * zoom : 0;
  const mid = 0.58;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (moving) {
    const leg = Math.sin(t) * 1.4 * zoom;
    const topH = h * mid;
    const botH = h * (1 - mid);
    ctx.drawImage(
      cell,
      0,
      0,
      cell.width,
      cell.height * mid,
      x - w / 2,
      y - h * 0.88 + bob,
      w,
      topH,
    );
    ctx.drawImage(
      cell,
      0,
      cell.height * mid,
      cell.width,
      cell.height * (1 - mid),
      x - w / 2 + leg,
      y - h * 0.88 + topH + bob,
      w,
      botH,
    );
  } else {
    ctx.drawImage(cell, x - w / 2, y - h * 0.88, w, h);
  }
  ctx.restore();
  return true;
}
