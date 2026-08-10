/**
 * Goodies Drop — Night Ops pack (Brian drop).
 * Weapons, tiles, UI, buildings, props → plane as spatial boards.
 */

import { useStudio } from "@/store/studio";
import { imageDataToBuffer, pixelateImage } from "@/lib/pixel/buffer";

const BASE = "/packs/goodies";

type Item = { file: string; name: string; x: number; y: number; max: number; kind: string };

const LAYOUT: Item[] = [
  { file: "gear/inventory_weapons_armor.png", name: "Gear · weapons & armor", x: 0, y: 0, max: 320, kind: "gear" },
  { file: "creatures/fish_and_tech.png", name: "Creatures · bio/tech", x: 360, y: 0, max: 280, kind: "creatures" },
  { file: "roads/city_road_grid.png", name: "Roads · city grid", x: 0, y: 360, max: 360, kind: "roads" },
  { file: "tiles/cyber_roads_magenta.png", name: "Tiles · neon roads", x: 400, y: 360, max: 320, kind: "tiles" },
  { file: "buildings/nMCsy.jpg", name: "Buildings · facilities", x: 760, y: 0, max: 280, kind: "buildings" },
  { file: "buildings/nUpcQ.jpg", name: "Buildings · districts", x: 1080, y: 0, max: 280, kind: "buildings" },
  { file: "buildings/wMqaj.jpg", name: "Buildings · industrial", x: 760, y: 300, max: 280, kind: "buildings" },
  { file: "buildings/jxi1x.jpg", name: "Buildings · megablocks", x: 1080, y: 300, max: 280, kind: "buildings" },
  { file: "buildings/mOZOE.jpg", name: "Buildings · junctions", x: 1400, y: 0, max: 260, kind: "buildings" },
  { file: "ui/system_paused.png", name: "UI · system paused", x: 0, y: 780, max: 200, kind: "ui" },
  { file: "ui/pause_menu.png", name: "UI · pause HUD", x: 240, y: 780, max: 200, kind: "ui" },
  { file: "ui/active_leads.png", name: "UI · active leads", x: 480, y: 780, max: 180, kind: "ui" },
  { file: "ui/city_grid_map.png", name: "UI · city grid map", x: 700, y: 780, max: 180, kind: "ui" },
  { file: "ui/buttons_cyan_pink.png", name: "UI · button set A", x: 920, y: 780, max: 220, kind: "ui" },
  { file: "ui/buttons_variants.png", name: "UI · button set B", x: 1180, y: 780, max: 220, kind: "ui" },
  { file: "ui/integrity_energy_bars.png", name: "UI · integrity/energy", x: 1440, y: 780, max: 160, kind: "ui" },
  { file: "props/shelf_full.png", name: "Props · stocked shelf", x: 1400, y: 300, max: 160, kind: "props" },
  { file: "props/shelf_emptyish.png", name: "Props · warehouse shelf", x: 1600, y: 300, max: 160, kind: "props" },
  { file: "props/office_desks_servers.png", name: "Props · office + servers", x: 1600, y: 0, max: 200, kind: "props" },
  { file: "solitaire/win_loss_counter.png", name: "Solitaire · win/loss chrome", x: 1600, y: 500, max: 120, kind: "solitaire" },
];

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(url));
    im.src = url;
  });
}

function toBoard(img: HTMLImageElement, max: number) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const full = ctx.getImageData(0, 0, img.width, img.height);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(8, Math.round(img.width * scale));
  const h = Math.max(8, Math.round(img.height * scale));
  if (scale < 1) return { data: pixelateImage(full, w, h, "16bit"), w, h };
  return { data: imageDataToBuffer(full), w: img.width, h: img.height };
}

/** Drop the full goodies pack onto the plane near camera. */
export async function summonGoodiesDrop(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 200) / z;
  const oy = (-cam.y + 120) / z;

  let placed = 0;
  for (const item of LAYOUT) {
    try {
      const img = await loadImage(`${BASE}/${item.file}`);
      const { data, w, h } = toBoard(img, item.max);
      studio.importImageToArtboard(data, w, h, item.name, ox + item.x, oy + item.y);
      placed++;
    } catch {
      /* skip */
    }
  }
  if (placed) {
    studio.createWireZone(ox - 40, oy - 40, 1900, 1100, "environments");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) studio.renameWireZone(last.id, "Goodies · Night Ops feed");
    studio.setStatus(`Goodies Drop live · ${placed} boards · Night Ops`);
    studio.setCamera({ x: -ox * z + 40, y: -oy * z + 40, zoom: Math.min(0.55, z) });
  } else {
    studio.setStatus("Goodies pack failed to load");
  }
  return placed;
}
