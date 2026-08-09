/**
 * D_10x — Viewport Interest Management (Gemini)
 * Coarse spatial buckets so co-presence only streams high-frequency
 * updates for chunks that overlap a peer's viewport.
 */

export const CHUNK = 512;

export type ChunkKey = string; // "cx,cy"

export function chunkKey(cx: number, cy: number): ChunkKey {
  return `${cx},${cy}`;
}

export function worldToChunk(x: number, y: number, size = CHUNK): { cx: number; cy: number } {
  return {
    cx: Math.floor(x / size),
    cy: Math.floor(y / size),
  };
}

export function chunkOfPoint(x: number, y: number, size = CHUNK): ChunkKey {
  const { cx, cy } = worldToChunk(x, y, size);
  return chunkKey(cx, cy);
}

/** All chunk keys overlapping an axis-aligned world rect */
export function chunksInRect(
  x: number,
  y: number,
  w: number,
  h: number,
  size = CHUNK,
): ChunkKey[] {
  const x0 = Math.floor(x / size);
  const y0 = Math.floor(y / size);
  const x1 = Math.floor((x + Math.max(0, w)) / size);
  const y1 = Math.floor((y + Math.max(0, h)) / size);
  const out: ChunkKey[] = [];
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      out.push(chunkKey(cx, cy));
    }
  }
  return out;
}

/**
 * Viewport in world space from camera (cam.x/y are screen offset of world origin).
 * world = (screen - cam) / zoom
 */
export function viewportWorldRect(
  cam: { x: number; y: number; zoom: number },
  screenW: number,
  screenH: number,
): { x: number; y: number; w: number; h: number } {
  const z = cam.zoom || 1;
  const x = -cam.x / z;
  const y = -cam.y / z;
  const w = screenW / z;
  const h = screenH / z;
  return { x, y, w, h };
}

export function interestChunksForCamera(
  cam: { x: number; y: number; zoom: number },
  screenW: number,
  screenH: number,
  /** pad in chunks around viewport for smoother handoff */
  padChunks = 1,
  size = CHUNK,
): Set<ChunkKey> {
  const r = viewportWorldRect(cam, screenW, screenH);
  const pad = padChunks * size;
  const keys = chunksInRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2, size);
  return new Set(keys);
}

export function interestsOverlap(a: Set<ChunkKey> | ChunkKey[], b: Set<ChunkKey> | ChunkKey[]): boolean {
  const B = b instanceof Set ? b : new Set(b);
  for (const k of a) if (B.has(k)) return true;
  return false;
}

/** Throttle decision: high-rate if in interest, else low-rate (caller tracks last send). */
export function shouldSendHighFreq(
  localInterest: Set<ChunkKey>,
  remotePoint: { x: number; y: number },
  size = CHUNK,
): boolean {
  return localInterest.has(chunkOfPoint(remotePoint.x, remotePoint.y, size));
}

export type InterestEnvelope = {
  v: 1;
  t: "interest";
  chunks: ChunkKey[];
  camX: number;
  camY: number;
  zoom: number;
};
