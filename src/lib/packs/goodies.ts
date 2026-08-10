/**
 * Goodies Drop — Night Ops pack (Brian drops wave 1–3).
 * Gear, skyline, props, quest items, brew/cook drinks → plane boards.
 */

import { useStudio } from "@/store/studio";
import { imageDataToBuffer, pixelateImage } from "@/lib/pixel/buffer";
import { stampTimeline } from "@/store/timeline";

const BASE = "/packs/goodies";

type Item = { file: string; name: string; x: number; y: number; max: number };

/** Wave 1+2 catalog boards. */
const LAYOUT_CORE: Item[] = [
  { file: "gear/inventory_weapons_armor.png", name: "Gear · weapons & armor", x: 0, y: 0, max: 300 },
  { file: "creatures/fish_and_tech.png", name: "Creatures · bio/tech", x: 340, y: 0, max: 260 },
  { file: "roads/city_road_grid.png", name: "Roads · city grid", x: 0, y: 340, max: 320 },
  { file: "tiles/cyber_roads_magenta.png", name: "Tiles · neon roads", x: 360, y: 340, max: 300 },
  { file: "buildings/nMCsy.jpg", name: "Buildings · facilities", x: 700, y: 0, max: 260 },
  { file: "buildings/nUpcQ.jpg", name: "Buildings · districts", x: 1000, y: 0, max: 260 },
  { file: "buildings/wMqaj.jpg", name: "Buildings · industrial", x: 700, y: 280, max: 260 },
  { file: "buildings/jxi1x.jpg", name: "Buildings · megablocks", x: 1000, y: 280, max: 260 },
  { file: "buildings/mOZOE.jpg", name: "Buildings · junctions", x: 1300, y: 0, max: 240 },
  { file: "ui/system_paused.png", name: "UI · system paused", x: 0, y: 720, max: 180 },
  { file: "ui/pause_menu.png", name: "UI · pause HUD", x: 220, y: 720, max: 180 },
  { file: "ui/active_leads.png", name: "UI · active leads", x: 440, y: 720, max: 160 },
  { file: "ui/city_grid_map.png", name: "UI · city grid map", x: 640, y: 720, max: 160 },
  { file: "ui/buttons_cyan_pink.png", name: "UI · button set A", x: 840, y: 720, max: 200 },
  { file: "ui/buttons_variants.png", name: "UI · button set B", x: 1080, y: 720, max: 200 },
  { file: "ui/integrity_energy_bars.png", name: "UI · integrity/energy", x: 1320, y: 720, max: 150 },
  { file: "props/shelf_full.png", name: "Props · stocked shelf", x: 1300, y: 280, max: 150 },
  { file: "props/shelf_emptyish.png", name: "Props · warehouse shelf", x: 1500, y: 280, max: 150 },
  { file: "props/office_desks_servers.png", name: "Props · office + servers", x: 1500, y: 0, max: 180 },
  { file: "solitaire/win_loss_counter.png", name: "Solitaire · win/loss chrome", x: 1500, y: 480, max: 110 },
  { file: "buildings/landmarks_metro_crane.jpg", name: "Landmarks · metro & crane", x: 0, y: 980, max: 320 },
  { file: "buildings/industrial_hangar_ship.jpg", name: "Industrial · hangar & ship", x: 360, y: 980, max: 300 },
  { file: "buildings/street_shops_named.jpg", name: "Street · named shops", x: 700, y: 980, max: 320 },
  { file: "buildings/ports_cargo_power.jpg", name: "Ports · cargo & power", x: 1060, y: 980, max: 300 },
  { file: "props/cyber_office_furniture.png", name: "Props · cyber office furniture", x: 1400, y: 980, max: 240 },
  { file: "gear/weapons_cyan_heavy.png", name: "Gear · cyan heavy weapons", x: 0, y: 1380, max: 360 },
  { file: "gear/weapons_blue_magic.png", name: "Gear · blue magic arsenal", x: 400, y: 1380, max: 320 },
  { file: "gear/weapons_rifles_gadgets.png", name: "Gear · rifles & gadgets", x: 760, y: 1380, max: 360 },
  { file: "fx/hp_bar_strip.png", name: "FX · HP bar strip", x: 1160, y: 1380, max: 200 },
  { file: "items/scavenge_loot.jpg", name: "Items · scavenge loot", x: 0, y: 1780, max: 220 },
  { file: "items/quest_tools_1_8.jpg", name: "Items · quest tools 1–8", x: 260, y: 1780, max: 260 },
  { file: "items/quest_icons_utility.jpg", name: "Items · utility icons", x: 560, y: 1780, max: 220 },
  { file: "items/quest_gadgets_named.jpg", name: "Items · named gadgets", x: 820, y: 1780, max: 260 },
  { file: "items/smokes_packs.jpg", name: "Items · street smokes", x: 1120, y: 1780, max: 200 },
  { file: "drinks/brewing_ui.jpg", name: "Brew · station UI", x: 0, y: 2120, max: 280 },
  { file: "drinks/brewing_station_full.jpg", name: "Brew · full station", x: 320, y: 2120, max: 300 },
  { file: "drinks/cooking_ui_icons.jpg", name: "Cook · profession icons", x: 660, y: 2120, max: 240 },
  { file: "drinks/cocktails_menu_a.jpg", name: "Bar · cocktail menu A", x: 940, y: 2120, max: 260 },
  { file: "drinks/distill_ingredients.jpg", name: "Bar · distill ingredients", x: 1240, y: 2120, max: 220 },
  { file: "drinks/potion_bottles.jpg", name: "Brew · potion bottles", x: 0, y: 2460, max: 240 },
  { file: "drinks/sauces_hot.jpg", name: "Kitchen · sauces & heat", x: 280, y: 2460, max: 220 },
  { file: "drinks/shots_fx.jpg", name: "Bar · shot effects", x: 540, y: 2460, max: 220 },
  { file: "drinks/named_pours.jpg", name: "Bar · named pours", x: 800, y: 2460, max: 240 },
  { file: "drinks/bladerunner_menu.jpg", name: "Bar · Blade runner menu", x: 1080, y: 2460, max: 260 },
  { file: "props/psu_fan_cube.jpg", name: "Props · PSU fan cube", x: 1400, y: 2460, max: 160 },
];

/** Wave 3 — isometric skyline buildings (individual props). */
const LAYOUT_SKYLINE: Item[] = [
  { file: "skyline/corp_tower.jpg", name: "Skyline · Corp tower", x: 0, y: 0, max: 160 },
  { file: "skyline/control_tower.jpg", name: "Skyline · Control tower", x: 200, y: 0, max: 160 },
  { file: "skyline/ware_6x6.jpg", name: "Skyline · WARE 6×6", x: 400, y: 0, max: 150 },
  { file: "skyline/plaza_twins.jpg", name: "Skyline · Plaza twins", x: 600, y: 0, max: 180 },
  { file: "skyline/broadcast_tower.jpg", name: "Skyline · Broadcast tower", x: 820, y: 0, max: 160 },
  { file: "skyline/chrome_tools.jpg", name: "Skyline · Chrome Tools", x: 1020, y: 0, max: 150 },
  { file: "skyline/holo_gear.jpg", name: "Skyline · Holo Gear", x: 1220, y: 0, max: 150 },
  { file: "skyline/core_stack.jpg", name: "Skyline · Core Stack", x: 0, y: 240, max: 140 },
  { file: "skyline/duplex_neon.jpg", name: "Skyline · Neon duplex", x: 180, y: 240, max: 160 },
  { file: "skyline/data_core.jpg", name: "Skyline · Data core", x: 380, y: 240, max: 160 },
  { file: "skyline/beacon_spire.jpg", name: "Skyline · Beacon spire", x: 580, y: 240, max: 160 },
  { file: "skyline/hab_fortress.jpg", name: "Skyline · Hab Fortress", x: 780, y: 240, max: 170 },
  { file: "skyline/diamond_hq.jpg", name: "Skyline · Diamond HQ", x: 1000, y: 240, max: 150 },
  { file: "skyline/sat_hub.jpg", name: "Skyline · Satellite hub", x: 1200, y: 240, max: 160 },
  { file: "skyline/fire_escape_block.jpg", name: "Skyline · Fire-escape block", x: 1400, y: 240, max: 160 },
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

async function placeLayout(
  layout: Item[],
  ox: number,
  oy: number,
): Promise<number> {
  const studio = useStudio.getState();
  let placed = 0;
  for (const item of layout) {
    try {
      const img = await loadImage(`${BASE}/${item.file}`);
      const { data, w, h } = toBoard(img, item.max);
      studio.importImageToArtboard(data, w, h, item.name, ox + item.x, oy + item.y);
      placed++;
    } catch {
      /* skip */
    }
  }
  return placed;
}

/** Full dump wave 1–3. */
export async function summonGoodiesDrop(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 160) / z;
  const oy = (-cam.y + 80) / z;

  const a = await placeLayout(LAYOUT_CORE, ox, oy);
  const b = await placeLayout(LAYOUT_SKYLINE, ox, oy + 2800);
  const placed = a + b;

  if (placed) {
    studio.createWireZone(ox - 40, oy - 40, 1800, 3400, "environments");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) studio.renameWireZone(last.id, "Goodies · Night Ops (wave 1–3)");
    studio.setStatus(`Goodies Drop · ${placed} boards · skyline + arsenal + brew`);
    studio.setCamera({ x: -ox * z + 40, y: -oy * z + 40, zoom: Math.min(0.3, z) });
    stampTimeline("Goodies wave 1–3", `${placed} boards`);
  } else {
    studio.setStatus("Goodies pack failed to load");
  }
  return placed;
}

/** Just the isometric skyline set — faster, city-kit friendly. */
export async function summonSkylineSet(): Promise<number> {
  const studio = useStudio.getState();
  const cam = studio.camera;
  const z = cam.zoom || 1;
  const ox = (-cam.x + 200) / z;
  const oy = (-cam.y + 100) / z;

  const placed = await placeLayout(LAYOUT_SKYLINE, ox, oy);
  if (placed) {
    studio.createWireZone(ox - 40, oy - 40, 1700, 520, "environments");
    const zones = useStudio.getState().wireZones;
    const last = zones[zones.length - 1];
    if (last) studio.renameWireZone(last.id, "Skyline kit · iso buildings");
    studio.setStatus(`Skyline kit · ${placed} buildings on plane`);
    studio.setCamera({ x: -ox * z + 40, y: -oy * z + 40, zoom: Math.min(0.55, z) });
    stampTimeline("Skyline kit", `${placed} buildings`);
  }
  return placed;
}

/** Named quest tools from drop art (for inventory kernel). */
export const QUEST_TOOL_LABELS = [
  "Audio Deck",
  "Isolation Beads",
  "Maint Wrench",
  "Trojan Drive",
  "Piston Fuel",
  "Matrix Chip",
  "Hazard Boots",
  "Access Pass",
] as const;
