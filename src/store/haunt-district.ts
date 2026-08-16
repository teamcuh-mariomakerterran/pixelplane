/**
 * Haunt District — the house wears its data on the plane.
 * Residues from play (sit, sleep, smash, voicemail) land as pads.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import type { HauntDistrict, ResiduePad } from "@/lib/haunt-district/types";
import type { IndoorBits } from "@/lib/city-engine/house-memory";
import { loadHouseMemory } from "@/lib/city-engine/house-memory";

type HauntStore = {
  districts: HauntDistrict[];
  activeId: string | null;
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
  spawnDistrict: (name?: string) => string;
  selectDistrict: (id: string | null) => void;
  ingestBits: (bits: IndoorBits) => void;
  hydrateFromMemory: (assetId?: string) => void;
  clearResidues: () => void;
};

function makeDistrict(x: number, y: number, name = "Haunt District"): HauntDistrict {
  return {
    id: uid("haunt"),
    name,
    x,
    y,
    w: 480,
    h: 320,
    color: "#c084fc",
    vaultAssetId: null,
    residues: [],
    sleepNode: { x: 36, y: 240 },
    lastSave: null,
  };
}

function residuesFrom(bits: IndoorBits): ResiduePad[] {
  const rooms = new Map(bits.rooms.map((r) => [r.id, r.name]));
  return (bits.events ?? []).slice(-18).map((e, i) => ({
    id: e.id,
    eventId: e.id,
    kind: e.kind,
    label: e.label,
    roomName: rooms.get(e.roomId) ?? "room",
    x: 24 + (i % 5) * 88,
    y: 36 + Math.floor(i / 5) * 56,
    t: e.t,
  }));
}

export const useHauntDistrict = create<HauntStore>((set, get) => ({
  districts: [],
  activeId: null,
  showPanel: false,

  setShowPanel: (showPanel) => set({ showPanel }),

  spawnDistrict: (name) => {
    const cam = useStudio.getState().camera;
    const z = cam.zoom || 1;
    const d = makeDistrict((-cam.x + 120) / z, (-cam.y + 200) / z, name);
    const mem = loadHouseMemory();
    const first = Object.values(mem)[0];
    if (first) {
      d.vaultAssetId = first.assetId;
      d.residues = residuesFrom(first);
      d.lastSave = first.savedAt;
    }
    set((s) => ({ districts: [...s.districts, d], activeId: d.id, showPanel: true }));
    useStudio.getState().setStatus("Haunt District · the house wears its data");
    return d.id;
  },

  selectDistrict: (activeId) => set({ activeId }),

  ingestBits: (bits) => {
    set((s) => {
      let districts = s.districts;
      if (!districts.length) {
        const cam = useStudio.getState().camera;
        const z = cam.zoom || 1;
        districts = [makeDistrict((-cam.x + 120) / z, (-cam.y + 200) / z)];
      }
      return {
        districts: districts.map((d, i) =>
          i === 0 || d.vaultAssetId === bits.assetId || !d.vaultAssetId
            ? {
                ...d,
                vaultAssetId: bits.assetId,
                residues: residuesFrom(bits),
                lastSave: bits.savedAt,
              }
            : d,
        ),
        activeId: s.activeId ?? districts[0]?.id ?? null,
      };
    });
  },

  hydrateFromMemory: (assetId) => {
    const mem = loadHouseMemory();
    const bits = assetId ? mem[assetId] : Object.values(mem)[0];
    if (!bits) {
      useStudio.getState().setStatus("No house memory yet — sleep on the couch");
      return;
    }
    if (!get().districts.length) get().spawnDistrict();
    get().ingestBits(bits);
    useStudio.getState().setStatus(`Haunt · ${bits.events.length} residues · ${bits.savedAt ? "saved" : "unsaved"}`);
  },

  clearResidues: () =>
    set((s) => ({
      districts: s.districts.map((d) => (d.id === s.activeId ? { ...d, residues: [], lastSave: null } : d)),
    })),
}));
