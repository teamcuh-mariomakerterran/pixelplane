/**
 * Cosmetic attachment — variants locked to silhouette anchors so hats/gear
 * don't "float away" while the body animates.
 */

import type { SilhouetteInfo } from "./silhouette";
import { extractSilhouette } from "./silhouette";
import { createBuffer, pasteRegion } from "@/lib/pixel/buffer";

export type CosmeticAnchor =
  | "head"
  | "torso"
  | "feet"
  | "back"
  | "handL"
  | "handR"
  | "custom";

export type CosmeticDef = {
  id: string;
  name: string;
  anchor: CosmeticAnchor;
  /** offset from anchor (pixels) */
  ox: number;
  oy: number;
  /** single cosmetic stamp (or first variant) */
  stamp: Uint8ClampedArray;
  stampW: number;
  stampH: number;
  /** follow silhouette scale (bbox height ratio vs rest) */
  followScale: boolean;
  /** keep stamp center inside silhouette hull when possible */
  lockToSilhouette: boolean;
  scale: number;
};

export type CosmeticVariant = {
  id: string;
  name: string;
  /** hue shift degrees, sat/value multipliers — offline recolor knowledge */
  hue: number;
  sat: number;
  val: number;
};

export function recolorStamp(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  hue: number,
  sat: number,
  val: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3]! < 8) continue;
    let [hh, ss, vv] = rgbToHsv(out[i]!, out[i + 1]!, out[i + 2]!);
    hh = (hh + hue + 360) % 360;
    ss = Math.min(1, Math.max(0, ss * sat));
    vv = Math.min(1, Math.max(0, vv * val));
    const [r, g, b] = hsvToRgb(hh, ss, vv);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }
  return out;
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0,
    gp = 0,
    bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

function anchorOf(sil: SilhouetteInfo, a: CosmeticAnchor) {
  switch (a) {
    case "head":
      return sil.anchors.head;
    case "torso":
      return sil.anchors.torso;
    case "feet":
      return sil.anchors.feet;
    case "back":
      return sil.anchors.back;
    case "handL":
      return sil.anchors.handL;
    case "handR":
      return sil.anchors.handR;
    default:
      return sil.centroid;
  }
}

/**
 * Place cosmetic on each frame, locked to silhouette motion.
 */
export function bakeCosmeticOnAnim(
  frames: Uint8ClampedArray[],
  frameW: number,
  frameH: number,
  def: CosmeticDef,
): Uint8ClampedArray[] {
  const rest = frames[0]
    ? extractSilhouette(frames[0], frameW, frameH)
    : extractSilhouette(createBuffer(frameW, frameH), frameW, frameH);
  const restH = Math.max(1, rest.maxY - rest.minY);

  return frames.map((base) => {
    const sil = extractSilhouette(base, frameW, frameH);
    const out = new Uint8ClampedArray(base);
    if (sil.pixelCount === 0) return out;

    const an = anchorOf(sil, def.anchor);
    let scale = def.scale;
    if (def.followScale) {
      const h = Math.max(1, sil.maxY - sil.minY);
      scale *= h / restH;
    }

    const sw = Math.max(1, Math.round(def.stampW * scale));
    const sh = Math.max(1, Math.round(def.stampH * scale));
    const stamp =
      sw === def.stampW && sh === def.stampH
        ? def.stamp
        : nearestScale(def.stamp, def.stampW, def.stampH, sw, sh);

    let dx = Math.round(an.x + def.ox - sw / 2);
    let dy = Math.round(an.y + def.oy - sh / 2);

    if (def.lockToSilhouette) {
      // pull toward silhouette so gear doesn't float in empty air
      const cx = dx + sw / 2;
      const cy = dy + sh / 2;
      if (
        cx < 0 ||
        cy < 0 ||
        cx >= frameW ||
        cy >= frameH ||
        !sil.mask[Math.floor(cy) * frameW + Math.floor(cx)]
      ) {
        dx = Math.round(an.x - sw / 2);
        dy = Math.round(an.y - sh / 2 + (def.anchor === "head" ? -sh * 0.35 : 0));
      }
      // clamp into frame
      dx = Math.max(-sw + 1, Math.min(frameW - 1, dx));
      dy = Math.max(-sh + 1, Math.min(frameH - 1, dy));
    }

    pasteRegion(out, frameW, frameH, stamp, sw, sh, dx, dy);
    return out;
  });
}

function nearestScale(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Uint8ClampedArray {
  const out = createBuffer(dw, dh);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / dw));
      const sy = Math.min(sh - 1, Math.floor((y * sh) / dh));
      const si = (sy * sw + sx) * 4;
      const di = (y * dw + x) * 4;
      out[di] = src[si]!;
      out[di + 1] = src[si + 1]!;
      out[di + 2] = src[si + 2]!;
      out[di + 3] = src[si + 3]!;
    }
  }
  return out;
}

/** Procedural simple hat stamp for demos / variants */
export function makeHatStamp(
  w = 16,
  h = 12,
  color: [number, number, number] = [200, 60, 60],
): { data: Uint8ClampedArray; w: number; h: number } {
  const data = createBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const brim = y > h * 0.65 && x > 1 && x < w - 2;
      const crown = y <= h * 0.7 && x > w * 0.25 && x < w * 0.75;
      if (brim || crown) {
        const i = (y * w + x) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    }
  }
  return { data, w, h };
}

export function defaultVariants(): CosmeticVariant[] {
  return [
    { id: "v_base", name: "Base", hue: 0, sat: 1, val: 1 },
    { id: "v_gold", name: "Gold", hue: 35, sat: 1.1, val: 1.05 },
    { id: "v_ice", name: "Ice", hue: 200, sat: 0.9, val: 1.1 },
    { id: "v_shadow", name: "Shadow", hue: 270, sat: 0.7, val: 0.65 },
    { id: "v_toxic", name: "Toxic", hue: 100, sat: 1.2, val: 0.95 },
  ];
}
