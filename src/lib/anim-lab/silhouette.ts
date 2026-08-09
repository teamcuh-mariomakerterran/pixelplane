/**
 * Offline silhouette intelligence — pure pixel knowledge, no neural nets.
 * Used by secondary motion, cosmetics lock, and self-audit.
 */

export type Point = { x: number; y: number };

export type SilhouetteInfo = {
  /** alpha > threshold mask, length w*h */
  mask: Uint8Array;
  w: number;
  h: number;
  pixelCount: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centroid: Point;
  /** rough body anchors in frame pixels */
  anchors: {
    head: Point;
    torso: Point;
    feet: Point;
    back: Point;
    handL: Point;
    handR: Point;
  };
  /** ordered outline samples (downsampled) */
  hull: Point[];
};

const ALPHA_T = 20;

export function extractSilhouette(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): SilhouetteInfo {
  const mask = new Uint8Array(w * h);
  let count = 0;
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  let sx = 0,
    sy = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > ALPHA_T) {
        mask[y * w + x] = 1;
        count++;
        sx += x;
        sy += y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count === 0) {
    const c = { x: w / 2, y: h / 2 };
    return {
      mask,
      w,
      h,
      pixelCount: 0,
      minX: 0,
      minY: 0,
      maxX: w - 1,
      maxY: h - 1,
      centroid: c,
      anchors: {
        head: c,
        torso: c,
        feet: c,
        back: c,
        handL: c,
        handR: c,
      },
      hull: [],
    };
  }

  const cx = sx / count;
  const cy = sy / count;
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);

  // Anchors from bounds + mass (classical cartoon layout knowledge)
  const head = { x: cx, y: minY + bh * 0.12 };
  const torso = { x: cx, y: minY + bh * 0.45 };
  const feet = { x: cx, y: minY + bh * 0.92 };
  const back = { x: minX + bw * 0.2, y: minY + bh * 0.5 };
  const handL = { x: minX + bw * 0.08, y: minY + bh * 0.48 };
  const handR = { x: minX + bw * 0.92, y: minY + bh * 0.48 };

  // Snap anchors to nearest opaque pixel for stickiness
  const snap = (p: Point) => nearestOpaque(mask, w, h, p.x, p.y) ?? p;

  const hull = sampleOutline(mask, w, h, minX, minY, maxX, maxY, 24);

  return {
    mask,
    w,
    h,
    pixelCount: count,
    minX,
    minY,
    maxX,
    maxY,
    centroid: { x: cx, y: cy },
    anchors: {
      head: snap(head),
      torso: snap(torso),
      feet: snap(feet),
      back: snap(back),
      handL: snap(handL),
      handR: snap(handR),
    },
    hull,
  };
}

function nearestOpaque(
  mask: Uint8Array,
  w: number,
  h: number,
  x: number,
  y: number,
): Point | null {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix >= 0 && iy >= 0 && ix < w && iy < h && mask[iy * w + ix]) {
    return { x: ix, y: iy };
  }
  let best: Point | null = null;
  let bestD = Infinity;
  const r = Math.max(w, h);
  for (let rad = 1; rad < r; rad++) {
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
        const px = ix + dx;
        const py = iy + dy;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        if (!mask[py * w + px]) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { x: px, y: py };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

/** March bounds edge for outline samples */
function sampleOutline(
  mask: Uint8Array,
  w: number,
  h: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  maxPts: number,
): Point[] {
  const edge: Point[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!mask[y * w + x]) continue;
      let border = false;
      for (let dy = -1; dy <= 1 && !border; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !mask[ny * w + nx]) {
            border = true;
            break;
          }
        }
      }
      if (border) edge.push({ x, y });
    }
  }
  if (edge.length <= maxPts) return edge;
  const step = edge.length / maxPts;
  const out: Point[] = [];
  for (let i = 0; i < maxPts; i++) out.push(edge[Math.floor(i * step)]!);
  return out;
}

export function silhouetteOverlap(
  a: SilhouetteInfo,
  b: SilhouetteInfo,
): number {
  if (a.w !== b.w || a.h !== b.h) return 0;
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.mask.length; i++) {
    const av = a.mask[i];
    const bv = b.mask[i];
    if (av || bv) either++;
    if (av && bv) both++;
  }
  return either === 0 ? 1 : both / either;
}
