/**
 * Animation boil — non-destructive warp on a sprite.
 * Each pattern is a different vector field (gather), not one shared squash.
 */

export type BoilPattern =
  | "noise"
  | "wobble"
  | "ripple"
  | "breathe"
  | "crawl"
  | "shimmer";

export type BoilProfile = {
  intensity: number; // 1–10
  pattern: BoilPattern;
  lockBright: boolean;
  /** Only disturb silhouette / edge pixels (classic boil). */
  edgeOnly: boolean;
};

export const DEFAULT_BOIL: BoilProfile = {
  intensity: 6,
  pattern: "wobble",
  lockBright: true,
  edgeOnly: true,
};

export const BOIL_PATTERNS: BoilPattern[] = [
  "wobble",
  "ripple",
  "breathe",
  "crawl",
  "shimmer",
  "noise",
];

export const BOIL_PATTERN_META: Record<
  BoilPattern,
  { label: string; hint: string }
> = {
  wobble: { label: "Wobble", hint: "Flag-wave — rows slide sideways" },
  ripple: { label: "Ripple", hint: "Rings push out from the center" },
  breathe: { label: "Breathe", hint: "Whole silhouette in / out" },
  crawl: { label: "Crawl", hint: "Outline marches around itself" },
  shimmer: { label: "Shimmer", hint: "Heat color only — no warp" },
  noise: { label: "Noise", hint: "Random static on the edge" },
};

export type BoilSpark = { x: number; y: number; c: [number, number, number] };

export type BoilDrawMotion = {
  shearX: number;
  scaleX: number;
  scaleY: number;
  rot: number;
  ox: number;
  oy: number;
  chroma: number;
};

function hash(x: number, y: number, f: number) {
  let n = (x * 374761393 + y * 668265263 + f * 1274126177) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function lum(r: number, g: number, b: number) {
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

function opaque(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  return src[(y * w + x) * 4 + 3]! >= 12;
}

function isEdge(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
) {
  return (
    !opaque(src, w, h, x - 1, y) ||
    !opaque(src, w, h, x + 1, y) ||
    !opaque(src, w, h, x, y - 1) ||
    !opaque(src, w, h, x, y + 1)
  );
}

function normal(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
) {
  let nx = 0;
  let ny = 0;
  if (!opaque(src, w, h, x - 1, y)) nx -= 1;
  if (!opaque(src, w, h, x + 1, y)) nx += 1;
  if (!opaque(src, w, h, x, y - 1)) ny -= 1;
  if (!opaque(src, w, h, x, y + 1)) ny += 1;
  const l = Math.hypot(nx, ny) || 1;
  return { x: nx / l, y: ny / l };
}

/** Integer frame clock so boil does not flicker at 60fps. */
export function boilFrame(nowMs: number, intensity: number) {
  const fps = 8 + Math.round((intensity / 10) * 8);
  return Math.floor(nowMs / (1000 / fps));
}

/** Per-pattern board transform — only the matching motion, never one shared squash. */
export function boilDrawMotion(
  pattern: BoilPattern,
  nowMs: number,
  intensity: number,
): BoilDrawMotion {
  const t = nowMs / 1000;
  const a = Math.max(1, Math.min(10, intensity)) / 10;
  switch (pattern) {
    case "wobble":
      return {
        shearX: Math.sin(t * 3.4) * 0.07 * a,
        scaleX: 1,
        scaleY: 1,
        rot: 0,
        ox: 0,
        oy: 0,
        chroma: 0,
      };
    case "ripple": {
      const p = Math.sin(t * 5.1);
      return {
        shearX: 0,
        scaleX: 1 + p * 0.045 * a,
        scaleY: 1 + p * 0.045 * a,
        rot: 0,
        ox: 0,
        oy: 0,
        chroma: 0,
      };
    }
    case "breathe": {
      const p = Math.sin(t * 2.3);
      return {
        shearX: 0,
        scaleX: 1 + p * 0.055 * a,
        scaleY: 1 - p * 0.05 * a,
        rot: 0,
        ox: 0,
        oy: 0,
        chroma: 0,
      };
    }
    case "crawl":
      return {
        shearX: 0,
        scaleX: 1,
        scaleY: 1,
        rot: Math.sin(t * 4.6) * 0.03 * a,
        ox: 0,
        oy: 0,
        chroma: 0,
      };
    case "shimmer":
      return {
        shearX: 0,
        scaleX: 1,
        scaleY: 1,
        rot: 0,
        ox: 0,
        oy: 0,
        chroma: 0.45 + a * 0.4,
      };
    default:
      return {
        shearX: 0,
        scaleX: 1,
        scaleY: 1,
        rot: 0,
        ox: Math.round((hash(3, 7, Math.floor(t * 14)) - 0.5) * 2),
        oy: Math.round((hash(9, 1, Math.floor(t * 14) + 4) - 0.5) * 2),
        chroma: 0,
      };
  }
}

function field(
  pattern: BoilPattern,
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  frame: number,
  step: number,
): [number, number] {
  const cx = w * 0.5;
  const cy = h * 0.5;
  if (pattern === "wobble") {
    // flag: every row slides sideways together
    const dx = Math.round(Math.sin(y * 0.42 + frame * 0.85) * step);
    const dy = Math.round(Math.sin(x * 0.12 + frame * 0.35) * (step > 2 ? 1 : 0));
    return [dx, dy];
  }
  if (pattern === "ripple") {
    const d = Math.hypot(x - cx, y - cy);
    const wave = Math.sin(d * 0.48 - frame * 1.05);
    const ang = Math.atan2(y - cy, x - cx);
    return [Math.round(Math.cos(ang) * wave * step), Math.round(Math.sin(ang) * wave * step)];
  }
  if (pattern === "breathe") {
    const n = normal(src, w, h, x, y);
    const k = Math.sin(frame * 0.72) * step;
    return [Math.round(n.x * k), Math.round(n.y * k)];
  }
  if (pattern === "crawl") {
    const n = normal(src, w, h, x, y);
    // clockwise along the contour — never in/out
    return [Math.round(-n.y * step), Math.round(n.x * step)];
  }
  if (pattern === "noise") {
    const r = hash(x + 9, y + 3, frame);
    if (r < 0.25) return [step, 0];
    if (r < 0.5) return [-step, 0];
    if (r < 0.75) return [0, step];
    return [0, -step];
  }
  return [0, 0];
}

export function applyBoil(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  profile: BoilProfile,
  frame: number,
  sparks?: BoilSpark[],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const amt = Math.max(1, Math.min(10, profile.intensity | 0));
  const step = amt >= 8 ? 3 : amt >= 5 ? 2 : 1;
  const pat = profile.pattern;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a0 = src[i + 3]!;

      if (pat === "shimmer") {
        if (a0 < 12) continue;
        if (profile.edgeOnly && !isEdge(src, w, h, x, y)) continue;
        if (profile.lockBright && lum(src[i]!, src[i + 1]!, src[i + 2]!) > 0.82) {
          continue;
        }
        const heat = Math.sin(frame * 0.9 + x * 0.35 + y * 0.2) * (14 + amt * 4);
        const flick = hash(x, y, frame) > 0.45 ? heat : heat * 0.35;
        out[i] = Math.max(0, Math.min(255, src[i]! + flick * 0.55));
        out[i + 1] = Math.max(0, Math.min(255, src[i + 1]! + flick * 0.08));
        out[i + 2] = Math.max(0, Math.min(255, src[i + 2]! - flick * 0.75));
        continue;
      }

      if (a0 < 12) {
        // empty dest: breathe / ripple can pull color in (expand)
        if (pat !== "breathe" && pat !== "ripple") continue;
        if (!isEdge(src, w, h, x, y) && !opaque(src, w, h, x - 1, y) && !opaque(src, w, h, x + 1, y)) {
          continue;
        }
      } else if (profile.edgeOnly && !isEdge(src, w, h, x, y)) {
        continue;
      }
      if (a0 >= 12 && profile.lockBright && lum(src[i]!, src[i + 1]!, src[i + 2]!) > 0.82) {
        continue;
      }

      // noise is sparse; the others move the whole edge together
      if (pat === "noise" && hash(x, y, frame * 3 + 1) > 0.55 + amt * 0.03) continue;

      const [dx, dy] = field(pat, src, w, h, x, y, frame, step);
      if (!dx && !dy) continue;
      const sx = x - dx;
      const sy = y - dy;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) {
        if (a0 >= 12) {
          out[i] = 0;
          out[i + 1] = 0;
          out[i + 2] = 0;
          out[i + 3] = 0;
        }
        continue;
      }
      const si = (sy * w + sx) * 4;
      out[i] = src[si]!;
      out[i + 1] = src[si + 1]!;
      out[i + 2] = src[si + 2]!;
      out[i + 3] = src[si + 3]!;
      if (sparks && sparks.length < 12 && a0 >= 12 && hash(x, y, frame + 9) < 0.07) {
        sparks.push({
          x,
          y,
          c: [src[i]!, src[i + 1]!, src[i + 2]!],
        });
      }
    }
  }
  return out;
}
