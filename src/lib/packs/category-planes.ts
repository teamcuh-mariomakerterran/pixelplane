/**
 * Category-wired asset planes — pick Vehicles / Buildings / UI / …
 * and the matching library boards land on a dedicated wired plane for edit.
 */

import { allGoodiesItems, placeGoodiesGrid, type GoodiesItem } from "@/lib/packs/goodies";
import type { WireCategory } from "@/lib/pixel/types";

export type CatalogKind =
  | "vehicles"
  | "buildings"
  | "props"
  | "ui"
  | "gear"
  | "items"
  | "fx"
  | "roads"
  | "skyline"
  | "drinks"
  | "interiors";

export type CatalogDef = {
  id: CatalogKind;
  name: string;
  hint: string;
  wire: WireCategory;
  color: string;
};

export const CATALOG: CatalogDef[] = [
  { id: "vehicles", name: "Vehicles", hint: "Cars, fleets, trains, bikes", wire: "objects", color: "#38bdf8" },
  { id: "buildings", name: "Buildings", hint: "Towers, shops, forts, hangars", wire: "environments", color: "#4ecb71" },
  { id: "props", name: "Props", hint: "Shelves, debris, street kit", wire: "objects", color: "#e8a838" },
  { id: "ui", name: "UI / HUD", hint: "Bars, buttons, pause chrome", wire: "ui", color: "#fb7185" },
  { id: "gear", name: "Gear", hint: "Weapons, armor, gadgets", wire: "items", color: "#f0b84a" },
  { id: "items", name: "Items", hint: "Quest tools, loot, icons", wire: "items", color: "#fbbf24" },
  { id: "fx", name: "FX", hint: "Bars, shots, spark sheets", wire: "effects", color: "#3ecfcf" },
  { id: "roads", name: "Roads", hint: "Grids, highways, alleys", wire: "environments", color: "#818cf8" },
  { id: "skyline", name: "Skyline", hint: "Iso towers and blocks", wire: "environments", color: "#c084fc" },
  { id: "drinks", name: "Bar / cook", hint: "Brew station, menus, bottles", wire: "objects", color: "#f472b6" },
  { id: "interiors", name: "Interiors", hint: "Rooms, servers, living", wire: "environments", color: "#94a3b8" },
];

function hay(item: GoodiesItem) {
  return `${item.file} ${item.name}`.toLowerCase();
}

export function matchKind(item: GoodiesItem): CatalogKind | null {
  const h = hay(item);
  if (
    /vehicle|cars_|car |truck|train|bus_|taxi|motorcycle|sedan|pickup|fleet|maglev|hover train/.test(
      h,
    )
  ) {
    return "vehicles";
  }
  if (/skyline\//.test(h)) return "skyline";
  if (/ui\/|hud|pause|button|integrity|leads/.test(h)) return "ui";
  if (/gear\/|weapon|armor|rifle/.test(h)) return "gear";
  if (/items\/|quest |loot|gadget|smokes/.test(h)) return "items";
  if (/fx\/|shots_fx|hp bar/.test(h)) return "fx";
  if (/drinks\/|brew|cocktail|potion|sauce|cook|bar ·/.test(h)) return "drinks";
  if (/interior|living room|servers_/.test(h)) return "interiors";
  if (/props\/|debris|manhole|street_props|cameras & street|shelf/.test(h)) {
    return "props";
  }
  if (/roads\/|road |highway|alley|junction|connector|walkway|cobble/.test(h)) {
    return "roads";
  }
  if (
    /building|tower|facade|shop|storefront|fort|hangar|factory|apartment|mansion|temple|compound|modular|skyline|civic|slum|warehouse/.test(
      h,
    )
  ) {
    return "buildings";
  }
  return null;
}

export function itemsForKind(kind: CatalogKind): GoodiesItem[] {
  return allGoodiesItems().filter((it) => matchKind(it) === kind);
}

export function catalogCounts(): Record<CatalogKind, number> {
  const out = {} as Record<CatalogKind, number>;
  for (const d of CATALOG) out[d.id] = 0;
  for (const it of allGoodiesItems()) {
    const k = matchKind(it);
    if (k) out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export async function dropCategoryOnto(
  kind: CatalogKind,
  ox: number,
  oy: number,
): Promise<string[]> {
  const items = itemsForKind(kind);
  return placeGoodiesGrid(items, ox, oy, 5, 300);
}
