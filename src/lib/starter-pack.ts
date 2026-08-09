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

export async function loadStarterManifest(): Promise<StarterManifest> {
  if (cached) return cached;
  const res = await fetch("/starter-pack/manifest.json");
  if (!res.ok) throw new Error("Starter pack manifest missing");
  cached = (await res.json()) as StarterManifest;
  return cached;
}

/** Load image URL → pixel buffer (optionally downscale large sheets for canvas). */
export async function loadImageAsBuffer(
  src: string,
  maxDim = 512,
): Promise<{ data: Uint8ClampedArray; w: number; h: number }> {
  const bmp = await createImageBitmap(await (await fetch(src)).blob());
  let tw = bmp.width;
  let th = bmp.height;
  if (tw > maxDim || th > maxDim) {
    const scale = Math.min(maxDim / tw, maxDim / th);
    tw = Math.max(8, Math.round(tw * scale));
    th = Math.max(8, Math.round(th * scale));
  }
  const c = document.createElement("canvas");
  c.width = tw;
  c.height = th;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bmp, 0, 0, tw, th);
  const id = ctx.getImageData(0, 0, tw, th);
  return { data: new Uint8ClampedArray(id.data), w: tw, h: th };
}

export const STARTER_CATEGORIES: { id: StarterCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "characters", label: "Characters" },
  { id: "sheets", label: "Sheets" },
  { id: "portraits", label: "Portraits" },
  { id: "environments", label: "Environments" },
  { id: "props", label: "Props" },
];
