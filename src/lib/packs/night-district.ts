/**
 * Night District pack — cyberpunk hero, streets, vehicles, interiors.
 * Dropped onto the infinite plane as a spatial district of boards.
 */

import { useStudio } from "@/store/studio";
import { imageDataToBuffer, pixelateImage } from "@/lib/pixel/buffer";

const BASE = "/packs/night-district";

const LAYOUT: { file: string; name: string; x: number; y: number; max: number }[] = [
  { file: "cyberpunk_male_main_character.png", name: "Hero · chassis", x: 40, y: 40, max: 96 },
  { file: "Cyberpunk_male_main_character.gif", name: "Hero · walk cycle", x: 160, y: 40, max: 128 },
  { file: "hCfOH.jpg", name: "Block · apartments", x: 40, y: 200, max: 192 },
  { file: "TDOIv.jpg", name: "Block · neon strip", x: 260, y: 200, max: 192 },
  { file: "2HHGu.jpg", name: "Roads · asphalt", x: 40, y: 420, max: 192 },
  { file: "13ylw.jpg", name: "Fleet · civilian", x: 280, y: 420, max: 160 },
  { file: "DjBuP.jpg", name: "Fleet · emergency", x: 480, y: 420, max: 160 },
  { file: "a7Qbn.jpg", name: "Interior · loft", x: 480, y: 200, max: 160 },
  { file: "a_pixel_explosion_v1.gif", name: "FX · smash", x: 680, y: 40, max: 96 },
];

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`Failed ${url}`));
    im.src = url;
  });
}

function imageToBoardData(img: HTMLImageElement, max: number) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const full = ctx.getImageData(0, 0, img.width, img.height);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(8, Math.round(img.width * scale));
  const h = Math.max(8, Math.round(img.height * scale));
  if (scale < 1) {
    return { data: pixelateImage(full, w, h, "16bit"), w, h };
  }
  return { data: imageDataToBuffer(full), w: img.width, h: img.height };
}

/** Spawn Night District artboards near camera focus. */
export async function summonNightDistrict(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 420) / z - 120;
  const oy = (-cam.y + 280) / z - 80;

  let placed = 0;
  for (const item of LAYOUT) {
    try {
      const img = await loadImage(`${BASE}/${item.file}`);
      const { data, w, h } = imageToBoardData(img, item.max);
      studio.importImageToArtboard(data, w, h, item.name, ox + item.x, oy + item.y);
      placed++;
    } catch {
      /* skip */
    }
  }

  if (placed > 0) {
    studio.createWireZone(ox - 48, oy - 48, 920, 720, "environments");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) {
      studio.renameWireZone?.(last.id, "Night District feed");
      // rename may not exist — patch via update if needed
    }
    studio.setStatus(`Night District live · ${placed} boards · feed plane drawn`);
    studio.setCamera({
      x: -ox * z + 64,
      y: -oy * z + 48,
      zoom: Math.min(1.2, Math.max(0.35, z)),
    });
  } else {
    studio.setStatus("Night District pack failed to load");
  }
  return placed;
}
