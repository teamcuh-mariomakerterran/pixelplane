/**
 * Procedural VFX — multiplies authored NeonPurr sheets, does not replace them.
 * Techniques: radial energy fields, shock rings, sparklets, beam SDF,
 * debris kinematics, dissolve, 1px outline, chromatic fringe, HSV hue.
 */

import { createBuffer, setPixel } from "./buffer";

export type ProcKind = "explosion" | "spark" | "beam" | "debris" | "scar" | "haze";

export type ProcBlend = "alpha" | "add" | "screen";

export type ProcLayerId = "core" | "outer" | "residual";

export type ProcLayer = {
  on: boolean;
  kind: ProcKind | "inherit";
  rate: number;
  alpha: number;
  scale: number;
  start: number;
  end: number;
  blend: ProcBlend;
};

export type ProcVfxSpec = {
  kind: ProcKind;
  hue: number;
  intensity: number;
  frames: number;
  seed: number;
  size: number;
  /** Degrees. 0 = east, 90 = south (screen down). */
  direction: number;
  /** Cone half-width in degrees. 180 = full circle. */
  spread: number;
  layers: Record<ProcLayerId, ProcLayer>;
};

export const PROC_LAYER_IDS: ProcLayerId[] = ["core", "outer", "residual"];

export const PROC_BLENDS: ProcBlend[] = ["alpha", "add", "screen"];

export const PROC_DIRS: { label: string; deg: number }[] = [
  { label: "E", deg: 0 },
  { label: "SE", deg: 45 },
  { label: "S", deg: 90 },
  { label: "SW", deg: 135 },
  { label: "W", deg: 180 },
  { label: "NW", deg: 225 },
  { label: "N", deg: 270 },
  { label: "NE", deg: 315 },
];

export function defaultLayers(): Record<ProcLayerId, ProcLayer> {
  return {
    core: { on: true, kind: "inherit", rate: 1, alpha: 1, scale: 1, start: 0, end: 1, blend: "add" },
    outer: { on: true, kind: "inherit", rate: 0.8, alpha: 0.7, scale: 1.25, start: 0, end: 1, blend: "add" },
    residual: { on: true, kind: "haze", rate: 0.45, alpha: 0.4, scale: 1.45, start: 0.2, end: 1, blend: "screen" },
  };
}

export const PROC_KINDS: ProcKind[] = [
  "explosion",
  "spark",
  "beam",
  "debris",
  "scar",
  "haze",
];

export const PROC_KIND_META: Record<ProcKind, { label: string; hint: string }> = {
  explosion: { label: "Explosion", hint: "Radial core + shock ring + shards" },
  spark: { label: "Spark", hint: "Directional metal streaks" },
  beam: { label: "Beam", hint: "Ion capsule + fringe + afterimage" },
  debris: { label: "Debris", hint: "Chunks with trails" },
  scar: { label: "Scar", hint: "Persistent neon burn" },
  haze: { label: "Haze", hint: "Heat swirl, low alpha" },
};

export type ProcFrame = {
  data: Uint8ClampedArray;
  w: number;
  h: number;
};

export type ProcSheet = {
  frames: ProcFrame[];
  sheet: Uint8ClampedArray;
  sheetW: number;
  sheetH: number;
  frameW: number;
  frameH: number;
};

function hash(x: number, y: number, s: number) {
  let n = (x * 374761393 + y * 668265263 + s * 1274126177) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function rad(d: number) {
  return (d * Math.PI) / 180;
}

function angDelta(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function inCone(dx: number, dy: number, dir: number, spread: number) {
  if (spread >= 179) return true;
  return angDelta(Math.atan2(dy, dx), rad(dir)) <= rad(spread);
}

function hsl(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}

/** Neon wheel: 0 cyan → magenta → purple → amber. */
export function neonHue(t: number): [number, number, number] {
  const u = ((t % 1) + 1) % 1;
  if (u < 0.34) return hsl(0.52 + u * 0.2, 0.95, 0.58);
  if (u < 0.62) return hsl(0.83 + (u - 0.34) * 0.12, 0.92, 0.6);
  if (u < 0.82) return hsl(0.74 - (u - 0.62) * 0.08, 0.88, 0.52);
  return hsl(0.1 + (u - 0.82) * 0.08, 0.95, 0.56);
}

function put(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number,
) {
  if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
  const i = (y * w + x) * 4;
  const da = d[i + 3]! / 255;
  const sa = a / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  d[i] = Math.round((r * sa + d[i]! * da * (1 - sa)) / outA);
  d[i + 1] = Math.round((g * sa + d[i + 1]! * da * (1 - sa)) / outA);
  d[i + 2] = Math.round((b * sa + d[i + 2]! * da * (1 - sa)) / outA);
  d[i + 3] = Math.round(outA * 255);
}

function outline(d: Uint8ClampedArray, w: number, h: number) {
  const src = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! >= 20) continue;
      const n =
        (x > 0 && src[i - 4 + 3]! >= 40) ||
        (x + 1 < w && src[i + 4 + 3]! >= 40) ||
        (y > 0 && src[i - w * 4 + 3]! >= 40) ||
        (y + 1 < h && src[i + w * 4 + 3]! >= 40);
      if (n) {
        d[i] = 10;
        d[i + 1] = 8;
        d[i + 2] = 14;
        d[i + 3] = 230;
      }
    }
  }
}

function fringe(d: Uint8ClampedArray, w: number, h: number) {
  const src = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! < 80) continue;
      const lum = src[i]! * 0.3 + src[i + 1]! * 0.59 + src[i + 2]! * 0.11;
      if (lum < 140) continue;
      const L = ((y * w + (x - 1)) * 4);
      const R = ((y * w + (x + 1)) * 4);
      d[L] = Math.min(255, d[L]! + 40);
      d[R + 2] = Math.min(255, d[R + 2]! + 50);
    }
  }
}

function paintExplosion(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  spec: ProcVfxSpec,
  rgb: [number, number, number],
) {
  const cx = (w - 1) * 0.5;
  const cy = (h - 1) * 0.5;
  const amt = spec.intensity / 10;
  const rMax = Math.min(cx, cy) * (0.35 + amt * 0.6);
  const shock = rMax * (0.25 + t * 0.85);
  const core = rMax * (1 - t) * 0.55;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const n = hash(x, y, spec.seed + (t * 17) | 0);
      const ring = Math.abs(dist - shock);
      if (ring < 1.35 + amt) {
        const a = (1 - ring / 2) * (1 - t * 0.35) * 255;
        put(d, w, h, x, y, 250, 250, 255, a);
      }
      if (dist < core + n * 3) {
        const k = 1 - dist / Math.max(1, core + 3);
        put(d, w, h, x, y, 255, 255, 250, k * 255);
        put(d, w, h, x, y, rgb[0], rgb[1], rgb[2], k * 180);
      } else if (dist < rMax * (0.5 + (1 - t) * 0.5) + n * 4) {
        const k = 1 - dist / rMax;
        put(d, w, h, x, y, rgb[0], rgb[1] * 0.7, rgb[2], k * (1 - t) * 200);
      }
    }
  }
  const shards = 6 + (spec.intensity | 0);
  for (let i = 0; i < shards; i++) {
    const jitter = (hash(i, 3, spec.seed) - 0.5) * 2 * spec.spread;
    const ang = rad(spec.direction + jitter);
    if (!inCone(Math.cos(ang), Math.sin(ang), spec.direction, spec.spread + 4)) continue;
    const spd = rMax * (0.4 + hash(i, 9, spec.seed) * 0.8);
    const px = cx + Math.cos(ang) * spd * t;
    const py = cy + Math.sin(ang) * spd * t;
    const len = 2 + (1 - t) * 4;
    for (let k = 0; k < len; k++) {
      put(
        d, w, h,
        Math.round(px + Math.cos(ang) * k),
        Math.round(py + Math.sin(ang) * k),
        rgb[0], rgb[1], rgb[2],
        (1 - t) * 220,
      );
    }
  }
}

function paintSpark(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  spec: ProcVfxSpec,
  rgb: [number, number, number],
) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const rays = 7 + spec.intensity;
  for (let i = 0; i < rays; i++) {
    const jitter = (hash(i, 1, spec.seed) - 0.5) * 2 * spec.spread;
    const ang = rad(spec.direction + jitter);
    const len = (8 + hash(i, 2, spec.seed) * 18) * (spec.intensity / 8) * (1 - t * 0.4);
    const life = hash(i, 4, spec.seed);
    if (t > 0.2 + life * 0.7) continue;
    for (let k = 0; k < len; k++) {
      const fade = 1 - k / len;
      put(
        d, w, h,
        Math.round(cx + Math.cos(ang) * (k + t * 6)),
        Math.round(cy + Math.sin(ang) * (k + t * 6) - t * 4),
        k < 2 ? 255 : rgb[0],
        k < 2 ? 250 : rgb[1],
        k < 2 ? 240 : rgb[2],
        fade * (1 - t) * 255,
      );
    }
  }
  put(d, w, h, Math.round(cx), Math.round(cy), 255, 255, 255, (1 - t) * 255);
}

function paintBeam(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  spec: ProcVfxSpec,
  rgb: [number, number, number],
) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const dir = rad(spec.direction);
  const thick = 1 + spec.intensity * 0.35;
  const wob = Math.sin(t * 9 + spec.seed) * (1 + spec.intensity * 0.15);
  const reach = Math.min(w, h) * (0.2 + t * 0.42);
  const steps = Math.max(8, reach | 0);
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    if (u * Math.min(w, h) * 0.5 > reach) continue;
    const n = (hash(s, 2, spec.seed) - 0.5) * 1.4;
    const px = cx + Math.cos(dir) * s + Math.cos(dir + Math.PI / 2) * (wob + n);
    const py = cy + Math.sin(dir) * s + Math.sin(dir + Math.PI / 2) * (wob + n);
    for (let o = -thick - 2; o <= thick + 2; o++) {
      const ad = Math.abs(o);
      let r = rgb[0], g = rgb[1], b = rgb[2], a = 0;
      if (ad < thick * 0.35) {
        r = 255; g = 255; b = 250; a = 255;
      } else if (ad < thick) {
        a = 220;
      } else if (ad < thick + 2) {
        a = 90 * (1 - (ad - thick) / 2);
      }
      if (s < 3) a *= s / 3;
      const ox = Math.round(px + Math.cos(dir + Math.PI / 2) * o);
      const oy = Math.round(py + Math.sin(dir + Math.PI / 2) * o);
      put(d, w, h, ox, oy, r, g, b, a * (0.75 + 0.25 * (1 - t)));
    }
  }
}

function paintDebris(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  spec: ProcVfxSpec,
  rgb: [number, number, number],
) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const n = 5 + (spec.intensity / 2) | 0;
  for (let i = 0; i < n; i++) {
    const jitter = (hash(i, 1, spec.seed) - 0.5) * 2 * spec.spread;
    const ang = rad(spec.direction + jitter);
    const spd = 8 + hash(i, 2, spec.seed) * 22;
    const grav = t * t * 14;
    const px = cx + Math.cos(ang) * spd * t;
    const py = cy + Math.sin(ang) * spd * t + grav;
    const s = 1 + ((hash(i, 3, spec.seed) * 3) | 0);
    const rot = hash(i, 4, spec.seed) * t * 8;
    for (let yy = -s; yy <= s; yy++) {
      for (let xx = -s; xx <= s; xx++) {
        const rx = Math.round(px + xx * Math.cos(rot) - yy * Math.sin(rot));
        const ry = Math.round(py + xx * Math.sin(rot) + yy * Math.cos(rot));
        const edge = Math.abs(xx) === s || Math.abs(yy) === s;
        put(
          d, w, h, rx, ry,
          edge ? 12 : rgb[0],
          edge ? 10 : rgb[1] * 0.75,
          edge ? 16 : rgb[2],
          (1 - t * 0.5) * 255,
        );
      }
    }
    if (t > 0.15) {
      put(d, w, h, Math.round(px - Math.cos(ang) * 2), Math.round(py - Math.sin(ang) * 2), rgb[0], rgb[1], rgb[2], 80);
    }
  }
}

function paintScar(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  spec: ProcVfxSpec,
  rgb: [number, number, number],
) {
  const cx = w * 0.5;
  const cy = h * 0.55;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = hash(x, y, spec.seed);
      const crack = Math.abs((y - cy) - Math.sin((x - cx) * 0.4 + spec.seed) * 3);
      const burn = Math.hypot(x - cx, (y - cy) * 1.4);
      if (crack < 1.1 + n * 0.6 && burn < w * 0.42) {
        put(d, w, h, x, y, rgb[0], rgb[1], rgb[2], (1 - t * 0.25) * 200);
      } else if (burn < w * 0.28 + n * 4) {
        put(d, w, h, x, y, 18, 14, 16, (1 - t * 0.3) * 160);
      }
    }
  }
}

function paintHaze(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  spec: ProcVfxSpec,
  rgb: [number, number, number],
) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ang = Math.atan2(y - cy, x - cx) + t * 3;
      const dist = Math.hypot(x - cx, y - cy);
      const n = hash(x + ((ang * 4) | 0), y, spec.seed);
      const band = Math.sin(dist * 0.55 - t * 6 + n * 2);
      if (band > 0.35 && dist < w * 0.46) {
        put(d, w, h, x, y, rgb[0], rgb[1], rgb[2], (band - 0.35) * (1 - t * 0.4) * 110);
      }
    }
  }
}

function paintKind(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  t: number,
  spec: ProcVfxSpec,
  kind: ProcKind,
  rgb: [number, number, number],
) {
  if (kind === "explosion") paintExplosion(d, w, h, t, spec, rgb);
  else if (kind === "spark") paintSpark(d, w, h, t, spec, rgb);
  else if (kind === "beam") paintBeam(d, w, h, t, spec, rgb);
  else if (kind === "debris") paintDebris(d, w, h, t, spec, rgb);
  else if (kind === "scar") paintScar(d, w, h, t, spec, rgb);
  else paintHaze(d, w, h, t, spec, rgb);
}

function compositeLayer(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  blend: ProcBlend,
  alpha: number,
) {
  for (let i = 0; i < dst.length; i += 4) {
    const sa = (src[i + 3]! / 255) * alpha;
    if (sa <= 0.002) continue;
    if (blend === "add") {
      dst[i] = Math.min(255, dst[i]! + src[i]! * sa);
      dst[i + 1] = Math.min(255, dst[i + 1]! + src[i + 1]! * sa);
      dst[i + 2] = Math.min(255, dst[i + 2]! + src[i + 2]! * sa);
      dst[i + 3] = Math.min(255, Math.max(dst[i + 3]!, src[i + 3]! * alpha));
    } else if (blend === "screen") {
      dst[i] = Math.round(255 - (255 - dst[i]!) * (255 - src[i]! * sa) / 255);
      dst[i + 1] = Math.round(255 - (255 - dst[i + 1]!) * (255 - src[i + 1]! * sa) / 255);
      dst[i + 2] = Math.round(255 - (255 - dst[i + 2]!) * (255 - src[i + 2]! * sa) / 255);
      dst[i + 3] = Math.min(255, dst[i + 3]! + src[i + 3]! * alpha * (1 - dst[i + 3]! / 255));
    } else {
      const da = dst[i + 3]! / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      dst[i] = Math.round((src[i]! * sa + dst[i]! * da * (1 - sa)) / outA);
      dst[i + 1] = Math.round((src[i + 1]! * sa + dst[i + 1]! * da * (1 - sa)) / outA);
      dst[i + 2] = Math.round((src[i + 2]! * sa + dst[i + 2]! * da * (1 - sa)) / outA);
      dst[i + 3] = Math.round(outA * 255);
    }
  }
}

function paintFrame(spec: ProcVfxSpec, fi: number): ProcFrame {
  const w = spec.size;
  const h = spec.size;
  const t = spec.frames <= 1 ? 0 : fi / (spec.frames - 1);
  const rgb = neonHue(spec.hue);
  const out = createBuffer(w, h);
  const layers = spec.layers ?? defaultLayers();
  for (const id of PROC_LAYER_IDS) {
    const L = layers[id];
    if (!L?.on) continue;
    if (t + 0.001 < L.start || t - 0.001 > L.end) continue;
    const span = Math.max(0.04, L.end - L.start);
    const raw = ((t - L.start) / span) * L.rate;
    if (raw < 0) continue;
    const fade = raw > 1 ? 1 - Math.min(1, (raw - 1) * 3) : 1;
    if (fade <= 0.02) continue;
    const u = Math.max(0, Math.min(1, raw));
    const kind = L.kind === "inherit" ? spec.kind : L.kind;
    const layerSpec: ProcVfxSpec = {
      ...spec,
      kind,
      intensity: spec.intensity * (0.7 + L.scale * 0.3),
    };
    const buf = createBuffer(w, h);
    paintKind(buf, w, h, u, layerSpec, kind, rgb);
    compositeLayer(out, buf, L.blend, L.alpha * fade);
  }
  outline(out, w, h);
  if (spec.kind !== "haze" && spec.kind !== "scar") fringe(out, w, h);
  return { data: out, w, h };
}

export function generateProcVfx(spec: Partial<ProcVfxSpec> = {}): ProcSheet {
  const full: ProcVfxSpec = {
    kind: spec.kind ?? "explosion",
    hue: spec.hue ?? 0.08,
    intensity: Math.max(1, Math.min(10, spec.intensity ?? 7)),
    frames: Math.max(3, Math.min(8, spec.frames ?? 6)),
    seed: spec.seed ?? (Math.random() * 1e9) | 0,
    size: spec.size ?? 56,
    direction: spec.direction ?? 0,
    spread: spec.spread ?? 70,
    layers: spec.layers ?? defaultLayers(),
  };
  const frames = Array.from({ length: full.frames }, (_, i) => paintFrame(full, i));
  const gap = 1;
  const sheetW = frames.length * full.size + (frames.length - 1) * gap;
  const sheetH = full.size;
  const sheet = createBuffer(sheetW, sheetH);
  frames.forEach((f, i) => {
    const ox = i * (full.size + gap);
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const si = (y * f.w + x) * 4;
        setPixel(sheet, sheetW, sheetH, ox + x, y, f.data[si]!, f.data[si + 1]!, f.data[si + 2]!, f.data[si + 3]!);
      }
    }
  });
  return {
    frames,
    sheet,
    sheetW,
    sheetH,
    frameW: full.size,
    frameH: full.size,
  };
}

export function defaultProcSpec(): ProcVfxSpec {
  return {
    kind: "explosion",
    hue: 0.08,
    intensity: 7,
    frames: 6,
    seed: (Math.random() * 1e9) | 0,
    size: 56,
    direction: 0,
    spread: 70,
    layers: defaultLayers(),
  };
}
