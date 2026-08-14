/**
 * Procedural tile kit — one hand-drawn tile → orientations, wear, edges, corners.
 */

export type TileVariantKind =
  | "base"
  | "rot90"
  | "rot180"
  | "rot270"
  | "flipH"
  | "flipV"
  | "flipD"
  | "flipAD"
  | "worn1"
  | "worn2"
  | "worn3"
  | "worn4"
  | "edgeL"
  | "edgeR"
  | "edgeT"
  | "edgeB"
  | "cornerTL"
  | "cornerTR"
  | "cornerBL"
  | "cornerBR";

export const TILE_VARIANT_META: Record<
  TileVariantKind,
  { name: string; tag: string }
> = {
  base: { name: "Base", tag: "source" },
  rot90: { name: "Rot 90", tag: "turn" },
  rot180: { name: "Rot 180", tag: "turn" },
  rot270: { name: "Rot 270", tag: "turn" },
  flipH: { name: "Flip H", tag: "mirror" },
  flipV: { name: "Flip V", tag: "mirror" },
  flipD: { name: "Flip ↘", tag: "mirror" },
  flipAD: { name: "Flip ↗", tag: "mirror" },
  worn1: { name: "Worn A", tag: "wear" },
  worn2: { name: "Worn B", tag: "wear" },
  worn3: { name: "Worn C", tag: "wear" },
  worn4: { name: "Worn D", tag: "wear" },
  edgeL: { name: "Edge L", tag: "edge" },
  edgeR: { name: "Edge R", tag: "edge" },
  edgeT: { name: "Edge T", tag: "edge" },
  edgeB: { name: "Edge B", tag: "edge" },
  cornerTL: { name: "Corner TL", tag: "corner" },
  cornerTR: { name: "Corner TR", tag: "corner" },
  cornerBL: { name: "Corner BL", tag: "corner" },
  cornerBR: { name: "Corner BR", tag: "corner" },
};

function at(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
) {
  if (x < 0 || y < 0 || x >= w || y >= h) return [0, 0, 0, 0] as const;
  const i = (y * w + x) * 4;
  return [src[i]!, src[i + 1]!, src[i + 2]!, src[i + 3]!] as const;
}

function mapPx(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  fn: (x: number, y: number) => readonly [number, number],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx, sy] = fn(x, y);
      const p = at(src, w, h, sx, sy);
      const i = (y * w + x) * 4;
      out[i] = p[0];
      out[i + 1] = p[1];
      out[i + 2] = p[2];
      out[i + 3] = p[3];
    }
  }
  return out;
}

function rot90(src: Uint8ClampedArray, w: number, h: number) {
  // output is h×w if non-square — we only support square tiles for rot
  const s = Math.min(w, h);
  return mapPx(src, s, s, (x, y) => [y, s - 1 - x]);
}
function rot180(src: Uint8ClampedArray, w: number, h: number) {
  return mapPx(src, w, h, (x, y) => [w - 1 - x, h - 1 - y]);
}
function rot270(src: Uint8ClampedArray, w: number, h: number) {
  const s = Math.min(w, h);
  return mapPx(src, s, s, (x, y) => [s - 1 - y, x]);
}
function flipH(src: Uint8ClampedArray, w: number, h: number) {
  return mapPx(src, w, h, (x, y) => [w - 1 - x, y]);
}
function flipV(src: Uint8ClampedArray, w: number, h: number) {
  return mapPx(src, w, h, (x, y) => [x, h - 1 - y]);
}
function flipD(src: Uint8ClampedArray, w: number, h: number) {
  const s = Math.min(w, h);
  return mapPx(src, s, s, (x, y) => [y, x]);
}
function flipAD(src: Uint8ClampedArray, w: number, h: number) {
  const s = Math.min(w, h);
  return mapPx(src, s, s, (x, y) => [s - 1 - y, s - 1 - x]);
}

function worn(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  seed: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! < 12) continue;
      let n = (x * 1103515245 + y * 12345 + seed * 997) >>> 0;
      n = (n ^ (n >>> 13)) >>> 0;
      const r = (n & 255) / 255;
      if (r < 0.045) {
        // punch a speck
        out[i + 3] = 0;
      } else if (r < 0.09) {
        const d = r < 0.07 ? -18 : 16;
        out[i] = Math.max(0, Math.min(255, src[i]! + d));
        out[i + 1] = Math.max(0, Math.min(255, src[i + 1]! + d));
        out[i + 2] = Math.max(0, Math.min(255, src[i + 2]! + d));
      }
    }
  }
  return out;
}

function rim(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  keep: { l?: boolean; r?: boolean; t?: boolean; b?: boolean },
): Uint8ClampedArray {
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.22));
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ok =
        (keep.l && x < band) ||
        (keep.r && x >= w - band) ||
        (keep.t && y < band) ||
        (keep.b && y >= h - band);
      if (!ok) continue;
      const i = (y * w + x) * 4;
      out[i] = src[i]!;
      out[i + 1] = src[i + 1]!;
      out[i + 2] = src[i + 2]!;
      out[i + 3] = src[i + 3]!;
    }
  }
  return out;
}

export type TileVariant = {
  kind: TileVariantKind;
  data: Uint8ClampedArray;
  w: number;
  h: number;
};

export function generateTileKit(
  src: Uint8ClampedArray,
  w: number,
  h: number,
): TileVariant[] {
  const s = Math.min(w, h);
  const square = s === w && s === h ? src : cropSquare(src, w, h, s);
  const out: TileVariant[] = [
    { kind: "base", data: new Uint8ClampedArray(square), w: s, h: s },
    { kind: "rot90", data: rot90(square, s, s), w: s, h: s },
    { kind: "rot180", data: rot180(square, s, s), w: s, h: s },
    { kind: "rot270", data: rot270(square, s, s), w: s, h: s },
    { kind: "flipH", data: flipH(square, s, s), w: s, h: s },
    { kind: "flipV", data: flipV(square, s, s), w: s, h: s },
    { kind: "flipD", data: flipD(square, s, s), w: s, h: s },
    { kind: "flipAD", data: flipAD(square, s, s), w: s, h: s },
    { kind: "worn1", data: worn(square, s, s, 11), w: s, h: s },
    { kind: "worn2", data: worn(square, s, s, 29), w: s, h: s },
    { kind: "worn3", data: worn(square, s, s, 47), w: s, h: s },
    { kind: "worn4", data: worn(square, s, s, 73), w: s, h: s },
    { kind: "edgeL", data: rim(square, s, s, { l: true }), w: s, h: s },
    { kind: "edgeR", data: rim(square, s, s, { r: true }), w: s, h: s },
    { kind: "edgeT", data: rim(square, s, s, { t: true }), w: s, h: s },
    { kind: "edgeB", data: rim(square, s, s, { b: true }), w: s, h: s },
    { kind: "cornerTL", data: rim(square, s, s, { t: true, l: true }), w: s, h: s },
    { kind: "cornerTR", data: rim(square, s, s, { t: true, r: true }), w: s, h: s },
    { kind: "cornerBL", data: rim(square, s, s, { b: true, l: true }), w: s, h: s },
    { kind: "cornerBR", data: rim(square, s, s, { b: true, r: true }), w: s, h: s },
  ];
  return out;
}

function cropSquare(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  s: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(s * s * 4);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const si = (y * w + x) * 4;
      const di = (y * s + x) * 4;
      out[di] = src[si] ?? 0;
      out[di + 1] = src[si + 1] ?? 0;
      out[di + 2] = src[si + 2] ?? 0;
      out[di + 3] = src[si + 3] ?? 0;
    }
  }
  return out;
}
