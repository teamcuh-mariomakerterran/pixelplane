/**
 * Indoor scenes — designable interiors you can walk into from the city.
 * Studio artboards with kind "indoor" feed this registry; built-ins ship as defaults.
 */

export type IndoorTile = 0 | 1 | 2 | 3 | 4 | 5;
// 0 floor · 1 wall · 2 exit door · 3 counter/furniture · 4 rug · 5 window

export type IndoorScene = {
  id: string;
  name: string;
  kind: "shop" | "apartment" | "warehouse" | "office" | "custom";
  /** tile grid width/height */
  tw: number;
  th: number;
  tileSize: number;
  tiles: Uint8Array;
  /** spawn tile when entering */
  spawnTX: number;
  spawnTY: number;
  /** outdoor world positions (city) that open this interior */
  exteriorDoors: { x: number; y: number; label?: string }[];
  floor: string;
  wall: string;
  accent: string;
  /** optional baked pixels from Studio artboard (RGBA) */
  customPixels?: Uint8ClampedArray;
  customW?: number;
  customH?: number;
};

export type IndoorRuntime = {
  scene: IndoorScene;
  /** world size for indoor camera (pixels) */
  worldW: number;
  worldH: number;
  /** collision: 1 = blocked */
  solid: Uint8Array;
};

const TS = 16;

function grid(tw: number, th: number, fill: IndoorTile = 0): Uint8Array {
  return new Uint8Array(tw * th).fill(fill);
}

function rect(
  tiles: Uint8Array,
  tw: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  t: IndoorTile,
) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x >= 0 && y >= 0 && x < tw) {
        const th = tiles.length / tw;
        if (y < th) tiles[y * tw + x] = t;
      }
    }
  }
}

function wallsBorder(tiles: Uint8Array, tw: number, th: number) {
  rect(tiles, tw, 0, 0, tw, 1, 1);
  rect(tiles, tw, 0, th - 1, tw, 1, 1);
  rect(tiles, tw, 0, 0, 1, th, 1);
  rect(tiles, tw, tw - 1, 0, 1, th, 1);
}

/** Built-in interiors — outdoor doors use fractions of city size applied later */
export function createBuiltinIndoors(
  cityW: number,
  cityH: number,
): IndoorScene[] {
  const doors = (fx: number, fy: number) => [
    { x: cityW * fx, y: cityH * fy },
  ];

  // --- Corner shop ---
  const shopTw = 18;
  const shopTh = 14;
  const shop = grid(shopTw, shopTh, 0);
  wallsBorder(shop, shopTw, shopTh);
  rect(shop, shopTw, 2, 2, 6, 2, 3); // counter
  rect(shop, shopTw, 10, 2, 5, 3, 3); // shelves
  rect(shop, shopTw, 3, 7, 4, 3, 4); // rug
  shop[(shopTh - 1) * shopTw + Math.floor(shopTw / 2)] = 2; // exit south
  shop[2 * shopTw + 1] = 5;
  shop[2 * shopTw + shopTw - 2] = 5;

  // --- Apartment loft ---
  const aptTw = 16;
  const aptTh = 16;
  const apt = grid(aptTw, aptTh, 0);
  wallsBorder(apt, aptTw, aptTh);
  rect(apt, aptTw, 1, 1, 6, 5, 0);
  rect(apt, aptTw, 8, 1, 1, aptTh - 2, 1); // divider wall
  apt[6 * aptTw + 8] = 0; // doorway in divider
  apt[7 * aptTw + 8] = 0;
  rect(apt, aptTw, 10, 2, 4, 3, 3); // bed-ish
  rect(apt, aptTw, 2, 10, 4, 3, 4);
  apt[(aptTh - 1) * aptTw + 3] = 2;

  // --- Warehouse ---
  const whTw = 24;
  const whTh = 18;
  const wh = grid(whTw, whTh, 0);
  wallsBorder(wh, whTw, whTh);
  for (let i = 0; i < 5; i++) {
    rect(wh, whTw, 2 + i * 4, 3, 2, 8, 3); // crate rows
  }
  rect(wh, whTw, 2, whTh - 4, 8, 2, 4);
  wh[(whTh - 1) * whTw + 12] = 2;
  wh[Math.floor(whTh / 2) * whTw + 0] = 2; // side exit too → treat as exit

  // --- Office ---
  const ofTw = 20;
  const ofTh = 12;
  const of = grid(ofTw, ofTh, 0);
  wallsBorder(of, ofTw, ofTh);
  rect(of, ofTw, 2, 2, 3, 2, 3);
  rect(of, ofTw, 7, 2, 3, 2, 3);
  rect(of, ofTw, 12, 2, 3, 2, 3);
  rect(of, ofTw, 2, 6, 16, 1, 4); // carpet runner
  of[(ofTh - 1) * ofTw + 10] = 2;

  return [
    {
      id: "indoor_shop",
      name: "Neon Corner Shop",
      kind: "shop",
      tw: shopTw,
      th: shopTh,
      tileSize: TS,
      tiles: shop,
      spawnTX: Math.floor(shopTw / 2),
      spawnTY: shopTh - 3,
      exteriorDoors: [
        ...doors(0.42, 0.48),
        { x: cityW * 0.42, y: cityH * 0.48, label: "Shop" },
      ],
      floor: "#3a3540",
      wall: "#1e1a24",
      accent: "#e8a838",
    },
    {
      id: "indoor_apt",
      name: "Loft Apartment",
      kind: "apartment",
      tw: aptTw,
      th: aptTh,
      tileSize: TS,
      tiles: apt,
      spawnTX: 3,
      spawnTY: aptTh - 3,
      exteriorDoors: [{ x: cityW * 0.55, y: cityH * 0.4, label: "Apt" }],
      floor: "#4a4038",
      wall: "#2a2420",
      accent: "#7c5cff",
    },
    {
      id: "indoor_wh",
      name: "Harbor Warehouse",
      kind: "warehouse",
      tw: whTw,
      th: whTh,
      tileSize: TS,
      tiles: wh,
      spawnTX: 12,
      spawnTY: whTh - 3,
      exteriorDoors: [{ x: cityW * 0.35, y: cityH * 0.62, label: "Warehouse" }],
      floor: "#3a3a38",
      wall: "#252522",
      accent: "#3ecfcf",
    },
    {
      id: "indoor_office",
      name: "Syndicate Office",
      kind: "office",
      tw: ofTw,
      th: ofTh,
      tileSize: TS,
      tiles: of,
      spawnTX: 10,
      spawnTY: ofTh - 3,
      exteriorDoors: [{ x: cityW * 0.62, y: cityH * 0.55, label: "Office" }],
      floor: "#353848",
      wall: "#1c1e28",
      accent: "#e85d5d",
    },
  ];
}

export function indoorRuntime(scene: IndoorScene): IndoorRuntime {
  const ts = scene.tileSize;
  const worldW = scene.customW ?? scene.tw * ts;
  const worldH = scene.customH ?? scene.th * ts;
  const solid = new Uint8Array(scene.tw * scene.th);
  if (scene.customPixels && scene.customW && scene.customH) {
    // sample alpha/dark as walls for studio-painted indoors
    const tw = scene.customW;
    const th = scene.customH;
    const solidPx = new Uint8Array(tw * th);
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const i = (y * tw + x) * 4;
        const a = scene.customPixels[i + 3]!;
        const avg =
          (scene.customPixels[i]! + scene.customPixels[i + 1]! + scene.customPixels[i + 2]!) / 3;
        // dark opaque = wall; very bright amber-ish bottom = door (walkable)
        const edge = x < 2 || y < 2 || x >= tw - 2 || y >= th - 2;
        solidPx[y * tw + x] = a > 200 && avg < 45 ? 1 : edge && avg < 80 ? 1 : 0;
      }
    }
    return {
      scene: { ...scene, tw, th, tileSize: 1 },
      worldW: tw,
      worldH: th,
      solid: solidPx,
    };
  }
  for (let i = 0; i < scene.tiles.length; i++) {
    const t = scene.tiles[i]!;
    solid[i] = t === 1 || t === 3 ? 1 : 0;
  }
  return { scene, worldW, worldH, solid };
}

export function indoorSolidAt(rt: IndoorRuntime, x: number, y: number): boolean {
  const ts = rt.scene.tileSize;
  const tx = Math.floor(x / ts);
  const ty = Math.floor(y / ts);
  if (tx < 0 || ty < 0 || tx >= rt.scene.tw || ty >= rt.scene.th) return true;
  return rt.solid[ty * rt.scene.tw + tx] === 1;
}

export function indoorOnExitDoor(rt: IndoorRuntime, x: number, y: number): boolean {
  const ts = rt.scene.tileSize;
  const tx = Math.floor(x / ts);
  const ty = Math.floor(y / ts);
  if (tx < 0 || ty < 0 || tx >= rt.scene.tw || ty >= rt.scene.th) return false;
  if (rt.scene.customPixels && rt.scene.customW && rt.scene.customH) {
    // bottom center amber zone acts as exit for studio indoors
    const w = rt.scene.customW;
    const h = rt.scene.customH;
    if (y > h - 10 && x > w / 2 - 12 && x < w / 2 + 12) return true;
    const i = (Math.min(h - 1, Math.max(0, ty)) * w + Math.min(w - 1, Math.max(0, tx))) * 4;
    const r = rt.scene.customPixels[i]!;
    const g = rt.scene.customPixels[i + 1]!;
    const b = rt.scene.customPixels[i + 2]!;
    return r > 180 && g > 120 && g < 200 && b < 100;
  }
  return rt.scene.tiles[ty * rt.scene.tw + tx] === 2;
}

export function nearestExteriorDoor(
  scenes: IndoorScene[],
  x: number,
  y: number,
  radius: number,
): { scene: IndoorScene; door: { x: number; y: number; label?: string }; dist: number } | null {
  let best: { scene: IndoorScene; door: { x: number; y: number; label?: string }; dist: number } | null =
    null;
  for (const scene of scenes) {
    for (const door of scene.exteriorDoors) {
      const d = Math.hypot(door.x - x, door.y - y);
      if (d <= radius && (!best || d < best.dist)) {
        best = { scene, door, dist: d };
      }
    }
  }
  return best;
}

/** Rasterize indoor tiles to offscreen canvas-friendly ImageData-like buffer */
export function bakeIndoorPixels(scene: IndoorScene): {
  data: Uint8ClampedArray;
  w: number;
  h: number;
} {
  if (scene.customPixels && scene.customW && scene.customH) {
    return { data: scene.customPixels, w: scene.customW, h: scene.customH };
  }
  const ts = scene.tileSize;
  const w = scene.tw * ts;
  const h = scene.th * ts;
  const data = new Uint8ClampedArray(w * h * 4);
  const floor = hex(scene.floor);
  const wall = hex(scene.wall);
  const accent = hex(scene.accent);
  const rug = [accent[0] * 0.5, accent[1] * 0.5, accent[2] * 0.55, 255];
  const furn = [wall[0] + 40, wall[1] + 35, wall[2] + 30, 255];
  const door = [accent[0], accent[1], accent[2], 255];
  const win = [120, 180, 220, 255];

  for (let ty = 0; ty < scene.th; ty++) {
    for (let tx = 0; tx < scene.tw; tx++) {
      const t = scene.tiles[ty * scene.tw + tx] as IndoorTile;
      let col = floor;
      if (t === 1) col = wall;
      else if (t === 2) col = door;
      else if (t === 3) col = furn;
      else if (t === 4) col = rug;
      else if (t === 5) col = win;
      // checker floor
      if (t === 0 && (tx + ty) % 2 === 0) {
        col = [floor[0] + 8, floor[1] + 8, floor[2] + 8, 255];
      }
      for (let py = 0; py < ts; py++) {
        for (let px = 0; px < ts; px++) {
          // wall edge darken
          let c = col;
          if (t === 1 && (px === 0 || py === 0)) {
            c = [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7, 255];
          }
          if (t === 2 && py < 3) c = [255, 220, 100, 255];
          const x = tx * ts + px;
          const y = ty * ts + py;
          const i = (y * w + x) * 4;
          data[i] = c[0]!;
          data[i + 1] = c[1]!;
          data[i + 2] = c[2]!;
          data[i + 3] = 255;
        }
      }
    }
  }
  return { data, w, h };
}

function hex(h: string): number[] {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
    255,
  ];
}

/**
 * Build an IndoorScene from a Studio artboard pixel buffer.
 * Transparent pixels → empty; dark → wall; mid → floor; bright accent → door.
 */
export function indoorFromArtboard(opts: {
  id: string;
  name: string;
  data: Uint8ClampedArray;
  w: number;
  h: number;
  exteriorX: number;
  exteriorY: number;
}): IndoorScene {
  return {
    id: opts.id,
    name: opts.name,
    kind: "custom",
    tw: opts.w,
    th: opts.h,
    tileSize: 1,
    tiles: new Uint8Array(opts.w * opts.h), // unused when customPixels set
    spawnTX: Math.floor(opts.w / 2),
    spawnTY: opts.h - 8,
    exteriorDoors: [{ x: opts.exteriorX, y: opts.exteriorY, label: opts.name }],
    floor: "#3a3540",
    wall: "#1e1a24",
    accent: "#e8a838",
    customPixels: opts.data,
    customW: opts.w,
    customH: opts.h,
  };
}
