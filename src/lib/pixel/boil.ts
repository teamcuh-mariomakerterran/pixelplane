/**
 * Animation boil — non-destructive 1px life on a sprite.
 * Edge pixels jitter; locked highlights (eyes / blades) stay put.
 */

export type BoilPattern = "noise" | "wobble" | "ripple";

export type BoilProfile = {
  intensity: number; // 1–10
  pattern: BoilPattern;
  lockBright: boolean;
  /** Only disturb silhouette / edge pixels (classic boil). */
  edgeOnly: boolean;
};

export const DEFAULT_BOIL: BoilProfile = {
  intensity: 4,
  pattern: "wobble",
  lockBright: true,
  edgeOnly: true,
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

/** Integer frame clock so boil does not flicker at 60fps. */
export function boilFrame(nowMs: number, intensity: number) {
  const fps = 6 + Math.round((intensity / 10) * 6);
  return Math.floor(nowMs / (1000 / fps));
}

export function applyBoil(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  profile: BoilProfile,
  frame: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const amt = Math.max(1, Math.min(10, profile.intensity | 0));
  const chance = 0.08 + amt * 0.045;
  const cx = w * 0.5;
  const cy = h * 0.5;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! < 12) continue;
      if (profile.edgeOnly && !isEdge(src, w, h, x, y)) continue;
      if (profile.lockBright && lum(src[i]!, src[i + 1]!, src[i + 2]!) > 0.82) {
        continue;
      }
      if (hash(x, y, frame * 3 + 1) > chance) continue;

      let dx = 0;
      let dy = 0;
      if (profile.pattern === "wobble") {
        const sx = Math.sin(frame * 0.7 + y * 0.45);
        const sy = Math.cos(frame * 0.55 + x * 0.38);
        dx = sx > 0.35 ? 1 : sx < -0.35 ? -1 : 0;
        dy = sy > 0.45 ? 1 : sy < -0.45 ? -1 : 0;
      } else if (profile.pattern === "ripple") {
        const ang = Math.atan2(y - cy, x - cx) + frame * 0.35;
        dx = Math.cos(ang) > 0.4 ? 1 : Math.cos(ang) < -0.4 ? -1 : 0;
        dy = Math.sin(ang) > 0.4 ? 1 : Math.sin(ang) < -0.4 ? -1 : 0;
      } else {
        const r = hash(x + 9, y + 3, frame);
        if (r < 0.25) dx = 1;
        else if (r < 0.5) dx = -1;
        else if (r < 0.75) dy = 1;
        else dy = -1;
      }
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      // only step into empty or unlocked edge — keep interiors clean
      const ni = (ny * w + nx) * 4;
      if (src[ni + 3]! >= 12 && !isEdge(src, w, h, nx, ny)) continue;
      out[ni] = src[i]!;
      out[ni + 1] = src[i + 1]!;
      out[ni + 2] = src[i + 2]!;
      out[ni + 3] = src[i + 3]!;
      if (dx || dy) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      }
    }
  }
  return out;
}
