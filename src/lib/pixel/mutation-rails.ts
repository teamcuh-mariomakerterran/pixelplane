/**
 * Mutation Rails — spawn cohesion variants from a source board without re-rolling AI.
 * Each rail is a deliberate transform: hue, neon push, silhouette, dusk grade.
 */

export type MutationRail = {
  id: string;
  name: string;
  tag: string;
};

export const RAILS: MutationRail[] = [
  { id: "neon", name: "Neon push", tag: "hue+sat" },
  { id: "dusk", name: "Dusk grade", tag: "cool grade" },
  { id: "silhouette", name: "Silhouette", tag: "value crush" },
  { id: "chrome", name: "Chrome rim", tag: "edge metal" },
];

function clamp(n: number) {
  return Math.max(0, Math.min(255, n | 0));
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const v = clamp(l * 255);
    return [v, v, v] as const;
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    clamp(hue2rgb(p, q, h + 1 / 3) * 255),
    clamp(hue2rgb(p, q, h) * 255),
    clamp(hue2rgb(p, q, h - 1 / 3) * 255),
  ] as const;
}

export function applyRail(
  src: Uint8ClampedArray,
  railId: string,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3]!;
    if (a < 8) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 0;
      continue;
    }
    let r = src[i]!;
    let g = src[i + 1]!;
    let b = src[i + 2]!;
    if (railId === "neon") {
      const hsl = rgbToHsl(r, g, b);
      const h2 = (hsl.h + 0.18) % 1;
      const s2 = Math.min(1, hsl.s * 1.45 + 0.12);
      const l2 = Math.min(0.72, hsl.l * 1.05 + 0.04);
      [r, g, b] = hslToRgb(h2, s2, l2);
    } else if (railId === "dusk") {
      r = clamp(r * 0.75 + 20);
      g = clamp(g * 0.7 + 10);
      b = clamp(b * 1.15 + 35);
    } else if (railId === "silhouette") {
      const v = (r + g + b) / 3;
      const crush = v < 90 ? 12 : v > 180 ? 230 : 70;
      r = g = b = crush;
    } else if (railId === "chrome") {
      const v = (r + g + b) / 3;
      const edge = v > 140 ? 1.25 : 0.85;
      r = clamp(v * edge + 30);
      g = clamp(v * edge + 32);
      b = clamp(v * edge + 40);
    }
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = a;
  }
  return out;
}

/** Diff lantern: binary mask of differing opaque pixels (A vs B, same size preferred). */
export function diffMask(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
  w: number,
  h: number,
  aw: number,
  ah: number,
  bw: number,
  bh: number,
): { data: Uint8ClampedArray; w: number; h: number; changed: number } {
  const mw = Math.min(w, aw, bw);
  const mh = Math.min(h, ah, bh);
  const data = new Uint8ClampedArray(mw * mh * 4);
  let changed = 0;
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const ia = (y * aw + x) * 4;
      const ib = (y * bw + x) * 4;
      const io = (y * mw + x) * 4;
      const ar = a[ia] ?? 0;
      const ag = a[ia + 1] ?? 0;
      const ab = a[ia + 2] ?? 0;
      const aa = a[ia + 3] ?? 0;
      const br = b[ib] ?? 0;
      const bg = b[ib + 1] ?? 0;
      const bb = b[ib + 2] ?? 0;
      const ba = b[ib + 3] ?? 0;
      const dr = Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb) + Math.abs(aa - ba);
      if (dr > 24) {
        changed++;
        // hot lantern amber
        data[io] = 255;
        data[io + 1] = 180;
        data[io + 2] = 40;
        data[io + 3] = 210;
      }
    }
  }
  return { data, w: mw, h: mh, changed };
}
