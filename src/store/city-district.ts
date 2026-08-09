/**
 * City District systems — tile mutation + footing (Brian/Gemini).
 * Studio-side authoring; City Engine consumes instances at play.
 */

import { create } from "zustand";
import {
  seedCityTileRules,
  paintTileRect,
  createDecal,
  type AutoTileRule,
  type PlacedTile,
  type DecalStamp,
} from "@/lib/city-engine/tile-mutation";
import {
  seedFootingDefs,
  placeFooting,
  type FootingDef,
  type FootingInstance,
} from "@/lib/city-engine/footing";
import { useStudio } from "@/store/studio";

type CityDistrictState = {
  rules: AutoTileRule[];
  activeRuleId: string | null;
  tiles: PlacedTile[];
  decals: DecalStamp[];
  footingDefs: FootingDef[];
  footings: FootingInstance[];
  showPanel: boolean;
  showFootingDebug: boolean;
  showTileGrid: boolean;

  setShowPanel: (v: boolean) => void;
  setActiveRule: (id: string | null) => void;
  setShowFootingDebug: (v: boolean) => void;
  setShowTileGrid: (v: boolean) => void;
  paintDemoStrip: () => void;
  stampDecal: (kind: DecalStamp["kind"], x: number, y: number) => void;
  placeDemoFootings: () => void;
  clearTiles: () => void;
  exportSpec: () => string;
};

export const useCityDistrict = create<CityDistrictState>((set, get) => {
  const rules = seedCityTileRules();
  const footingDefs = seedFootingDefs();
  return {
    rules,
    activeRuleId: rules[0]?.id ?? null,
    tiles: [],
    decals: [],
    footingDefs,
    footings: [],
    showPanel: false,
    showFootingDebug: true,
    showTileGrid: true,

    setShowPanel: (showPanel) => set({ showPanel }),
    setActiveRule: (activeRuleId) => set({ activeRuleId }),
    setShowFootingDebug: (showFootingDebug) => set({ showFootingDebug }),
    setShowTileGrid: (showTileGrid) => set({ showTileGrid }),

    paintDemoStrip: () => {
      const rule =
        get().rules.find((r) => r.id === get().activeRuleId) ?? get().rules[0];
      if (!rule) return;
      const cam = useStudio.getState().camera;
      const ox = Math.floor((-cam.x + 100) / cam.zoom / rule.tileW) * rule.tileW;
      const oy = Math.floor((-cam.y + 200) / cam.zoom / rule.tileH) * rule.tileH;
      // paint 12×3 cells
      const batch = paintTileRect(rule, 0, 0, 11, 2, ox, oy);
      set((s) => ({ tiles: [...s.tiles, ...batch] }));
      // scatter a few decals
      const decals = [
        createDecal("litter", ox + 40, oy + 20),
        createDecal("skid", ox + 80, oy + 50),
        createDecal("graffiti", ox + 200, oy + 10),
        createDecal("puddle", ox + 160, oy + 55),
      ];
      set((s) => ({ decals: [...s.decals, ...decals] }));
      useStudio.getState().setStatus(
        `Tile mutation · ${batch.length} ${rule.key} cells + decals`,
      );
    },

    stampDecal: (kind, x, y) => {
      set((s) => ({ decals: [...s.decals, createDecal(kind, x, y)] }));
    },

    placeDemoFootings: () => {
      const cam = useStudio.getState().camera;
      const x = (-cam.x + 300) / cam.zoom;
      const y = (-cam.y + 280) / cam.zoom;
      const defs = get().footingDefs;
      const awning = defs.find((d) => d.id === "awning_64")!;
      const wall = defs.find((d) => d.id === "building_wall_48")!;
      const solid = defs.find((d) => d.id === "full_block")!;
      const inst = [
        placeFooting(awning, x, y),
        placeFooting(awning, x + 70, y),
        placeFooting(wall, x + 150, y - 10),
        placeFooting(solid, x + 220, y + 20),
      ];
      set((s) => ({ footings: [...s.footings, ...inst] }));
      useStudio.getState().setStatus(
        "Footing colliders placed · walk-under awnings (bottom strip only)",
      );
    },

    clearTiles: () => set({ tiles: [], decals: [], footings: [] }),

    exportSpec: () => {
      const s = get();
      const json = JSON.stringify(
        {
          version: 1,
          doctrine:
            "Weighted tile mutation + sub-tile footing; overhangs sort above actors",
          rules: s.rules,
          tiles: s.tiles.slice(0, 500),
          decals: s.decals.slice(0, 200),
          footingDefs: s.footingDefs,
          footings: s.footings.map((f) => ({
            id: f.id,
            defId: f.defId,
            x: f.x,
            y: f.y,
          })),
        },
        null,
        2,
      );
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "city_district_tiles_footing.json";
      a.click();
      return json;
    },
  };
});
