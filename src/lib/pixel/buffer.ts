/** Low-level pixel buffer helpers — all ops are integer pixel perfect. */

export function createBuffer(w: number, h: number, fill?: [number, number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  if (fill) {
    const [r, g, b, a] = fill;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return data;
}

export function cloneBuffer(src: Uint8ClampedArray) {
  return new Uint8ClampedArray(src);
}

export function getPixel(data: Uint8ClampedArray, w: number, x: number, y: number, h: number) {
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]] as [number, number, number, number];
}

export function setPixel(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number,
) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 4;
  if (a === 0) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 0;
    return;
  }
  if (a >= 255 || data[i + 3] === 0) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  } else {
    // simple over
    const oa = data[i + 3] / 255;
    const na = a / 255;
    const outA = na + oa * (1 - na);
    data[i] = Math.round((r * na + data[i] * oa * (1 - na)) / outA);
    data[i + 1] = Math.round((g * na + data[i + 1] * oa * (1 - na)) / outA);
    data[i + 2] = Math.round((b * na + data[i + 2] * oa * (1 - na)) / outA);
    data[i + 3] = Math.round(outA * 255);
  }
}

export function erasePixel(data: Uint8ClampedArray, w: number, h: number, x: number, y: number) {
  setPixel(data, w, h, x, y, 0, 0, 0, 0);
}

/** Circular brush stamp */
export function stampBrush(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  size: number,
  r: number,
  g: number,
  b: number,
  a: number,
  erase = false,
) {
  const rad = Math.max(0.5, size / 2);
  const r2 = rad * rad;
  const x0 = Math.floor(cx - rad);
  const y0 = Math.floor(cy - rad);
  const x1 = Math.ceil(cx + rad);
  const y1 = Math.ceil(cy + rad);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) {
        if (erase) erasePixel(data, w, h, x, y);
        else setPixel(data, w, h, x, y, r, g, b, a);
      }
    }
  }
}

/** Bresenham line with brush */
export function drawLine(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  r: number,
  g: number,
  b: number,
  a: number,
  erase = false,
) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    stampBrush(data, w, h, x, y, size, r, g, b, a, erase);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

export function floodFill(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  sx: number,
  sy: number,
  r: number,
  g: number,
  b: number,
  a: number,
) {
  const target = getPixel(data, w, sx, sy, h);
  if (!target) return;
  const [tr, tg, tb, ta] = target;
  if (tr === r && tg === g && tb === b && ta === a) return;
  const match = (x: number, y: number) => {
    const p = getPixel(data, w, x, y, h);
    if (!p) return false;
    return p[0] === tr && p[1] === tg && p[2] === tb && p[3] === ta;
  };
  const stack: [number, number][] = [[sx, sy]];
  const seen = new Uint8Array(w * h);
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const idx = y * w + x;
    if (seen[idx]) continue;
    if (!match(x, y)) continue;
    seen[idx] = 1;
    setPixel(data, w, h, x, y, r, g, b, a);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

export function drawRectOutline(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  r: number,
  g: number,
  b: number,
  a: number,
  fill = false,
) {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  if (fill) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        setPixel(data, w, h, x, y, r, g, b, a);
      }
    }
    return;
  }
  drawLine(data, w, h, minX, minY, maxX, minY, size, r, g, b, a);
  drawLine(data, w, h, maxX, minY, maxX, maxY, size, r, g, b, a);
  drawLine(data, w, h, maxX, maxY, minX, maxY, size, r, g, b, a);
  drawLine(data, w, h, minX, maxY, minX, minY, size, r, g, b, a);
}

export function drawEllipse(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
  a: number,
  fill = false,
) {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.abs(x1 - x0) / 2;
  const ry = Math.abs(y1 - y0) / 2;
  if (rx < 0.5 || ry < 0.5) return;
  const minX = Math.floor(cx - rx);
  const maxX = Math.ceil(cx + rx);
  const minY = Math.floor(cy - ry);
  const maxY = Math.ceil(cy + ry);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (fill ? d <= 1 : d <= 1 && d >= 0.7) {
        setPixel(data, w, h, x, y, r, g, b, a);
      }
    }
  }
}

export function extractRegion(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  rw: number,
  rh: number,
) {
  const out = createBuffer(rw, rh);
  for (let py = 0; py < rh; py++) {
    for (let px = 0; px < rw; px++) {
      const src = getPixel(data, w, x + px, y + py, h);
      if (src) {
        const i = (py * rw + px) * 4;
        out[i] = src[0];
        out[i + 1] = src[1];
        out[i + 2] = src[2];
        out[i + 3] = src[3];
      }
    }
  }
  return out;
}

export function pasteRegion(
  dest: Uint8ClampedArray,
  dw: number,
  dh: number,
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
) {
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (src[i + 3] === 0) continue;
      setPixel(dest, dw, dh, dx + x, dy + y, src[i], src[i + 1], src[i + 2], src[i + 3]);
    }
  }
}

export function compositeLayers(
  layers: { data: Uint8ClampedArray; visible: boolean; opacity: number }[],
  w: number,
  h: number,
) {
  const out = createBuffer(w, h);
  for (const layer of layers) {
    if (!layer.visible) continue;
    const src = coercePixelData(layer.data, w, h);
    const op = layer.opacity;
    for (let i = 0; i < out.length; i += 4) {
      const sa = (src[i + 3] / 255) * op;
      if (sa <= 0) continue;
      const da = out[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0) continue;
      out[i] = Math.round((src[i] * sa + out[i] * da * (1 - sa)) / outA);
      out[i + 1] = Math.round((src[i + 1] * sa + out[i + 1] * da * (1 - sa)) / outA);
      out[i + 2] = Math.round((src[i + 2] * sa + out[i + 2] * da * (1 - sa)) / outA);
      out[i + 3] = Math.round(outA  * 255);
    }
  }
  return out;
}

/**
 * IndexedDB / structured-clone can return plain arrays, ArrayBuffers, or
 * detached views. Always coerce to a dense Uint8ClampedArray of w*h*4.
 */
export function coercePixelData(data: unknown, w: number, h: number): Uint8ClampedArray {
  const need = Math.max(0, (w | 0) * (h | 0) * 4);
  if (need === 0) return new Uint8ClampedArray(0);
  if (data instanceof Uint8ClampedArray) {
    if (data.length === need) return data;
    const out = new Uint8ClampedArray(need);
    out.set(data.subarray(0, Math.min(data.length, need)));
    return out;
  }
  if (data instanceof Uint8Array) {
    const out = new Uint8ClampedArray(need);
    out.set(data.subarray(0, Math.min(data.length, need)));
    return out;
  }
  if (data instanceof ArrayBuffer) {
    const out = new Uint8ClampedArray(need);
    out.set(new Uint8ClampedArray(data).subarray(0, Math.min(data.byteLength, need)));
    return out;
  }
  if (ArrayBuffer.isView(data)) {
    const view = new Uint8ClampedArray(
      (data as ArrayBufferView).buffer,
      (data as ArrayBufferView).byteOffset,
      (data as ArrayBufferView).byteLength,
    );
    const out = new Uint8ClampedArray(need);
    out.set(view.subarray(0, Math.min(view.length, need)));
    return out;
  }
  if (Array.isArray(data)) {
    const out = new Uint8ClampedArray(need);
    const n = Math.min(data.length, need);
    for (let i = 0; i < n; i++) out[i] = data[i] as number;
    return out;
  }
  // plain object with numeric keys (rare IDB path)
  if (data && typeof data === "object" && typeof (data as { length?: unknown }).length === "number") {
    try {
      const len = (data as { length: number }).length;
      const out = new Uint8ClampedArray(need);
      const n = Math.min(len, need);
      for (let i = 0; i < n; i++) out[i] = Number((data as Record<number, number>)[i]) || 0;
      return out;
    } catch {
      /* fall through */
    }
  }
  return new Uint8ClampedArray(need);
}

/** True if buffer has essentially no opaque pixels (failed load / empty board). */
export function isBufferHollow(data: unknown, w: number, h: number): boolean {
  const buf = coercePixelData(data, w, h);
  if (buf.length < 16) return true;
  let opaque = 0;
  const step = Math.max(4, (buf.length / 4 / 4000) | 0) * 4;
  for (let i = 3; i < buf.length; i += step) {
    if (buf[i]! > 8) {
      opaque++;
      if (opaque > 12) return false;
    }
  }
  return opaque <= 12;
}

export function bufferToImageData(data: Uint8ClampedArray, w: number, h: number) {
  const buf = coercePixelData(data, w, h);
  // copy into a fresh ArrayBuffer-backed view for ImageData constructor typing
  const copy = new Uint8ClampedArray(buf.length);
  copy.set(buf);
  return new ImageData(copy, w, h);
}

export function imageDataToBuffer(img: ImageData) {
  return new Uint8ClampedArray(img.data);
}

export function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16),
    ];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}

export function rgbaToHex(r: number, g: number, b: number) {
  return (
    "#" +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Downsample image to pixel art size with nearest-neighbor */
export function pixelateImage(
  source: ImageData,
  targetW: number,
  targetH: number,
  mode: "8bit" | "16bit" | "hd" = "16bit",
) {
  const out = createBuffer(targetW, targetH);
  const sw = source.width;
  const sh = source.height;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const sx = Math.floor((x / targetW) * sw);
      const sy = Math.floor((y / targetH) * sh);
      const si = (sy * sw + sx) * 4;
      let r = source.data[si];
      let g = source.data[si + 1];
      let b = source.data[si + 2];
      let a = source.data[si + 3];
      if (mode === "8bit") {
        r = Math.round(r / 51) * 51;
        g = Math.round(g / 51) * 51;
        b = Math.round(b / 51) * 51;
      } else if (mode === "16bit") {
        r = Math.round(r / 17) * 17;
        g = Math.round(g / 17) * 17;
        b = Math.round(b / 17) * 17;
      }
      const i = (y * targetW + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = a;
    }
  }
  return out;
}

export async function loadImageToBuffer(
  url: string,
  maxW = 256,
  maxH = 256,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const scale = Math.min(1, maxW / img.width, maxH / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  return { data: new Uint8ClampedArray(id.data), width: w, height: h };
}

export function resizeBuffer(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  tw: number,
  th: number,
) {
  const out = createBuffer(tw, th);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const sx = Math.floor((x / tw) * sw);
      const sy = Math.floor((y / th) * sh);
      const si = (sy * sw + sx) * 4;
      const di = (y * tw + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}
