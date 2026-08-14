/**
 * Bundled free-use example assets that ship with PixelPlane.
 * Users can drop any item onto the infinite plane to edit / wire / export.
 */

export type StarterCategory =
  | "characters"
  | "sheets"
  | "portraits"
  | "environments"
  | "props"
  | "animations";

export type StarterItem = {
  id: string;
  name: string;
  src: string;
  category: StarterCategory;
  tags: string[];
  kind: "sprite" | "sheet" | "scene" | "parallax-set";
};

export type StarterManifest = {
  name: string;
  version: string;
  license: string;
  items: StarterItem[];
};

let cached: StarterManifest | null = null;

/** Resolve a public asset path against Vite BASE_URL (preview subpaths). */
export function resolveAssetUrl(src: string): string {
  if (!src) return src;
  if (/^https?:\/\//i.test(src) || src.startsWith("blob:") || src.startsWith("data:")) {
    return src;
  }
  const base =
    typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL
      ? String((import.meta as any).env.BASE_URL)
      : "/";
  const path = src.startsWith("/") ? src.slice(1) : src;
  if (base === "/" || base === "") return `/${path}`;
  return `${base.endsWith("/") ? base : base + "/"}${path}`;
}

export async function loadStarterManifest(): Promise<StarterManifest> {
  if (cached) return cached;
  const res = await fetch(resolveAssetUrl("/starter-pack/manifest.json"));
  if (!res.ok) throw new Error("Starter pack manifest missing");
  cached = (await res.json()) as StarterManifest;
  return cached;
}

/** In-memory decoded bitmaps so rehydrate + canvas share one load. */
const bufferCache = new Map<string, { data: Uint8ClampedArray; w: number; h: number; max: number }>();
const htmlImageCache = new Map<string, HTMLImageElement>();

/** Get (or start loading) an HTMLImage for plane blit fallback. */
export function getStarterHtmlImage(src: string): HTMLImageElement | null {
  const url = resolveAssetUrl(src);
  let img = htmlImageCache.get(url);
  if (img) return img.complete && img.naturalWidth > 0 ? img : img.complete ? null : null;
  img = new Image();
  img.decoding = "async";
  img.src = url;
  htmlImageCache.set(url, img);
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Prefetch starter images into the HTMLImage cache (fire-and-forget). */
export function prefetchStarterImages(srcs: string[]) {
  for (const s of srcs) {
    const url = resolveAssetUrl(s);
    if (htmlImageCache.has(url)) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    htmlImageCache.set(url, img);
  }
}

async function fetchBlob(src: string): Promise<Blob> {
  const url = resolveAssetUrl(src);
  // try plain first (CDN-friendly), then cache-bust
  let res = await fetch(url, { cache: "force-cache" }).catch(() => null);
  if (!res || !res.ok) {
    const bust = url.includes("?") ? `${url}&_pp=${Date.now()}` : `${url}?_pp=${Date.now()}`;
    res = await fetch(bust, { cache: "reload" });
  }
  if (!res.ok) throw new Error(`fetch ${src} → ${res.status}`);
  const blob = await res.blob();
  if (!blob || blob.size < 32) throw new Error(`empty blob ${src}`);
  return blob;
}

/** Load image URL → pixel buffer (optionally downscale large sheets for canvas). */
export async function loadImageAsBuffer(
  src: string,
  maxDim = 512,
): Promise<{ data: Uint8ClampedArray; w: number; h: number }> {
  const cacheKey = `${src}@@${maxDim}`;
  const hit = bufferCache.get(cacheKey);
  if (hit) return { data: new Uint8ClampedArray(hit.data), w: hit.w, h: hit.h };

  const blob = await fetchBlob(src);

  // Path A: createImageBitmap (fast, no DOM)
  let tw = 0;
  let th = 0;
  let drawn: CanvasImageSource | null = null;
  try {
    const bmp = await createImageBitmap(blob);
    tw = bmp.width;
    th = bmp.height;
    drawn = bmp;
  } catch {
    // Path B: HTMLImageElement via object URL
    const obj = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error(`decode ${src}`));
        im.src = obj;
      });
      tw = img.naturalWidth || img.width;
      th = img.naturalHeight || img.height;
      drawn = img;
      // also seed html cache with a non-revoked path
      const stable = new Image();
      stable.src = resolveAssetUrl(src);
      htmlImageCache.set(resolveAssetUrl(src), stable);
    } finally {
      URL.revokeObjectURL(obj);
    }
  }

  // Path C: direct Image src (no blob) if still nothing
  if (!drawn || !tw || !th) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(`img ${src}`));
      im.src = resolveAssetUrl(src);
    });
    tw = img.naturalWidth || img.width;
    th = img.naturalHeight || img.height;
    drawn = img;
    htmlImageCache.set(resolveAssetUrl(src), img);
  }

  if (!tw || !th || !drawn) throw new Error(`empty image ${src}`);

  let dw = tw;
  let dh = th;
  if (dw > maxDim || dh > maxDim) {
    const scale = Math.min(maxDim / dw, maxDim / dh);
    dw = Math.max(8, Math.round(dw * scale));
    dh = Math.max(8, Math.round(dh * scale));
  }

  const c = document.createElement("canvas");
  c.width = dw;
  c.height = dh;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(drawn, 0, 0, dw, dh);
  if ("close" in drawn && typeof (drawn as ImageBitmap).close === "function") {
    try {
      (drawn as ImageBitmap).close();
    } catch {
      /* */
    }
  }
  const id = ctx.getImageData(0, 0, dw, dh);
  const data = new Uint8ClampedArray(id.data);
  bufferCache.set(cacheKey, { data, w: dw, h: dh, max: maxDim });
  // seed display cache
  prefetchStarterImages([src]);
  return { data: new Uint8ClampedArray(data), w: dw, h: dh };
}

export function clearStarterBufferCache() {
  bufferCache.clear();
}

export const STARTER_CATEGORIES: { id: StarterCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "characters", label: "Characters" },
  { id: "sheets", label: "Sheets" },
  { id: "portraits", label: "Portraits" },
  { id: "environments", label: "Environments" },
  { id: "props", label: "Props" },
];
