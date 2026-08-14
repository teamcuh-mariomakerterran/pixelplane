/**
 * Mutation Rails — non-destructive variants from a source board.
 * Each rail is an op stack (recolor, outline, crush, scale, neon bloom).
 * Edit the base; live links re-bake children.
 */

export type RailOpId =
  | "hue"
  | "sat"
  | "grade"
  | "crush"
  | "silhouette"
  | "chrome"
  | "outline"
  | "scale"
  | "dither"
  | "poster"
  | "bloom"
  | "rim";

export type RailOp = {
  id: RailOpId;
  amount: number;
  hue?: number;
  r?: number;
  g?: number;
  b?: number;
  scale?: number;
};

export type MutationRail = {
  id: string;
  name: string;
  tag: string;
  hint: string;
  color: string;
  ops: RailOp[];
};

export const RAILS: MutationRail[] = [
  {
    id: "neon",
    name: "Neon push",
    tag: "hue+sat+bloom",
    hint: "Spin hue, punch saturation, spill a little bloom",
    color: "#ff4ad2",
    ops: [
      { id: "hue", amount: 0.72, hue: 0.16 },
      { id: "sat", amount: 0.85 },
      { id: "bloom", amount: 0.4 },
    ],
  },
  {
    id: "dusk",
    name: "Dusk grade",
    tag: "cool grade",
    hint: "Cool the mids, lift the blues, crush a touch",
    color: "#6b7cff",
    ops: [
      { id: "grade", amount: 0.82, r: 0.74, g: 0.68, b: 1.18 },
      { id: "crush", amount: 0.22 },
    ],
  },
  {
    id: "silhouette",
    name: "Silhouette",
    tag: "value crush + rim",
    hint: "Three-stop value cut with a thin rim so it still reads",
    color: "#e8eaef",
    ops: [
      { id: "silhouette", amount: 1 },
      { id: "rim", amount: 0.72 },
    ],
  },
  {
    id: "chrome",
    name: "Chrome rim",
    tag: "edge metal",
    hint: "Metal grade from luminance + a hard rim",
    color: "#b8c4d4",
    ops: [
      { id: "chrome", amount: 1 },
      { id: "rim", amount: 0.42 },
    ],
  },
  {
    id: "outline",
    name: "Ink outline",
    tag: "1–2px contour",
    hint: "Trace the silhouette in ink without touching interior paint",
    color: "#1a1f28",
    ops: [{ id: "outline", amount: 0.88 }],
  },
  {
    id: "crush",
    name: "8-bit crush",
    tag: "poster + dither",
    hint: "Quantize to a handful of levels, Bayer-dither the rest",
    color: "#4ecb71",
    ops: [
      { id: "poster", amount: 0.9 },
      { id: "dither", amount: 0.38 },
    ],
  },
  {
    id: "scale",
    name: "Scale 2×",
    tag: "nearest grow",
    hint: "Integer nearest-neighbor upscale — pixel-perfect, no blur",
    color: "#e8a838",
    ops: [{ id: "scale", amount: 1, scale: 2 }],
  },
  {
    id: "bloom",
    name: "Neon bloom",
    tag: "hue bleed",
    hint: "Detect neon hues and bake a soft bleed onto neighbors",
    color: "#3ecfcf",
    ops: [{ id: "bloom", amount: 0.92 }],
  },
];

export const CORE_RAIL_IDS = ["neon", "dusk", "silhouette", "chrome"] as const;

export function railById(id: string): MutationRail | undefined {
  return RAILS.find((r) => r.id === id);
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, n | 0));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
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

function isNeonHue(h: number, s: number, l: number) {
  if (s < 0.42 || l < 0.18 || l > 0.92) return false;
  // magenta / pink, cyan, electric purple, hot orange-red
  return (
    h >= 0.78 ||
    h <= 0.06 ||
    (h >= 0.45 && h <= 0.58) ||
    (h >= 0.7 && h <= 0.86)
  );
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function sample(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
) {
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const i = (y * w + x) * 4;
  return [src[i]!, src[i + 1]!, src[i + 2]!, src[i + 3]!] as const;
}

function applyColorOp(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  op: RailOp,
  mix: number,
): Uint8ClampedArray {
  const amt = Math.max(0, Math.min(1, op.amount * mix));
  if (amt <= 0.001) return src;
  const out = new Uint8ClampedArray(src);
  const levels = Math.max(2, Math.round(lerp(18, 4, amt)));
  const step = 255 / (levels - 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3]!;
      if (a < 8) continue;
      let r = src[i]!;
      let g = src[i + 1]!;
      let b = src[i + 2]!;
      const or = r;
      const og = g;
      const ob = b;

      if (op.id === "hue") {
        const hsl = rgbToHsl(r, g, b);
        const shift = (op.hue ?? 0.18) * amt;
        [r, g, b] = hslToRgb((hsl.h + shift + 1) % 1, hsl.s, hsl.l);
      } else if (op.id === "sat") {
        const hsl = rgbToHsl(r, g, b);
        const s2 = Math.min(1, hsl.s * (1 + 0.7 * amt) + 0.08 * amt);
        const l2 = Math.min(0.78, hsl.l * (1 + 0.06 * amt));
        [r, g, b] = hslToRgb(hsl.h, s2, l2);
      } else if (op.id === "grade") {
        r = clamp(r * lerp(1, op.r ?? 0.75, amt) + 18 * amt);
        g = clamp(g * lerp(1, op.g ?? 0.7, amt) + 8 * amt);
        b = clamp(b * lerp(1, op.b ?? 1.15, amt) + 28 * amt);
      } else if (op.id === "crush" || op.id === "poster") {
        r = clamp(Math.round(r / step) * step);
        g = clamp(Math.round(g / step) * step);
        b = clamp(Math.round(b / step) * step);
      } else if (op.id === "dither") {
        const t = ((BAYER4[y & 3]![x & 3]! + 0.5) / 16 - 0.5) * 28 * amt;
        r = clamp(Math.round((r + t) / step) * step);
        g = clamp(Math.round((g + t) / step) * step);
        b = clamp(Math.round((b + t) / step) * step);
      } else if (op.id === "silhouette") {
        const v = (r + g + b) / 3;
        const crush = v < 90 ? 12 : v > 180 ? 230 : 70;
        r = g = b = crush;
      } else if (op.id === "chrome") {
        const v = (r + g + b) / 3;
        const n = sample(src, w, h, x + 1, y);
        const edge = n ? Math.abs(v - (n[0] + n[1] + n[2]) / 3) : 0;
        const metal = v > 140 ? 1.22 : 0.82;
        const sheen = Math.min(40, edge * 0.55);
        r = clamp(v * metal + 28 + sheen);
        g = clamp(v * metal + 30 + sheen * 0.9);
        b = clamp(v * metal + 38 + sheen * 0.7);
      }

      out[i] = clamp(lerp(or, r, amt));
      out[i + 1] = clamp(lerp(og, g, amt));
      out[i + 2] = clamp(lerp(ob, b, amt));
      out[i + 3] = a;
    }
  }
  return out;
}

function applyOutline(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
  color: [number, number, number] = [18, 16, 22],
): Uint8ClampedArray {
  const thick = amount > 0.62 ? 2 : 1;
  const out = new Uint8ClampedArray(src);
  const [cr, cg, cb] = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! >= 8) continue;
      let hit = false;
      for (let dy = -thick; dy <= thick && !hit; dy++) {
        for (let dx = -thick; dx <= thick && !hit; dx++) {
          if (dx === 0 && dy === 0) continue;
          const n = sample(src, w, h, x + dx, y + dy);
          if (n && n[3] >= 8) hit = true;
        }
      }
      if (hit) {
        out[i] = cr;
        out[i + 1] = cg;
        out[i + 2] = cb;
        out[i + 3] = clamp(200 + amount * 55);
      }
    }
  }
  return out;
}

function applyRim(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! < 8) continue;
      let empty = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const n = sample(src, w, h, x + dx, y + dy);
        if (!n || n[3] < 8) {
          empty = true;
          break;
        }
      }
      if (!empty) continue;
      out[i] = clamp(src[i]! + 70 * amount);
      out[i + 1] = clamp(src[i + 1]! + 78 * amount);
      out[i + 2] = clamp(src[i + 2]! + 90 * amount);
    }
  }
  return out;
}

/** Detect neon-hued pixels and bleed a soft gradient onto neighbors. */
export function applyNeonBloom(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  amount: number,
): Uint8ClampedArray {
  const radius = amount > 0.7 ? 3 : 2;
  const bleed = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3]!;
      if (a < 16) continue;
      const hsl = rgbToHsl(src[i]!, src[i + 1]!, src[i + 2]!);
      if (!isNeonHue(hsl.h, hsl.s, hsl.l)) continue;
      const strength = (0.35 + hsl.s * 0.65) * amount;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const dist = Math.hypot(dx, dy);
          if (dist > radius + 0.01) continue;
          const fall = (1 - dist / (radius + 0.35)) * strength;
          const j = (ny * w + nx) * 4;
          bleed[j] += src[i]! * fall;
          bleed[j + 1] += src[i + 1]! * fall;
          bleed[j + 2] += src[i + 2]! * fall;
          bleed[j + 3] += a * fall * 0.55;
        }
      }
    }
  }
  const out = new Uint8ClampedArray(src);
  for (let i = 0; i < out.length; i += 4) {
    const br = bleed[i]!;
    const bg = bleed[i + 1]!;
    const bb = bleed[i + 2]!;
    const ba = bleed[i + 3]!;
    if (ba < 4 && br + bg + bb < 4) continue;
    // screen-ish add so interiors stay readable
    out[i] = clamp(out[i]! + br * 0.55);
    out[i + 1] = clamp(out[i + 1]! + bg * 0.55);
    out[i + 2] = clamp(out[i + 2]! + bb * 0.55);
    if (out[i + 3]! < 8 && ba > 8) {
      out[i + 3] = clamp(ba);
    }
  }
  return out;
}

function applyScale(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  factor: number,
): { data: Uint8ClampedArray; w: number; h: number } {
  const f = Math.max(2, Math.round(factor));
  const nw = w * f;
  const nh = h * f;
  const data = new Uint8ClampedArray(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = (x / f) | 0;
      const sy = (y / f) | 0;
      const si = (sy * w + sx) * 4;
      const di = (y * nw + x) * 4;
      data[di] = src[si]!;
      data[di + 1] = src[si + 1]!;
      data[di + 2] = src[si + 2]!;
      data[di + 3] = src[si + 3]!;
    }
  }
  return { data, w: nw, h: nh };
}

export function applyOps(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  ops: RailOp[],
  master = 1,
): { data: Uint8ClampedArray; w: number; h: number } {
  let data: Uint8ClampedArray = new Uint8ClampedArray(src);
  let cw = w;
  let ch = h;
  const mix = Math.max(0, Math.min(1, master));
  for (const op of ops) {
    if (op.id === "scale") {
      const factor = op.scale ?? (mix > 0.85 ? 3 : 2);
      const scaled = applyScale(data, cw, ch, factor);
      data = scaled.data as Uint8ClampedArray;
      cw = scaled.w;
      ch = scaled.h;
      continue;
    }
    if (op.id === "outline") {
      data = applyOutline(data, cw, ch, op.amount * mix) as Uint8ClampedArray;
      continue;
    }
    if (op.id === "rim") {
      data = applyRim(data, cw, ch, op.amount * mix) as Uint8ClampedArray;
      continue;
    }
    if (op.id === "bloom") {
      data = applyNeonBloom(data, cw, ch, op.amount * mix) as Uint8ClampedArray;
      continue;
    }
    data = applyColorOp(data, cw, ch, op, mix) as Uint8ClampedArray;
  }
  return { data, w: cw, h: ch };
}

export function applyRail(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  railId: string,
  amount = 1,
): { data: Uint8ClampedArray; w: number; h: number } {
  const rail = railById(railId);
  if (!rail) return { data: new Uint8ClampedArray(src), w, h };
  return applyOps(src, w, h, rail.ops, amount);
}

/** Back-compat: old per-pixel apply without size (color rails only). */
export function applyRailFlat(
  src: Uint8ClampedArray,
  railId: string,
): Uint8ClampedArray {
  // assume square-ish; color ops don't need exact size except bloom/outline
  const px = src.length / 4;
  const w = Math.max(1, Math.round(Math.sqrt(px)));
  const h = Math.max(1, Math.round(px / w));
  return applyRail(src, w, h, railId, 1).data;
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
      const dr =
        Math.abs(ar - br) +
        Math.abs(ag - bg) +
        Math.abs(ab - bb) +
        Math.abs(aa - ba);
      if (dr > 24) {
        changed++;
        data[io] = 255;
        data[io + 1] = 180;
        data[io + 2] = 40;
        data[io + 3] = 210;
      }
    }
  }
  return { data, w: mw, h: mh, changed };
}
