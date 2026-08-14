/**
 * Plane particle FX — spark / smoke / magic / dust / slash.
 * Pooled motes · sprite atlas · frustum cull · zoom LOD · global cap.
 */

import { generateParticlePreview } from "@/lib/pixel/generate";
import { bufferToImageData, hexToRgba } from "@/lib/pixel/buffer";

export type ParticleDrawInput = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: string;
  color: string;
  playing?: boolean;
  rate?: number;
  life?: number;
};

export type ParticleView = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  zoom: number;
};

export type ParticleFrameStats = {
  emitters: number;
  drawn: number;
  culled: number;
  motes: number;
  lod: number;
  budgetLeft: number;
};

const MAX_MOTES_PER_FRAME = 220;

export const particleFrameStats: ParticleFrameStats = {
  emitters: 0,
  drawn: 0,
  culled: 0,
  motes: 0,
  lod: 1,
  budgetLeft: MAX_MOTES_PER_FRAME,
};

export function beginParticleFrame() {
  particleFrameStats.emitters = 0;
  particleFrameStats.drawn = 0;
  particleFrameStats.culled = 0;
  particleFrameStats.motes = 0;
  particleFrameStats.lod = 1;
  particleFrameStats.budgetLeft = MAX_MOTES_PER_FRAME;
}

type AtlasEntry = {
  canvas: HTMLCanvasElement;
  cells: { sx: number; sy: number; sw: number; sh: number }[];
};

const atlasCache = new Map<string, AtlasEntry>();

function kindOf(k: string): "spark" | "smoke" | "magic" | "dust" | "slash" {
  if (k === "spark" || k === "smoke" || k === "magic" || k === "dust" || k === "slash") return k;
  return "magic";
}

const FRAME_SIZE = 48;
const FRAME_COUNT = 10;

function getAtlas(kind: string, color: string): AtlasEntry {
  const key = `${kind}|${color}`;
  const hit = atlasCache.get(key);
  if (hit) return hit;

  const [r, g, b] = hexToRgba(color || "#2dd4bf");
  const cols = 5;
  const rows = 2;
  const canvas = document.createElement("canvas");
  canvas.width = FRAME_SIZE * cols;
  canvas.height = FRAME_SIZE * rows;
  const ctx = canvas.getContext("2d")!;
  const cells: AtlasEntry["cells"] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const data = generateParticlePreview(kindOf(kind), FRAME_SIZE, [r, g, b], i, FRAME_COUNT);
    const tmp = document.createElement("canvas");
    tmp.width = FRAME_SIZE;
    tmp.height = FRAME_SIZE;
    tmp.getContext("2d")!.putImageData(bufferToImageData(data, FRAME_SIZE, FRAME_SIZE), 0, 0);
    const cx = (i % cols) * FRAME_SIZE;
    const cy = Math.floor(i / cols) * FRAME_SIZE;
    ctx.drawImage(tmp, cx, cy);
    cells.push({ sx: cx, sy: cy, sw: FRAME_SIZE, sh: FRAME_SIZE });
  }
  const entry = { canvas, cells };
  atlasCache.set(key, entry);
  return entry;
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Mote = {
  ox: number;
  oy: number;
  ang: number;
  speed: number;
  size: number;
  phase: number;
};

const motePool: Mote[][] = [];
const moteCache = new Map<string, Mote[]>();

function acquireMotes(count: number): Mote[] {
  const reused = motePool.pop();
  if (reused) {
    reused.length = 0;
    return reused;
  }
  return [];
}

function motesFor(idSeed: number, count: number, into: Mote[]): Mote[] {
  for (let i = 0; i < count; i++) {
    const s = idSeed * 17 + i * 31;
    into.push({
      ox: hash01(s),
      oy: hash01(s + 1),
      ang: hash01(s + 2) * Math.PI * 2,
      speed: 0.35 + hash01(s + 3) * 0.9,
      size: 0.5 + hash01(s + 4) * 1.6,
      phase: hash01(s + 5),
    });
  }
  return into;
}

function getMotes(seed: string, count: number): Mote[] {
  const key = `${seed}:${count}`;
  let m = moteCache.get(key);
  if (!m) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) | 0;
    m = motesFor(h, count, acquireMotes(count));
    moteCache.set(key, m);
  }
  return m;
}

function lodFactor(zoom: number): number {
  if (zoom < 0.1) return 0.12;
  if (zoom < 0.2) return 0.28;
  if (zoom < 0.35) return 0.5;
  if (zoom < 0.55) return 0.75;
  return 1;
}

/**
 * Draw a particle emitter. World-space; caller already applied camera transform.
 * Pass `view` for frustum cull + LOD.
 */
export function drawParticleSystem(
  ctx: CanvasRenderingContext2D,
  p: ParticleDrawInput & { id?: string },
  camZoom: number,
  nowMs: number,
  view?: ParticleView,
) {
  particleFrameStats.emitters += 1;
  const zoom = view?.zoom ?? camZoom;

  if (view) {
    const pad = Math.max(p.w, p.h) * 0.4;
    if (
      p.x + p.w < view.left - pad ||
      p.x > view.right + pad ||
      p.y + p.h < view.top - pad ||
      p.y > view.bottom + pad
    ) {
      particleFrameStats.culled += 1;
      return;
    }
  }

  const kind = kindOf(p.kind || "magic");
  const playing = p.playing !== false;
  const [cr, cg, cb] = hexToRgba(p.color || "#2dd4bf");
  const t = nowMs / 1000;
  const life = Math.max(0.4, p.life || 1);
  const rate = Math.max(4, Math.min(48, p.rate || 12));
  const seed = p.id || `${p.x},${p.y}`;
  const lod = lodFactor(zoom);
  particleFrameStats.lod = lod;

  // cheap pad
  ctx.fillStyle = `rgba(${cr},${cg},${cb},0.08)`;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.45)`;
  ctx.lineWidth = 1.25 / camZoom;
  ctx.strokeRect(p.x, p.y, p.w, p.h);

  if (!playing) {
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.35)`;
    for (let i = 0; i < 4; i++) {
      const mx = p.x + hash01(i * 9 + p.x) * p.w;
      const my = p.y + hash01(i * 7 + p.y) * p.h;
      ctx.fillRect(mx, my, 2 / camZoom, 2 / camZoom);
    }
    particleFrameStats.drawn += 1;
    return;
  }

  if (lod < 0.15) {
    // far: just a pulsing core
    const pulse = 0.4 + 0.3 * Math.sin(t * 6 + p.x);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${pulse})`;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, Math.max(3, Math.min(p.w, p.h) * 0.22), 0, Math.PI * 2);
    ctx.fill();
    particleFrameStats.drawn += 1;
    return;
  }

  const want = Math.max(3, Math.round(rate * 1.4 * lod));
  const n = Math.min(want, particleFrameStats.budgetLeft);
  if (n <= 0) {
    particleFrameStats.culled += 1;
    return;
  }
  particleFrameStats.budgetLeft -= n;

  const list = getMotes(seed, Math.max(n, Math.round(rate * 1.4)));
  const atlas = getAtlas(kind, p.color || "#2dd4bf");
  const fancy = lod > 0.55 && (kind === "magic" || kind === "spark");

  if (fancy) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(
      p.x + p.w / 2,
      p.y + p.h / 2,
      2,
      p.x + p.w / 2,
      p.y + p.h / 2,
      Math.max(p.w, p.h) * 0.55,
    );
    g.addColorStop(0, `rgba(${cr},${cg},${cb},0.22)`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(p.x - 8, p.y - 8, p.w + 16, p.h + 16);
    ctx.restore();
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < n; i++) {
    const m = list[i]!;
    const age = ((t * m.speed) / life + m.phase) % 1;
    const fade = age < 0.15 ? age / 0.15 : age > 0.7 ? (1 - age) / 0.3 : 1;
    if (fade <= 0.02) continue;

    let px = p.x + m.ox * p.w;
    let py = p.y + m.oy * p.h;
    let sz = Math.max(3, Math.min(p.w, p.h) * 0.22 * m.size);

    if (kind === "magic") {
      const orbit = 0.15 + Math.sin(age * Math.PI) * 0.35;
      px = p.x + p.w * 0.5 + Math.cos(m.ang + age * Math.PI * 2) * p.w * orbit;
      py = p.y + p.h * 0.75 - age * p.h * 0.85 + Math.sin(m.ang * 2 + t) * 4;
      sz *= 0.7 + Math.sin(age * Math.PI) * 0.6;
    } else if (kind === "spark") {
      const dist = age * Math.max(p.w, p.h) * 0.55;
      px = p.x + p.w * 0.5 + Math.cos(m.ang) * dist;
      py = p.y + p.h * 0.55 + Math.sin(m.ang) * dist * 0.7 - age * 10;
      sz *= 1 - age * 0.6;
    } else if (kind === "smoke") {
      px = p.x + m.ox * p.w + Math.sin(t * 0.8 + m.phase * 6) * 6;
      py = p.y + p.h * (0.85 - age * 0.9);
      sz *= 0.6 + age * 1.4;
    } else if (kind === "slash") {
      const u = (m.ox + age) % 1;
      px = p.x + u * p.w;
      py = p.y + p.h * (0.65 - u * 0.35) + Math.sin(u * Math.PI) * -p.h * 0.15;
      sz *= 0.5 + (1 - Math.abs(u - 0.5) * 2) * 0.8;
    } else {
      px = p.x + m.ox * p.w + Math.sin(t + m.phase * 8) * 3;
      py = p.y + m.oy * p.h * 0.4 + age * p.h * 0.7;
      sz *= 0.45 + (1 - age) * 0.4;
    }

    const fi = Math.min(atlas.cells.length - 1, Math.floor(age * atlas.cells.length));
    const cell = atlas.cells[fi]!;
    ctx.globalAlpha = Math.max(0.08, Math.min(1, fade * (kind === "smoke" ? 0.55 : 0.95)));

    if (fancy) {
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.22 * fade})`;
      ctx.beginPath();
      ctx.arc(px, py, sz * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.drawImage(atlas.canvas, cell.sx, cell.sy, cell.sw, cell.sh, px - sz / 2, py - sz / 2, sz, sz);

    if (fancy) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 * fade})`;
      ctx.fillRect(px - 1 / camZoom, py - 1 / camZoom, 2 / camZoom, 2 / camZoom);
    } else if (kind === "smoke" && lod > 0.4) {
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.1 * fade})`;
      ctx.beginPath();
      ctx.ellipse(px, py, sz * 0.7, sz * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "slash" && lod > 0.4) {
      ctx.strokeStyle = `rgba(${Math.min(255, cr + 40)},${Math.min(255, cg + 40)},${Math.min(255, cb + 40)},${0.65 * fade})`;
      ctx.lineWidth = Math.max(1.5, 3 / camZoom);
      ctx.beginPath();
      ctx.moveTo(px - sz, py + sz * 0.2);
      ctx.lineTo(px + sz, py - sz * 0.2);
      ctx.stroke();
    }

    particleFrameStats.motes += 1;
  }

  ctx.restore();
  particleFrameStats.drawn += 1;
}

export function clearParticleSpriteCache() {
  atlasCache.clear();
  for (const m of moteCache.values()) {
    if (motePool.length < 32) motePool.push(m);
  }
  moteCache.clear();
}

export function getParticleStats(): ParticleFrameStats {
  return { ...particleFrameStats };
}
