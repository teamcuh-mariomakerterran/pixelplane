/**
 * Night District hero — 3×3 eight-direction contact sheet.
 * Draw ONE facing, never the whole sheet.
 *
 * Layout (row-major):
 *   NW  N  NE
 *    W  C  E
 *   SW  S  SE
 */

import { findSheetCells, isPackingPixel, type SheetCell } from "./sheet-cells";

export type HeroFacing = {
  canvas: HTMLCanvasElement;
  sx: number;
  sy: number;
};

const HARD_3X3: SheetCell[] = [
  { sx: 21, sy: 9, sw: 35, sh: 65 },
  { sx: 102, sy: 9, sw: 36, sh: 65 },
  { sx: 184, sy: 9, sw: 34, sh: 65 },
  { sx: 21, sy: 89, sw: 35, sh: 62 },
  { sx: 102, sy: 89, sw: 36, sh: 62 },
  { sx: 184, sy: 89, sw: 34, sh: 62 },
  { sx: 21, sy: 169, sw: 35, sh: 60 },
  { sx: 102, sy: 169, sw: 36, sh: 60 },
  { sx: 184, sy: 169, sw: 34, sh: 60 },
];

// atan2 sector 0=E … clockwise → 3×3 index
const DIR8_TO_CELL = [5, 8, 7, 6, 3, 0, 1, 2];

let cacheKey = "";
let cache: HTMLCanvasElement[] = [];

function punchCell(img: HTMLImageElement, cell: SheetCell): HTMLCanvasElement | null {
  const sc = document.createElement("canvas");
  sc.width = Math.max(1, cell.sw);
  sc.height = Math.max(1, cell.sh);
  const ctx = sc.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, cell.sx, cell.sy, cell.sw, cell.sh, 0, 0, cell.sw, cell.sh);
  try {
    const id = ctx.getImageData(0, 0, sc.width, sc.height);
    let opaque = 0;
    for (let i = 0; i < id.data.length; i += 4) {
      if (isPackingPixel(id.data[i]!, id.data[i + 1]!, id.data[i + 2]!, id.data[i + 3]!)) {
        id.data[i + 3] = 0;
      } else if (id.data[i + 3]! > 8) {
        opaque++;
      }
    }
    if (opaque < 20) return null;
    ctx.putImageData(id, 0, 0);
  } catch {
    /* tainted — still usable */
  }
  return sc;
}

export function sliceHeroFacings(img: HTMLImageElement): HTMLCanvasElement[] {
  const key = `${img.src}|${img.naturalWidth}x${img.naturalHeight}`;
  if (cacheKey === key && cache.length) return cache;
  if (!img.complete || img.naturalWidth < 8) return cache;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  if (!tctx) return cache;
  tctx.drawImage(img, 0, 0);
  let cells: SheetCell[] = [];
  try {
    const data = tctx.getImageData(0, 0, w, h);
    cells = findSheetCells(new Uint8ClampedArray(data.data), w, h);
  } catch {
    cells = [];
  }
  cells = cells.filter((c) => c.sw >= 16 && c.sh >= 24 && c.sw * c.sh < w * h * 0.22);
  cells.sort((a, b) => a.sy - b.sy || a.sx - b.sx);
  if (cells.length < 8) {
    cells = HARD_3X3.map((c) => ({ ...c }));
  }
  const out: HTMLCanvasElement[] = [];
  for (const c of cells) {
    const punched = punchCell(img, c);
    if (punched) out.push(punched);
  }
  if (out.length >= 8) {
    cache = out;
    cacheKey = key;
  }
  return out.length ? out : cache;
}

/** 8-way facing from world atan2 (0 = east / +X). Idle uses front (south). */
export function heroFacingIndex(rot: number, moving: boolean, count: number): number {
  if (count <= 0) return 0;
  if (!moving && count >= 9) return 4; // center idle
  const twoPi = Math.PI * 2;
  let a = rot % twoPi;
  if (a < 0) a += twoPi;
  const sector = Math.round(a / (Math.PI / 4)) % 8;
  if (count >= 9) return DIR8_TO_CELL[sector] ?? 7;
  // 8 cells, no center, row-major without middle: NW N NE W E SW S SE
  const noCenter = [4, 7, 6, 5, 3, 0, 1, 2];
  return noCenter[sector] ?? 0;
}

export function drawHeroFacing(
  ctx: CanvasRenderingContext2D,
  facings: HTMLCanvasElement[],
  rot: number,
  moving: boolean,
  x: number,
  y: number,
  zoom: number,
  squash = 1,
) {
  if (!facings.length) return false;
  const cell = facings[heroFacingIndex(rot, moving, facings.length)];
  if (!cell) return false;
  const h = 26 * zoom * squash;
  const w = h * (cell.width / Math.max(1, cell.height));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cell, x - w / 2, y - h * 0.88, w, h);
  ctx.restore();
  return true;
}
