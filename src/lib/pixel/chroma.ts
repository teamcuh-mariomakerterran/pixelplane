/**
 * Chromatic aberration — presentation only.
 * linear: anamorphic R/B horizontal split
 * prism: diagonal R/B (smash / glass)
 * radial: lens fringe, stronger toward the corners
 */

export type CaMode = "linear" | "prism" | "radial";

type Scratch = {
  w: number;
  h: number;
  src: HTMLCanvasElement;
  r: HTMLCanvasElement;
  g: HTMLCanvasElement;
  b: HTMLCanvasElement;
};

let pool: Scratch | null = null;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function scratch(w: number, h: number): Scratch {
  if (!pool || pool.w !== w || pool.h !== h) {
    pool = {
      w,
      h,
      src: canvas(w, h),
      r: canvas(w, h),
      g: canvas(w, h),
      b: canvas(w, h),
    };
  }
  return pool;
}

function isolate(
  dest: HTMLCanvasElement,
  src: HTMLCanvasElement,
  hex: string,
  w: number,
  h: number,
) {
  const x = dest.getContext("2d");
  if (!x) return;
  x.globalCompositeOperation = "copy";
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = hex;
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = "source-over";
}

/** Split in CSS pixels. Integer so pixel art stays crisp. */
export function caSplitPx(amount: number, max = 10) {
  return Math.max(1, Math.round(Math.min(1, amount) * max));
}

/**
 * Rewrites the current frame in `ctx` (already in CSS-pixel space).
 * Fast 3-blit for linear/prism. Radial uses a capped gather.
 */
export function applyCanvasCA(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
  mode: CaMode = "linear",
) {
  if (amount < 0.03 || w < 8 || h < 8) return;
  if (typeof document === "undefined") return;
  const s = scratch(w, h);
  const sx = s.src.getContext("2d");
  if (!sx) return;
  sx.globalCompositeOperation = "copy";
  sx.drawImage(ctx.canvas, 0, 0, w, h);

  if (mode === "radial") {
    applyRadialCA(ctx, sx, w, h, amount);
    return;
  }

  isolate(s.r, s.src, "#ff2020", w, h);
  isolate(s.g, s.src, "#20ff20", w, h);
  isolate(s.b, s.src, "#2080ff", w, h);

  const split = caSplitPx(amount, mode === "prism" ? 12 : 9);
  const dy = mode === "prism" ? Math.max(1, Math.round(split * 0.35)) : 0;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(s.g, 0, 0);
  ctx.drawImage(s.r, -split, -dy);
  ctx.drawImage(s.b, split, dy);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function applyRadialCA(
  ctx: CanvasRenderingContext2D,
  srcCtx: CanvasRenderingContext2D,
  w: number,
  h: number,
  amount: number,
) {
  const capW = Math.min(w, 640);
  const capH = Math.max(2, Math.round((h * capW) / w));
  const tmp = scratch(capW, capH);
  const tx = tmp.src.getContext("2d", { willReadFrequently: true });
  if (!tx) return;
  tx.imageSmoothingEnabled = false;
  tx.drawImage(srcCtx.canvas, 0, 0, capW, capH);
  const src = tx.getImageData(0, 0, capW, capH);
  const out = tx.createImageData(capW, capH);
  const S = src.data;
  const D = out.data;
  const k = amount * 0.034;
  const cx = capW * 0.5;
  const cy = capH * 0.5;
  const inv = 1 / Math.hypot(cx, cy);
  for (let y = 0; y < capH; y++) {
    for (let x = 0; x < capW; x++) {
      const nx = (x - cx) * inv;
      const ny = (y - cy) * inv;
      const r2 = nx * nx + ny * ny;
      const mag = k * r2 * Math.min(capW, capH);
      const dx = Math.round(nx * mag);
      const dy = Math.round(ny * mag);
      const i = (y * capW + x) * 4;
      const ri = sample(S, capW, capH, x + dx, y + dy);
      const gi = sample(S, capW, capH, x + Math.round(dx * 0.15), y + Math.round(dy * 0.15));
      const bi = sample(S, capW, capH, x - dx, y - dy);
      D[i] = S[ri]!;
      D[i + 1] = S[gi + 1]!;
      D[i + 2] = S[bi + 2]!;
      D[i + 3] = S[i + 3]!;
    }
  }
  tx.putImageData(out, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp.src, 0, 0, w, h);
  ctx.restore();
}

function sample(s: Uint8ClampedArray, w: number, h: number, x: number, y: number) {
  const xx = x < 0 ? 0 : x >= w ? w - 1 : x;
  const yy = y < 0 ? 0 : y >= h ? h - 1 : y;
  return (yy * w + xx) * 4;
}

/** Per-sprite CA: isolate R/G/B and re-blit with a split. */
export function blitSpriteCA(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  amount: number,
) {
  if (amount < 0.04) {
    ctx.drawImage(sprite, x, y);
    return;
  }
  const w = sprite.width;
  const h = sprite.height;
  if (w < 2 || h < 2) {
    ctx.drawImage(sprite, x, y);
    return;
  }
  const s = scratch(w, h);
  isolate(s.r, sprite, "#ff3030", w, h);
  isolate(s.g, sprite, "#30ff30", w, h);
  isolate(s.b, sprite, "#3080ff", w, h);
  const split = caSplitPx(amount, 4);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(s.g, x, y);
  ctx.drawImage(s.r, x - split, y);
  ctx.drawImage(s.b, x + split, y);
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}
