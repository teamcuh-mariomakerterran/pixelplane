import { createBuffer } from "./buffer";

/**
 * Simple background remover:
 * - samples corners for bg color
 * - flood-fills similar colors to transparent
 * - optional chroma key for solid colors (magenta, green, white)
 */
export function removeBackground(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  options?: { tolerance?: number; chroma?: [number, number, number] | null },
) {
  const tol = options?.tolerance ?? 36;
  const out = new Uint8ClampedArray(data);
  const samples: [number, number, number][] = [];

  if (options?.chroma) {
    samples.push(options.chroma);
  } else {
    // corner samples
    for (const [x, y] of [
      [0, 0],
      [w - 1, 0],
      [0, h - 1],
      [w - 1, h - 1],
      [Math.floor(w / 2), 0],
      [0, Math.floor(h / 2)],
    ] as [number, number][]) {
      const i = (y * w + x) * 4;
      if (out[i + 3] > 0) samples.push([out[i], out[i + 1], out[i + 2]]);
    }
  }

  const near = (r: number, g: number, b: number) => {
    for (const [sr, sg, sb] of samples) {
      const d = Math.abs(r - sr) + Math.abs(g - sg) + Math.abs(b - sb);
      if (d <= tol * 3) return true;
    }
    return false;
  };

  // Mark edge-connected bg pixels via BFS
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    if (out[i + 3] === 0) {
      visited[idx] = 1;
      return;
    }
    if (!near(out[i], out[i + 1], out[i + 2])) return;
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (queue.length) {
    const idx = queue.shift()!;
    const i = idx * 4;
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = 0;
    const x = idx % w;
    const y = Math.floor(idx / w);
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Despill near edges
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (out[i + 3] === 0) continue;
      if (near(out[i], out[i + 1], out[i + 2])) {
        // partial transparency for fringe
        const d = Math.min(
          ...samples.map(
            ([sr, sg, sb]) =>
              Math.abs(out[i] - sr) + Math.abs(out[i + 1] - sg) + Math.abs(out[i + 2] - sb),
          ),
        );
        if (d < tol * 2) {
          out[i + 3] = Math.min(out[i + 3], Math.floor((d / (tol * 2)) * 255));
        }
      }
    }
  }

  return out;
}

export function chromaKeyMagenta(data: Uint8ClampedArray, w: number, h: number) {
  return removeBackground(data, w, h, { tolerance: 40, chroma: [255, 0, 255] });
}

export function emptyTransparent(w: number, h: number) {
  return createBuffer(w, h);
}
