/**
 * Sprite QA — deterministic pixel checks (orphans, bleed, stray palette).
 */

export type QaKind = "orphan" | "bleed" | "stray" | "palette";

export type QaHit = {
  x: number;
  y: number;
  kind: QaKind;
};

export type QaReport = {
  boardId: string;
  name: string;
  w: number;
  h: number;
  hits: QaHit[];
  counts: Record<QaKind, number>;
  score: number;
};

function key(r: number, g: number, b: number) {
  return `${r >> 3},${g >> 3},${b >> 3}`;
}

export function analyzeSprite(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  boardId: string,
  name: string,
): QaReport {
  const hits: QaHit[] = [];
  const freq = new Map<string, number>();
  const neighbors = (x: number, y: number) => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (src[(ny * w + nx) * 4 + 3]! >= 12) n++;
      }
    }
    return n;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = src[i + 3]!;
      const r = src[i]!;
      const g = src[i + 1]!;
      const b = src[i + 2]!;
      if (a < 12) {
        if (a > 0 && r + g + b > 24) {
          hits.push({ x, y, kind: "bleed" });
        }
        continue;
      }
      freq.set(key(r, g, b), (freq.get(key(r, g, b)) ?? 0) + 1);
      const n = neighbors(x, y);
      if (n === 0) hits.push({ x, y, kind: "orphan" });
      else if (n === 1) hits.push({ x, y, kind: "stray" });
    }
  }

  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const keep = ranked.slice(0, 16).map((e) => e[0]);
  const keepRGB = keep.map((k) => k.split(",").map(Number) as [number, number, number]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]! < 12) continue;
      const k = key(src[i]!, src[i + 1]!, src[i + 2]!);
      if ((freq.get(k) ?? 0) > 2) continue;
      const qr = src[i]! >> 3;
      const qg = src[i + 1]! >> 3;
      const qb = src[i + 2]! >> 3;
      let near = false;
      for (const [kr, kg, kb] of keepRGB) {
        if (Math.abs(qr - kr) + Math.abs(qg - kg) + Math.abs(qb - kb) <= 4) {
          near = true;
          break;
        }
      }
      if (!near) hits.push({ x, y, kind: "palette" });
    }
  }

  if (hits.length > 900) hits.length = 900;
  const counts: Record<QaKind, number> = {
    orphan: 0,
    bleed: 0,
    stray: 0,
    palette: 0,
  };
  for (const h0 of hits) counts[h0.kind]++;
  const penalty =
    counts.orphan * 6 +
    counts.bleed * 3 +
    counts.stray * 1 +
    Math.min(18, counts.palette * 0.25);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  return { boardId, name, w, h, hits, counts, score };
}

export const QA_COLORS: Record<QaKind, string> = {
  orphan: "#e85d5d",
  bleed: "#fb923c",
  stray: "#e8a838",
  palette: "#c084fc",
};
