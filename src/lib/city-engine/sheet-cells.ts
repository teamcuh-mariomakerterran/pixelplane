/**
 * Extract individual sprites from magenta / hot-pink / green-keyed citykit sheets
 * so City Engine decor draws ONE prop, not the whole contact sheet.
 *
 * Citykit packing is usually HOT PINK (~226, 0, 125) — not pure magenta (255,0,255).
 */

export type SheetCell = { sx: number; sy: number; sw: number; sh: number };

/** True for packing / gutter pixels that should be transparent. */
export function isPackingPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 12) return true;
  // solid near-black gutters
  if (r < 18 && g < 18 && b < 18) return true;
  // pure / near magenta packing (R+B high, G low)
  if (r > 170 && b > 170 && g < 90) return true;
  // citykit HOT PINK / fuchsia (~226,0,125) — high R, low G, mid B, R dominates
  if (r >= 170 && g <= 90 && b >= 55 && b <= 200 && r - g >= 90) return true;
  // slightly desaturated pink fringes
  if (r >= 190 && g <= 70 && b >= 90 && b <= 180 && r > b && r - g >= 110) return true;
  // green-screen packing (common on some fleets)
  if (g > 150 && r < 110 && b < 110 && g > r + 40 && g > b + 40) return true;
  // lime / chartreuse packing
  if (g > 180 && r > 100 && r < 200 && b < 80 && g > b + 80) return true;
  return false;
}

// back-compat alias used elsewhere
const isMagenta = isPackingPixel;

function contentColumns(data: Uint8ClampedArray, w: number, h: number): boolean[] {
  const col = new Array(w).fill(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!isMagenta(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) col[x] = true;
    }
  }
  return col;
}

function contentRows(data: Uint8ClampedArray, w: number, h: number): boolean[] {
  const row = new Array(h).fill(false);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!isMagenta(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) {
        row[y] = true;
        break;
      }
    }
  }
  return row;
}

function segments(has: boolean[], minLen = 6): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  let i = 0;
  while (i < has.length) {
    while (i < has.length && !has[i]) i++;
    if (i >= has.length) break;
    const start = i;
    while (i < has.length && has[i]) i++;
    const end = i;
    if (end - start >= minLen) out.push({ start, end });
  }
  return out;
}

function tightBounds(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): SheetCell | null {
  let minX = x1,
    minY = y1,
    maxX = x0,
    maxY = y0,
    found = false;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      if (!isMagenta(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
}

/**
 * Within a large cell, re-segment by packing gutters so we don't keep a whole row of buildings.
 */
function splitLargeCell(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cell: SheetCell,
  maxDim: number,
): SheetCell[] {
  if (cell.sw <= maxDim && cell.sh <= maxDim) return [cell];

  // Build local content masks
  const localW = cell.sw;
  const localH = cell.sh;
  const col = new Array(localW).fill(false);
  const row = new Array(localH).fill(false);
  for (let y = 0; y < localH; y++) {
    for (let x = 0; x < localW; x++) {
      const i = ((cell.sy + y) * w + (cell.sx + x)) * 4;
      if (!isMagenta(data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!)) {
        col[x] = true;
        row[y] = true;
      }
    }
  }
  const cols = segments(col, 8);
  const rows = segments(row, 8);
  if (cols.length * rows.length >= 2 && (cols.length > 1 || rows.length > 1)) {
    const out: SheetCell[] = [];
    for (const r of rows) {
      for (const c of cols) {
        const sub = tightBounds(
          data,
          w,
          h,
          cell.sx + c.start,
          cell.sy + r.start,
          cell.sx + c.end,
          cell.sy + r.end,
        );
        if (sub && sub.sw >= 10 && sub.sh >= 10) {
          // recurse if still huge
          if (sub.sw > maxDim || sub.sh > maxDim) {
            out.push(...splitLargeCell(data, w, h, sub, maxDim));
          } else {
            out.push(sub);
          }
        }
      }
    }
    if (out.length) return out;
  }

  // Uniform grid fallback inside the cell
  const gx = Math.max(1, Math.round(cell.sw / Math.min(maxDim, 96)));
  const gy = Math.max(1, Math.round(cell.sh / Math.min(maxDim, 96)));
  if (gx * gy <= 1) {
    // center-crop to maxDim
    const nw = Math.min(cell.sw, maxDim);
    const nh = Math.min(cell.sh, maxDim);
    return [
      {
        sx: cell.sx + Math.floor((cell.sw - nw) / 2),
        sy: cell.sy + Math.floor((cell.sh - nh) / 2),
        sw: nw,
        sh: nh,
      },
    ];
  }
  const tw = Math.floor(cell.sw / gx);
  const th = Math.floor(cell.sh / gy);
  const out: SheetCell[] = [];
  for (let ry = 0; ry < gy; ry++) {
    for (let cx = 0; cx < gx; cx++) {
      const sub = tightBounds(
        data,
        w,
        h,
        cell.sx + cx * tw,
        cell.sy + ry * th,
        cell.sx + (cx + 1) * tw,
        cell.sy + (ry + 1) * th,
      );
      if (sub && sub.sw >= 10 && sub.sh >= 10 && sub.sw * sub.sh < w * h * 0.25) {
        out.push(sub);
      }
    }
  }
  return out.length
    ? out
    : [
        {
          sx: cell.sx + Math.floor((cell.sw - Math.min(cell.sw, maxDim)) / 2),
          sy: cell.sy + Math.floor((cell.sh - Math.min(cell.sh, maxDim)) / 2),
          sw: Math.min(cell.sw, maxDim),
          sh: Math.min(cell.sh, maxDim),
        },
      ];
}

function guessUniformGrid(data: Uint8ClampedArray, w: number, h: number): SheetCell[] {
  let best: SheetCell[] = [];
  for (const [gc, gr] of [
    [4, 4],
    [4, 3],
    [4, 6],
    [3, 4],
    [5, 3],
    [3, 3],
    [4, 2],
    [5, 2],
    [3, 2],
    [2, 4],
    [6, 3],
    [4, 5],
    [3, 5],
    [2, 5],
  ] as [number, number][]) {
    const cw = Math.floor(w / gc);
    const ch = Math.floor(h / gr);
    if (cw < 14 || ch < 14) continue;
    const cells: SheetCell[] = [];
    for (let ry = 0; ry < gr; ry++) {
      for (let cx = 0; cx < gc; cx++) {
        const cell = tightBounds(data, w, h, cx * cw, ry * ch, (cx + 1) * cw, (ry + 1) * ch);
        if (cell && cell.sw >= 10 && cell.sh >= 10) {
          // reject cells that are almost the whole sheet
          if (cell.sw * cell.sh > w * h * 0.45) continue;
          cells.push(cell);
        }
      }
    }
    if (cells.length > best.length) best = cells;
  }
  return best.length >= 2 ? best : [];
}

/** Find grid cells of non-packing content on a sheet image. */
export function findSheetCells(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): SheetCell[] {
  const cols = segments(contentColumns(data, w, h), 6);
  const rows = segments(contentRows(data, w, h), 6);

  // Strong gap-based grid (preferred when packing color is detected)
  if (cols.length >= 2 && rows.length >= 1) {
    const cells: SheetCell[] = [];
    for (const r of rows) {
      for (const c of cols) {
        const cell = tightBounds(data, w, h, c.start, r.start, c.end, r.end);
        if (cell && cell.sw >= 8 && cell.sh >= 8) cells.push(cell);
      }
    }
    if (cells.length >= 2) return cells;
  }
  if (rows.length >= 2 && cols.length >= 1) {
    const cells: SheetCell[] = [];
    for (const r of rows) {
      for (const c of cols) {
        const cell = tightBounds(data, w, h, c.start, r.start, c.end, r.end);
        if (cell && cell.sw >= 8 && cell.sh >= 8) cells.push(cell);
      }
    }
    if (cells.length >= 2) return cells;
  }

  // Large sheets: try uniform grid
  if (w >= 180 && h >= 160) {
    const guess = guessUniformGrid(data, w, h);
    if (guess.length >= 2) return guess;
  }

  if (!cols.length || !rows.length) {
    return [{ sx: 0, sy: 0, sw: w, sh: h }];
  }
  if (cols.length === 1 && rows.length === 1) {
    const guess = guessUniformGrid(data, w, h);
    if (guess.length > 1) return guess;
    const cell = tightBounds(data, w, h, cols[0]!.start, rows[0]!.start, cols[0]!.end, rows[0]!.end);
    return cell ? [cell] : [{ sx: 0, sy: 0, sw: w, sh: h }];
  }
  const cells: SheetCell[] = [];
  for (const r of rows) {
    for (const c of cols) {
      const cell = tightBounds(data, w, h, c.start, r.start, c.end, r.end);
      if (cell && cell.sw >= 8 && cell.sh >= 8) cells.push(cell);
    }
  }
  return cells.length ? cells : [{ sx: 0, sy: 0, sw: w, sh: h }];
}

/** Cache of sliced cell canvases per image URL */
const cellCanvasCache = new Map<string, HTMLCanvasElement[]>();

export function clearDecorCellCache() {
  cellCanvasCache.clear();
}

const MAX_CELL = 96;

/**
 * Get (or build) single-sprite canvases from a loaded sheet image.
 * Packing pixels are keyed to transparent. Cells are hard-capped so we
 * never billboard a whole contact sheet.
 */
export function getDecorCellCanvases(url: string, img: HTMLImageElement): HTMLCanvasElement[] {
  if (cellCanvasCache.has(url)) return cellCanvasCache.get(url)!;
  if (!img.complete || img.naturalWidth < 4) return [];
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
  tctx.drawImage(img, 0, 0);
  let data: ImageData;
  try {
    data = tctx.getImageData(0, 0, w, h);
  } catch {
    return [];
  }
  const raw = new Uint8ClampedArray(data.data);
  let cells = findSheetCells(raw, w, h);

  // Split any cell that is still a "row" or mini-sheet
  const refined: SheetCell[] = [];
  for (const c of cells) {
    if (c.sw <= MAX_CELL && c.sh <= MAX_CELL) {
      refined.push(c);
    } else {
      refined.push(...splitLargeCell(raw, w, h, c, MAX_CELL));
    }
  }
  // Drop anything that still covers most of the sheet
  const sheetArea = w * h;
  let finalCells = refined.filter((c) => c.sw * c.sh < sheetArea * 0.2 && c.sw <= MAX_CELL * 1.5 && c.sh <= MAX_CELL * 1.5);
  if (!finalCells.length) {
    // last resort: uniform 72px tiles with packing keyed — still not full sheet
    finalCells = [];
    const tw = 72;
    const th = 72;
    for (let y = 0; y + th <= h; y += th) {
      for (let x = 0; x + tw <= w; x += tw) {
        const sub = tightBounds(raw, w, h, x, y, x + tw, y + th);
        if (sub && sub.sw >= 12 && sub.sh >= 12) finalCells.push(sub);
      }
    }
  }
  if (!finalCells.length) {
    finalCells = [
      {
        sx: Math.floor(w / 2 - 36),
        sy: Math.floor(h / 2 - 36),
        sw: 72,
        sh: 72,
      },
    ];
  }

  const out: HTMLCanvasElement[] = [];
  for (const c of finalCells) {
    let sx = c.sx,
      sy = c.sy,
      sw = c.sw,
      sh = c.sh;
    // absolute hard cap
    if (sw > MAX_CELL || sh > MAX_CELL) {
      const nw = Math.min(sw, MAX_CELL);
      const nh = Math.min(sh, MAX_CELL);
      sx = sx + Math.floor((sw - nw) / 2);
      sy = sy + Math.floor((sh - nh) / 2);
      sw = nw;
      sh = nh;
    }
    // never accept a cell bigger than ~1/4 of the sheet on either axis
    if (sw > w * 0.55 || sh > h * 0.55) continue;

    const sc = document.createElement("canvas");
    sc.width = sw;
    sc.height = sh;
    const sctx = sc.getContext("2d")!;
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    // key out packing color residual
    try {
      const id = sctx.getImageData(0, 0, sw, sh);
      let opaque = 0;
      for (let i = 0; i < id.data.length; i += 4) {
        if (isMagenta(id.data[i]!, id.data[i + 1]!, id.data[i + 2]!, id.data[i + 3]!)) {
          id.data[i + 3] = 0;
        } else if (id.data[i + 3]! > 8) {
          opaque++;
        }
      }
      // skip nearly-empty slices (pure packing)
      if (opaque < 24) continue;
      sctx.putImageData(id, 0, 0);
    } catch {
      /* tainted */
    }
    out.push(sc);
  }
  // Guarantee at least one small proxy so draw path never falls through to full image
  if (!out.length) {
    const sc = document.createElement("canvas");
    sc.width = 48;
    sc.height = 32;
    const sctx = sc.getContext("2d")!;
    sctx.fillStyle = "#3ecfcf";
    sctx.fillRect(4, 8, 40, 18);
    sctx.fillStyle = "#e8a838";
    sctx.fillRect(8, 4, 16, 10);
    out.push(sc);
  }
  cellCanvasCache.set(url, out);
  return out;
}
