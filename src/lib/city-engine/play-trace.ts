/**
 * Play Ghost — novel: City Engine session path becomes a plane artifact.
 * Drop a translucent trail of where you walked/drove so Studio "remembers" playtest.
 */

export type TraceSample = {
  x: number;
  y: number;
  t: number;
  mode: "foot" | "drive" | "indoor";
};

export type PlayTrace = {
  id: string;
  samples: TraceSample[];
  startedAt: number;
  endedAt: number;
  smashCount: number;
  questName?: string;
  questCompleted?: boolean;
};

const MAX_SAMPLES = 400;

export function createTrace(): PlayTrace {
  return {
    id: `tr_${Date.now().toString(36)}`,
    samples: [],
    startedAt: Date.now(),
    endedAt: 0,
    smashCount: 0,
  };
}

export function pushSample(
  tr: PlayTrace,
  s: { x: number; y: number; mode: TraceSample["mode"]; t: number },
  minDist = 18,
) {
  const last = tr.samples[tr.samples.length - 1];
  if (last && Math.hypot(last.x - s.x, last.y - s.y) < minDist && s.mode === last.mode) {
    return tr;
  }
  const samples = [...tr.samples, { x: s.x, y: s.y, t: s.t, mode: s.mode }];
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
  return { ...tr, samples };
}

export function finalizeTrace(
  tr: PlayTrace,
  meta: { smashCount: number; questName?: string; questCompleted?: boolean },
): PlayTrace {
  return {
    ...tr,
    endedAt: Date.now(),
    smashCount: meta.smashCount,
    questName: meta.questName,
    questCompleted: meta.questCompleted,
  };
}

/** Bounds of the trail in city world space */
export function traceBounds(tr: PlayTrace) {
  if (!tr.samples.length) return { x: 0, y: 0, w: 64, h: 64 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const s of tr.samples) {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x);
    maxY = Math.max(maxY, s.y);
  }
  const pad = 24;
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(64, maxX - minX + pad * 2),
    h: Math.max(64, maxY - minY + pad * 2),
  };
}

/** Rasterize trail into small note-sized buffer for plane artboard */
export function rasterizeTrace(
  tr: PlayTrace,
  maxW = 256,
  maxH = 256,
): { data: Uint8ClampedArray; w: number; h: number; name: string } {
  const b = traceBounds(tr);
  const scale = Math.min(maxW / b.w, maxH / b.h, 1);
  const w = Math.max(32, Math.ceil(b.w * scale));
  const h = Math.max(32, Math.ceil(b.h * scale));
  const data = new Uint8ClampedArray(w * h * 4);
  // dark bg
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 12;
    data[i * 4 + 1] = 14;
    data[i * 4 + 2] = 20;
    data[i * 4 + 3] = 220;
  }
  const plot = (x: number, y: number, r: number, g: number, bl: number, a: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return;
    const o = (iy * w + ix) * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = bl;
    data[o + 3] = a;
  };
  for (let i = 1; i < tr.samples.length; i++) {
    const a = tr.samples[i - 1]!;
    const c = tr.samples[i]!;
    const steps = Math.max(2, Math.hypot(c.x - a.x, c.y - a.y) * scale * 0.5);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = (a.x + (c.x - a.x) * t - b.x) * scale;
      const y = (a.y + (c.y - a.y) * t - b.y) * scale;
      const col =
        c.mode === "drive"
          ? [56, 189, 248]
          : c.mode === "indoor"
            ? [167, 139, 250]
            : [232, 168, 56];
      plot(x, y, col[0]!, col[1]!, col[2]!, 255);
      plot(x + 1, y, col[0]!, col[1]!, col[2]!, 180);
    }
  }
  // start/end markers
  if (tr.samples[0]) {
    const s = tr.samples[0];
    const x = (s.x - b.x) * scale;
    const y = (s.y - b.y) * scale;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) plot(x + dx, y + dy, 78, 203, 113, 255);
  }
  const last = tr.samples[tr.samples.length - 1];
  if (last) {
    const x = (last.x - b.x) * scale;
    const y = (last.y - b.y) * scale;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) plot(x + dx, y + dy, 248, 113, 113, 255);
  }
  const mins = Math.round((tr.endedAt - tr.startedAt) / 60000);
  const name = `Play Ghost · ${mins}m · ${tr.smashCount} smash${tr.questCompleted ? " · quest ✓" : ""}`;
  return { data, w, h, name };
}
