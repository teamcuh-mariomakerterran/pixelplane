/**
 * Sheet → named clips.
 * Detects a grid (RPG Maker 4-dir is first-class), extracts one strip per row,
 * and pulls idle from the standing frame of walk-down.
 *
 * Pure pixels — no stores. Studio / Character District bind the result.
 */

import { extractRegion } from "./buffer";
import { removeBackground } from "./bg-remove";

export type SheetLayoutKind =
  | "rpg-4dir"
  | "rpg-4frame"
  | "rpg-4dir-x2"
  | "8dir"
  | "rows";

export type DetectedSheetGrid = {
  cols: number;
  rows: number;
  frameW: number;
  frameH: number;
  remainderX: number;
  remainderY: number;
  layout: SheetLayoutKind;
  confidence: number;
  /** Per-row clip names, length = rows */
  rowNames: string[];
  idleRow: number;
  idleCol: number;
};

export type SplitClipSpec = {
  name: string;
  state: "idle" | "walk" | "run" | "attack" | "custom";
  facing: string | null;
  frames: Uint8ClampedArray[];
  frameW: number;
  frameH: number;
  fps: number;
};

const RPG_4DIR_ROWS = ["down", "left", "right", "up"] as const;
const DIR8_ROWS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

function isPaper(r: number, g: number, b: number, a: number): boolean {
  if (a < 12) return true;
  return r > 242 && g > 242 && b > 242;
}

function cellOccupancy(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  cw: number,
  ch: number,
): number {
  let n = 0;
  const x1 = Math.min(w, x + cw);
  const y1 = Math.min(h, y + ch);
  for (let py = y; py < y1; py++) {
    for (let px = x; px < x1; px++) {
      const i = (py * w + px) * 4;
      if (!isPaper(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) n++;
    }
  }
  return n / Math.max(1, cw * ch);
}

function gutterEmptiness(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cols: number,
  rows: number,
  fw: number,
  fh: number,
): number {
  let empty = 0;
  let samples = 0;
  for (let c = 1; c < cols; c++) {
    const x = c * fw;
    for (let dy = 0; dy < h; dy += 2) {
      const i = (dy * w + Math.min(w - 1, x)) * 4;
      if (isPaper(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) empty++;
      samples++;
    }
  }
  for (let r = 1; r < rows; r++) {
    const y = r * fh;
    for (let dx = 0; dx < w; dx += 2) {
      const i = (Math.min(h - 1, y) * w + dx) * 4;
      if (isPaper(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) empty++;
      samples++;
    }
  }
  return samples ? empty / samples : 0.5;
}

function layoutFor(cols: number, rows: number): SheetLayoutKind {
  if (cols === 3 && rows === 4) return "rpg-4dir";
  if (cols === 4 && rows === 4) return "rpg-4frame";
  if (cols === 3 && (rows === 8 || rows === 12)) return "rpg-4dir-x2";
  if (rows === 8 && (cols === 3 || cols === 4 || cols === 8)) return "8dir";
  return "rows";
}

function rowNamesFor(layout: SheetLayoutKind, rows: number): string[] {
  if (layout === "rpg-4dir" || (layout === "rpg-4frame" && rows === 4)) {
    return RPG_4DIR_ROWS.map((d) => `walk-${d}`);
  }
  if (layout === "rpg-4dir-x2" && rows >= 8) {
    return [
      ...RPG_4DIR_ROWS.map((d) => `walk-${d}`),
      ...RPG_4DIR_ROWS.map((d) => `walk-b-${d}`),
    ].slice(0, rows);
  }
  if (layout === "8dir" && rows >= 8) {
    return DIR8_ROWS.map((d) => `walk-${d}`);
  }
  return Array.from({ length: rows }, (_, i) => `row-${i + 1}`);
}

/** Standing pose: middle of a 3-frame walk, first of a 4-frame RMXP walk. */
export function idleColFor(cols: number): number {
  if (cols === 3) return 1;
  if (cols >= 4) return 0;
  return 0;
}

function scoreCandidate(
  w: number,
  h: number,
  cols: number,
  rows: number,
  data?: Uint8ClampedArray | null,
): number {
  const fw = Math.floor(w / cols);
  const fh = Math.floor(h / rows);
  if (fw < 8 || fh < 8 || fw > 256 || fh > 256) return -1;
  const rem = w - fw * cols + (h - fh * rows);
  if (rem > Math.max(fw, fh) * 0.2) return -1;

  let score = 0;
  // Prefer character-sized cells
  if (fw >= 16 && fw <= 96 && fh >= 16 && fh <= 128) score += 3;
  if (Math.abs(fw - fh) <= fw * 0.4) score += 1;
  if (rem <= 2) score += 4;
  else score -= rem / 8;

  const layout = layoutFor(cols, rows);
  if (layout === "rpg-4dir") score += 10;
  else if (layout === "rpg-4frame") score += 5;
  else if (layout === "rpg-4dir-x2") score += 4;
  else if (layout === "8dir") score += 3;

  // 3×4 on a ~4:5 sheet (the cat is 256×320) is the classic charset
  const aspect = w / h;
  if (cols === 3 && rows === 4 && aspect > 0.7 && aspect < 0.9) score += 6;

  if (data && data.length >= w * h * 4) {
    const gut = gutterEmptiness(data, w, h, cols, rows, fw, fh);
    score += gut * 3;
    let filled = 0;
    let occSum = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const occ = cellOccupancy(data, w, h, c * fw, r * fh, fw, fh);
        occSum += occ;
        if (occ > 0.004 && occ < 0.85) filled++;
      }
    }
    const cells = cols * rows;
    const fillRatio = filled / cells;
    score += fillRatio * 8;
    const mean = occSum / cells;
    if (mean > 0.01 && mean < 0.4) score += 2;
    // A 32×32 8×10 on this cat sheet leaves most cells as gutter fragments
    if (fillRatio < 0.4) score -= 6;
  }

  return score;
}

export function detectSheetGrid(
  w: number,
  h: number,
  data?: Uint8ClampedArray | null,
): DetectedSheetGrid | null {
  if (w < 16 || h < 16) return null;
  type Cand = { cols: number; rows: number; score: number };
  const cands: Cand[] = [];

  const tryPair = (cols: number, rows: number) => {
    if (cols < 2 || rows < 2 || cols > 16 || rows > 16) return;
    const score = scoreCandidate(w, h, cols, rows, data);
    if (score > 0) cands.push({ cols, rows, score });
  };

  // Known character-sheet layouts first
  tryPair(3, 4);
  tryPair(4, 4);
  tryPair(3, 8);
  tryPair(4, 8);
  tryPair(8, 4);
  tryPair(3, 3);
  tryPair(4, 2);
  tryPair(2, 4);

  for (let cols = 2; cols <= 12; cols++) {
    for (let rows = 2; rows <= 12; rows++) {
      tryPair(cols, rows);
    }
  }

  // Common cell sizes
  for (const cell of [16, 24, 32, 48, 64, 80, 96]) {
    tryPair(Math.floor(w / cell), Math.floor(h / cell));
  }

  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  const best = cands[0]!;
  const frameW = Math.floor(w / best.cols);
  const frameH = Math.floor(h / best.rows);
  const layout = layoutFor(best.cols, best.rows);
  const maxScore = cands[0]!.score;
  return {
    cols: best.cols,
    rows: best.rows,
    frameW,
    frameH,
    remainderX: w - frameW * best.cols,
    remainderY: h - frameH * best.rows,
    layout,
    confidence: Math.max(0.15, Math.min(1, maxScore / 28)),
    rowNames: rowNamesFor(layout, best.rows),
    idleRow: 0,
    idleCol: idleColFor(best.cols),
  };
}

function punchCell(cell: Uint8ClampedArray, fw: number, fh: number): Uint8ClampedArray {
  try {
    const punched = removeBackground(cell, fw, fh, { tolerance: 30 });
    return punched instanceof Uint8ClampedArray ? punched : new Uint8ClampedArray(punched);
  } catch {
    return cell;
  }
}

function opaqueCount(data: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i]! > 12) n++;
  return n;
}

function contentBox(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } | null {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]!;
      if (a <= 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Bottom-align feet, center horizontally, uniform size across the sheet. */
function fitCell(
  cell: Uint8ClampedArray,
  fw: number,
  fh: number,
  outW: number,
  outH: number,
): Uint8ClampedArray {
  const box = contentBox(cell, fw, fh);
  const out = new Uint8ClampedArray(outW * outH * 4);
  if (!box) return out;
  const destX = Math.round((outW - box.w) / 2);
  const destY = outH - box.h - 1;
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const dx = destX + x;
      const dy = destY + y;
      if (dx < 0 || dy < 0 || dx >= outW || dy >= outH) continue;
      const si = ((box.y + y) * fw + (box.x + x)) * 4;
      const di = (dy * outW + dx) * 4;
      out[di] = cell[si]!;
      out[di + 1] = cell[si + 1]!;
      out[di + 2] = cell[si + 2]!;
      out[di + 3] = cell[si + 3]!;
    }
  }
  return out;
}

export function extractGridClips(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  grid: DetectedSheetGrid,
  opts?: { punchBg?: boolean; prefix?: string },
): SplitClipSpec[] {
  const punch = opts?.punchBg !== false;
  const prefix = opts?.prefix ? `${opts.prefix} · ` : "";
  const clips: SplitClipSpec[] = [];
  const { cols, rows, frameW, frameH, rowNames, idleRow, idleCol } = grid;

  const cells: Uint8ClampedArray[][] = [];
  let maxCw = 8;
  let maxCh = 8;
  for (let r = 0; r < rows; r++) {
    const row: Uint8ClampedArray[] = [];
    for (let c = 0; c < cols; c++) {
      let cell: Uint8ClampedArray = extractRegion(data, w, h, c * frameW, r * frameH, frameW, frameH);
      if (punch) cell = new Uint8ClampedArray(punchCell(cell, frameW, frameH));
      row.push(cell);
      const box = contentBox(cell, frameW, frameH);
      if (box) {
        if (box.w > maxCw) maxCw = box.w;
        if (box.h > maxCh) maxCh = box.h;
      }
    }
    cells.push(row);
  }
  const outW = Math.min(frameW, maxCw + 4);
  const outH = Math.min(frameH, maxCh + 4);

  for (let r = 0; r < rows; r++) {
    const frames = (cells[r] ?? [])
      .map((f) => fitCell(f, frameW, frameH, outW, outH))
      .filter((f) => opaqueCount(f) >= 4);
    if (!frames.length) continue;
    const rawName = rowNames[r] ?? `row-${r + 1}`;
    const facing = rawName.replace(/^walk-(b-)?/, "") || null;
    clips.push({
      name: `${prefix}${rawName}`,
      state: "walk",
      facing,
      frames,
      frameW: outW,
      frameH: outH,
      fps: frames.length <= 2 ? 6 : 8,
    });
  }

  const idleSrc = cells[idleRow]?.[idleCol];
  if (idleSrc && opaqueCount(idleSrc) >= 4) {
    clips.unshift({
      name: `${prefix}idle`,
      state: "idle",
      facing: "down",
      frames: [fitCell(idleSrc, frameW, frameH, outW, outH)],
      frameW: outW,
      frameH: outH,
      fps: 4,
    });
  }

  return clips;
}

/** Detect + extract in one shot. Returns [] if the board is not a grid. */
export function splitSheetBuffer(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  opts?: { frameW?: number; frameH?: number; punchBg?: boolean; prefix?: string },
): { grid: DetectedSheetGrid; clips: SplitClipSpec[] } | null {
  let grid: DetectedSheetGrid | null;
  if (opts?.frameW && opts?.frameH) {
    const cols = Math.max(1, Math.floor(w / opts.frameW));
    const rows = Math.max(1, Math.floor(h / opts.frameH));
    const layout = layoutFor(cols, rows);
    grid = {
      cols,
      rows,
      frameW: opts.frameW,
      frameH: opts.frameH,
      remainderX: w - opts.frameW * cols,
      remainderY: h - opts.frameH * rows,
      layout,
      confidence: 1,
      rowNames: rowNamesFor(layout, rows),
      idleRow: 0,
      idleCol: idleColFor(cols),
    };
  } else {
    grid = detectSheetGrid(w, h, data);
  }
  if (!grid || grid.cols < 2 || grid.rows < 2) return null;
  const clips = extractGridClips(data, w, h, grid, opts);
  if (!clips.length) return null;
  return { grid, clips };
}

export function clipPrefixFromBoardName(name: string): string {
  return name
    .replace(/\s*sprite\s*sheet/i, "")
    .replace(/\s*sheet/i, "")
    .trim() || "Clip";
}
