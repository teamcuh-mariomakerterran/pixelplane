/**
 * Palette Gravity — nearby artboards pull a living color field toward the brush.
 * Signature system: the plane's color language is spatial, not a flat swatch tray.
 */

import type { Artboard } from "@/lib/pixel/types";

export type GravitySwatch = {
  hex: string;
  weight: number;
  boardId: string;
  boardName: string;
};

function rgbaToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function sampleBoardColors(board: Artboard, max = 4): string[] {
  const layer = board.layers.find((l) => l.id === board.activeLayerId) ?? board.layers[0];
  if (!layer?.data?.length) return [];
  const { width: w, height: h } = board;
  const data = layer.data;
  const pts = [
    [0.2, 0.2],
    [0.5, 0.5],
    [0.8, 0.3],
    [0.3, 0.75],
    [0.7, 0.7],
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [ux, uy] of pts) {
    const x = Math.min(w - 1, Math.max(0, Math.floor(w * ux)));
    const y = Math.min(h - 1, Math.max(0, Math.floor(h * uy)));
    const i = (y * w + x) * 4;
    const a = data[i + 3] ?? 0;
    if (a < 40) continue;
    const hex = rgbaToHex(data[i]!, data[i + 1]!, data[i + 2]!);
    if (seen.has(hex)) continue;
    // skip near-black / near-white noise
    const lum = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    if (lum < 18 || lum > 245) continue;
    seen.add(hex);
    out.push(hex);
    if (out.length >= max) break;
  }
  return out;
}

/** Boards whose center is within radius of world point, with falloff weight */
export function gravityField(
  artboards: Artboard[],
  worldX: number,
  worldY: number,
  radius = 280,
): GravitySwatch[] {
  const hits: GravitySwatch[] = [];
  for (const b of artboards) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const dx = cx - worldX;
    const dy = cy - worldY;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;
    const falloff = 1 - dist / radius;
    const colors = sampleBoardColors(b, 3);
    for (const hex of colors) {
      hits.push({
        hex,
        weight: falloff * falloff,
        boardId: b.id,
        boardName: b.name,
      });
    }
  }
  hits.sort((a, b) => b.weight - a.weight);
  // unique hex keep strongest
  const uniq: GravitySwatch[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (seen.has(h.hex)) continue;
    seen.add(h.hex);
    uniq.push(h);
    if (uniq.length >= 8) break;
  }
  return uniq;
}

/** Blend current brush toward strongest gravity color (subtle pull) */
export function pullColor(currentHex: string, field: GravitySwatch[], amount = 0.35): string {
  if (!field.length) return currentHex;
  const target = field[0]!;
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    if (h.length !== 6) return [128, 128, 128];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const;
  };
  const [r0, g0, b0] = parse(currentHex);
  const [r1, g1, b1] = parse(target.hex);
  const t = Math.min(1, amount * target.weight);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return rgbaToHex(mix(r0, r1), mix(g0, g1), mix(b0, b1));
}
