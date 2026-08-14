/**
 * Category asset planes — a wired workspace per library category.
 */

import { create } from "zustand";
import { useStudio } from "@/store/studio";
import { stampTimeline } from "@/store/timeline";
import { uid } from "@/lib/utils";
import {
  CATALOG,
  catalogCounts,
  dropCategoryOnto,
  type CatalogKind,
} from "@/lib/packs/category-planes";

export type CategoryPlane = {
  id: string;
  kind: CatalogKind;
  zoneId: string;
  boardIds: string[];
  x: number;
  y: number;
  w: number;
  h: number;
};

type CatState = {
  planes: CategoryPlane[];
  showPanel: boolean;
  loading: CatalogKind | null;
  setShowPanel: (v: boolean) => void;
  openKind: (kind: CatalogKind) => Promise<void>;
  jumpTo: (kind: CatalogKind) => boolean;
  counts: () => Record<CatalogKind, number>;
};

const LS = "pixelplane_category_planes_v1";

function loadPlanes(): CategoryPlane[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return [];
    const p = JSON.parse(raw) as CategoryPlane[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function persist(planes: CategoryPlane[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS, JSON.stringify(planes));
  } catch {
    /* */
  }
}

function openFieldOrigin() {
  const s = useStudio.getState();
  let maxX = 2600;
  for (const b of s.artboards) maxX = Math.max(maxX, b.x + b.width);
  for (const z of s.wireZones) maxX = Math.max(maxX, z.x + z.w);
  return { x: Math.round(maxX + 160), y: 80 };
}

export const useCategoryPlanes = create<CatState>((set, get) => ({
  planes: loadPlanes(),
  showPanel: false,
  loading: null,

  setShowPanel: (showPanel) => set({ showPanel }),

  counts: () => catalogCounts(),

  jumpTo: (kind) => {
    const plane = get().planes.find((p) => p.kind === kind);
    if (!plane) return false;
    const s = useStudio.getState();
    const zone = s.wireZones.find((z) => z.id === plane.zoneId);
    const x = zone?.x ?? plane.x;
    const y = zone?.y ?? plane.y;
    s.setCamera({
      x: -x * 0.45 + 40,
      y: -y * 0.45 + 60,
      zoom: 0.45,
    });
    if (zone) s.selectWireZone(zone.id);
    s.setStatus(`Category plane · ${CATALOG.find((c) => c.id === kind)?.name ?? kind}`);
    return true;
  },

  openKind: async (kind) => {
    if (get().jumpTo(kind)) {
      set({ showPanel: true });
      return;
    }
    const def = CATALOG.find((c) => c.id === kind);
    if (!def) return;
    set({ loading: kind, showPanel: true });
    const origin = openFieldOrigin();
    const s = useStudio.getState();
    s.setStatus(`Opening ${def.name} plane…`);
    try {
      const boardIds = await dropCategoryOnto(kind, origin.x, origin.y);
      if (!boardIds.length) {
        s.setStatus(`No ${def.name} sheets in the library`);
        set({ loading: null });
        return;
      }
      const cols = 5;
      const rows = Math.ceil(boardIds.length / cols);
      const w = cols * 300 + 40;
      const h = rows * 300 + 40;
      const zoneId = s.createWireZone(origin.x - 24, origin.y - 36, w, h, def.wire);
      if (zoneId) {
        s.renameWireZone(zoneId, `${def.name} · edit plane`);
        const trig =
          kind === "fx" ? "boil" : kind === "roads" ? "tile_kit" : "qa";
        s.setZoneTrigger(zoneId, trig, true);
      }
      const plane: CategoryPlane = {
        id: uid("catplane"),
        kind,
        zoneId: zoneId || "",
        boardIds,
        x: origin.x - 24,
        y: origin.y - 36,
        w,
        h,
      };
      const planes = [...get().planes.filter((p) => p.kind !== kind), plane];
      persist(planes);
      set({ planes, loading: null });
      s.setCamera({
        x: -origin.x * 0.4 + 40,
        y: -origin.y * 0.4 + 50,
        zoom: 0.4,
      });
      s.setStatus(`${def.name} plane · ${boardIds.length} boards · wired as ${def.wire}`);
      stampTimeline(`${def.name} plane`, `${boardIds.length} assets`);
    } catch (e) {
      console.error(e);
      useStudio.getState().setStatus(`${def.name} plane failed`);
      set({ loading: null });
    }
  },
}));
