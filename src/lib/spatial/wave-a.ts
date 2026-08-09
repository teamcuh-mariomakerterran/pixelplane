/**
 * Wave A signature plane systems:
 * - Session ghosts (bookmark thumbnails)
 * - Ghost of the game (viewport frames)
 * - Constraint stamps (fixed pixel cages)
 * - Wire heat map scoring
 */

import type { Artboard, WireZone } from "@/lib/pixel/types";

export type GameViewport = {
  id: string;
  name: string;
  x: number;
  y: number;
  /** world-space frame size (can scale independently of resolution) */
  w: number;
  h: number;
  /** target game resolution */
  resW: number;
  resH: number;
  showSafeArea: boolean;
  showHudGuide: boolean;
  color: string;
};

export type ConstraintStamp = {
  id: string;
  name: string;
  x: number;
  y: number;
  /** locked pixel size (content cage) */
  pixelW: number;
  pixelH: number;
  /** display scale on plane (1 = 1 world unit per pixel) */
  scale: number;
  color: string;
  /** if true, paste/generate clamps into this stamp when selected */
  active: boolean;
};

export const VIEWPORT_PRESETS: { label: string; resW: number; resH: number }[] = [
  { label: "GBC 160×144", resW: 160, resH: 144 },
  { label: "GBA 240×160", resW: 240, resH: 160 },
  { label: "NES-ish 256×224", resW: 256, resH: 224 },
  { label: "16:9 320×180", resW: 320, resH: 180 },
  { label: "16:9 640×360", resW: 640, resH: 360 },
  { label: "Square 256×256", resW: 256, resH: 256 },
];

export const STAMP_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "8×8", w: 8, h: 8 },
  { label: "16×16", w: 16, h: 16 },
  { label: "32×32", w: 32, h: 32 },
  { label: "48×48", w: 48, h: 48 },
  { label: "64×64", w: 64, h: 64 },
  { label: "96×96", w: 96, h: 96 },
  { label: "128×128", w: 128, h: 128 },
  { label: "Tile 16×16", w: 16, h: 16 },
];

/** Heat 0..1: coverage of zone by artboard centers + whether folder wired */
export function wireZoneHeat(
  zone: WireZone,
  artboards: Artboard[],
): { heat: number; orphans: number; covered: number; wired: boolean } {
  let covered = 0;
  for (const b of artboards) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    if (cx >= zone.x && cx <= zone.x + zone.w && cy >= zone.y && cy <= zone.y + zone.h) {
      covered++;
    }
  }
  const wired = !!(zone.folderId || zone.folderPath);
  // heat: density + bonus if wired with content, penalty if content without wire
  const density = Math.min(1, covered / 5);
  let heat = density * 0.7 + (wired ? 0.3 : 0);
  if (covered > 0 && !wired) heat = Math.min(1, density * 0.9 + 0.15); // hot orange orphan risk
  if (covered === 0 && wired) heat = 0.2; // wired empty
  return { heat, orphans: wired ? 0 : covered, covered, wired };
}

/** Artboards not inside any enabled wire zone */
export function orphanArtboards(artboards: Artboard[], zones: WireZone[]): Artboard[] {
  const active = zones.filter((z) => z.enabled);
  if (!active.length) return artboards;
  return artboards.filter((b) => {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    return !active.some(
      (z) => cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h,
    );
  });
}

/** Capture a small JPEG dataURL from the main studio canvas for session ghosts */
export function captureCanvasGhostThumb(
  maxW = 96,
  maxH = 64,
  quality = 0.55,
): string | null {
  if (typeof document === "undefined") return null;
  const canvases = [...document.querySelectorAll("canvas")];
  // Prefer largest canvas (main plane)
  let best: HTMLCanvasElement | null = null;
  let bestArea = 0;
  for (const c of canvases) {
    const a = c.width * c.height;
    if (a > bestArea && c.width > 200) {
      best = c;
      bestArea = a;
    }
  }
  if (!best) return null;
  try {
    const scale = Math.min(maxW / best.width, maxH / best.height, 1);
    const w = Math.max(1, Math.round(best.width * scale));
    const h = Math.max(1, Math.round(best.height * scale));
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(best, 0, 0, w, h);
    return off.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}

/** World center from stored camera (matches canvas bookmark math) */
export function worldCenterFromCamera(
  cam: { x: number; y: number; zoom: number },
  screenW = 800,
  screenH = 600,
): { wx: number; wy: number } {
  const z = cam.zoom || 1;
  return {
    wx: (-cam.x + screenW / 2) / z,
    wy: (-cam.y + screenH / 2) / z,
  };
}

/** Clamp paste origin so clipboard fits inside stamp (world = pixel * scale) */
export function clampPasteToStamp(
  stamp: ConstraintStamp,
  pasteX: number,
  pasteY: number,
  clipW: number,
  clipH: number,
): { x: number; y: number } {
  const sw = stamp.pixelW * stamp.scale;
  const sh = stamp.pixelH * stamp.scale;
  // interpret paste in world; clip size in pixels → world if scale 1
  const cw = clipW * stamp.scale;
  const ch = clipH * stamp.scale;
  let x = pasteX;
  let y = pasteY;
  x = Math.max(stamp.x, Math.min(stamp.x + sw - cw, x));
  y = Math.max(stamp.y, Math.min(stamp.y + sh - ch, y));
  return { x, y };
}
