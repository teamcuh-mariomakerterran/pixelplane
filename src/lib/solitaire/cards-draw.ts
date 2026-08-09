/**
 * Procedural pixel card faces + backs (used when no canvas skin is bound).
 */

import type { Card, Rank, Suit } from "./types";
import { isRed, rankLabel, suitSymbol } from "./types";

const DEFAULT_W = 56;
const DEFAULT_H = 78;

function setPx(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  if (x < 0 || y < 0 || x >= w) return;
  const h = data.length / (w * 4);
  if (y >= h) return;
  const i = (y * w + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function fillRect(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  rw: number,
  rh: number,
  r: number,
  g: number,
  b: number,
  a = 255,
) {
  for (let yy = y; yy < y + rh; yy++) {
    for (let xx = x; xx < x + rw; xx++) setPx(data, w, xx, yy, r, g, b, a);
  }
}

function strokeRect(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  rw: number,
  rh: number,
  r: number,
  g: number,
  b: number,
) {
  for (let xx = x; xx < x + rw; xx++) {
    setPx(data, w, xx, y, r, g, b);
    setPx(data, w, xx, y + rh - 1, r, g, b);
  }
  for (let yy = y; yy < y + rh; yy++) {
    setPx(data, w, x, yy, r, g, b);
    setPx(data, w, x + rw - 1, yy, r, g, b);
  }
}

/** Tiny 3x5 digit/letter glyphs */
const GLYPHS: Record<string, number[]> = {
  A: [0b010, 0b101, 0b111, 0b101, 0b101],
  "2": [0b111, 0b001, 0b111, 0b100, 0b111],
  "3": [0b111, 0b001, 0b111, 0b001, 0b111],
  "4": [0b101, 0b101, 0b111, 0b001, 0b001],
  "5": [0b111, 0b100, 0b111, 0b001, 0b111],
  "6": [0b111, 0b100, 0b111, 0b101, 0b111],
  "7": [0b111, 0b001, 0b010, 0b010, 0b010],
  "8": [0b111, 0b101, 0b111, 0b101, 0b111],
  "9": [0b111, 0b101, 0b111, 0b001, 0b111],
  "10": [], // special
  J: [0b001, 0b001, 0b001, 0b101, 0b010],
  Q: [0b010, 0b101, 0b101, 0b111, 0b001],
  K: [0b101, 0b110, 0b100, 0b110, 0b101],
};

function drawGlyph(
  data: Uint8ClampedArray,
  w: number,
  x: number,
  y: number,
  ch: string,
  r: number,
  g: number,
  b: number,
  scale = 1,
) {
  if (ch === "10") {
    drawGlyph(data, w, x, y, "1", r, g, b, scale);
    // tiny 0
    const zero = [0b111, 0b101, 0b101, 0b101, 0b111];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (zero[row] & (1 << (2 - col))) {
          fillRect(data, w, x + 4 * scale + col * scale, y + row * scale, scale, scale, r, g, b);
        }
      }
    }
    return;
  }
  // fake 1
  if (ch === "1") {
    for (let row = 0; row < 5; row++) {
      fillRect(data, w, x + scale, y + row * scale, scale, scale, r, g, b);
    }
    return;
  }
  const g5 = GLYPHS[ch];
  if (!g5) return;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (g5[row] & (1 << (2 - col))) {
        fillRect(data, w, x + col * scale, y + row * scale, scale, scale, r, g, b);
      }
    }
  }
}

function drawSuitPip(
  data: Uint8ClampedArray,
  w: number,
  cx: number,
  cy: number,
  suit: Suit,
  r: number,
  g: number,
  b: number,
) {
  // simple diamond/heart/club/spade blobs
  if (suit === "diamonds") {
    for (let dy = -4; dy <= 4; dy++) {
      const half = 4 - Math.abs(dy);
      for (let dx = -half; dx <= half; dx++) setPx(data, w, cx + dx, cy + dy, r, g, b);
    }
  } else if (suit === "hearts") {
    for (let dy = -3; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const inL = (dx + 2) * (dx + 2) + (dy + 1) * (dy + 1) <= 6;
        const inR = (dx - 2) * (dx - 2) + (dy + 1) * (dy + 1) <= 6;
        const inBot = dy >= 0 && Math.abs(dx) + dy <= 5;
        if (inL || inR || inBot) setPx(data, w, cx + dx, cy + dy, r, g, b);
      }
    }
  } else if (suit === "clubs") {
    for (const [ox, oy] of [
      [0, -3],
      [-3, 0],
      [3, 0],
    ] as const) {
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          if (dx * dx + dy * dy <= 5) setPx(data, w, cx + ox + dx, cy + oy + dy, r, g, b);
    }
    fillRect(data, w, cx - 1, cy + 1, 3, 5, r, g, b);
  } else {
    // spade
    for (let dy = -4; dy <= 2; dy++) {
      const half = dy < 0 ? 4 + dy : 4 - dy;
      for (let dx = -half; dx <= half; dx++) setPx(data, w, cx + dx, cy + dy, r, g, b);
    }
    fillRect(data, w, cx - 1, cy + 1, 3, 5, r, g, b);
  }
}

export function drawCardFace(
  card: Card,
  w = DEFAULT_W,
  h = DEFAULT_H,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  // cream face
  fillRect(data, w, 0, 0, w, h, 246, 240, 228);
  strokeRect(data, w, 0, 0, w, h, 40, 36, 48);
  strokeRect(data, w, 1, 1, w - 2, h - 2, 200, 190, 170);
  const red = isRed(card.suit);
  const r = red ? 196 : 36;
  const g = red ? 48 : 40;
  const b = red ? 62 : 48;
  const label = rankLabel(card.rank);
  drawGlyph(data, w, 4, 4, label === "10" ? "10" : label, r, g, b, 1);
  drawSuitPip(data, w, 8, 16, card.suit, r, g, b);
  // center pip
  drawSuitPip(data, w, (w / 2) | 0, (h / 2) | 0, card.suit, r, g, b);
  // corner bottom inverted
  drawGlyph(data, w, w - 10, h - 12, label === "10" ? "10" : label, r, g, b, 1);
  return data;
}

export function drawCardBack(w = DEFAULT_W, h = DEFAULT_H): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  fillRect(data, w, 0, 0, w, h, 28, 48, 86);
  strokeRect(data, w, 0, 0, w, h, 18, 24, 40);
  strokeRect(data, w, 2, 2, w - 4, h - 4, 232, 168, 56);
  // diamond lattice
  for (let y = 6; y < h - 6; y += 6) {
    for (let x = 6; x < w - 6; x += 6) {
      if ((x + y) % 12 === 0) setPx(data, w, x, y, 232, 168, 56, 180);
    }
  }
  // center monogram
  fillRect(data, w, (w / 2) - 6, (h / 2) - 6, 12, 12, 18, 28, 50);
  strokeRect(data, w, (w / 2) - 6, (h / 2) - 6, 12, 12, 232, 168, 56);
  return data;
}

export function drawEmptySlot(
  kind: "foundation" | "tableau",
  w = DEFAULT_W,
  h = DEFAULT_H,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  // transparent-ish dark
  fillRect(data, w, 0, 0, w, h, 20, 40, 32, 120);
  strokeRect(data, w, 0, 0, w, h, 60, 120, 90);
  if (kind === "foundation") {
    // A hint
    drawGlyph(data, w, (w / 2) - 2, (h / 2) - 3, "A", 60, 120, 90, 1);
  }
  return data;
}

export function drawTableFelt(w = 480, h = 320): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = ((x * 13 + y * 7) % 5) - 2;
      setPx(data, w, x, y, 18 + n, 72 + n, 48 + n);
    }
  }
  strokeRect(data, w, 0, 0, w, h, 232, 168, 56);
  strokeRect(data, w, 2, 2, w - 4, h - 4, 12, 40, 28);
  return data;
}

export const CARD_W = DEFAULT_W;
export const CARD_H = DEFAULT_H;

/** Paint buffer onto canvas element */
export function bufferToCanvas(data: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
  return c;
}
