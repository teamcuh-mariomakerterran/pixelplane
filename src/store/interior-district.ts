/**
 * Interior District — spatial floor-plan authoring.
 * Room pads = rooms. Tethers = doors/stairs. Push writes back to the vault.
 */

import { create } from "zustand";
import { useStudio } from "@/store/studio";
import { useAssetVault } from "@/store/asset-vault";
import { createInteriorDistrict, hydrateFromVault } from "@/lib/interior-district/layout";
import type { InteriorDistrict } from "@/lib/interior-district/types";
import { roomFloor } from "@/lib/vault/types";

type InteriorStore = {
  districts: InteriorDistrict[];
  activeId: string | null;
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
  spawnDistrict: (name?: string) => string;
  selectDistrict: (id: string | null) => void;
  pullFromVault: (assetId?: string) => void;
  pushToVault: () => void;
  togglePadLock: (padId: string) => void;
  togglePadDark: (padId: string) => void;
  togglePadWindow: (padId: string) => void;
  renamePad: (padId: string, name: string) => void;
};

export const useInteriorDistrict = create<InteriorStore>((set, get) => ({
  districts: [],
  activeId: null,
  showPanel: false,

  setShowPanel: (showPanel) => set({ showPanel }),

  spawnDistrict: (name) => {
    const cam = useStudio.getState().camera;
    const z = cam.zoom || 1;
    const d = createInteriorDistrict(name, (-cam.x + 80) / z, (-cam.y + 80) / z);
    set((s) => ({ districts: [...s.districts, d], activeId: d.id, showPanel: true }));
    useStudio.getState().setStatus("Interior District · pull a vault building onto the pads");
    return d.id;
  },

  selectDistrict: (activeId) => set({ activeId }),

  pullFromVault: (assetId) => {
    let s = get();
    if (!s.activeId) get().spawnDistrict();
    s = get();
    const d = s.districts.find((x) => x.id === s.activeId);
    if (!d) return;
    const vault = useAssetVault.getState();
    const asset =
      vault.assets.find((a) => a.id === (assetId ?? vault.selectedId ?? d.vaultAssetId)) ??
      vault.assets.find((a) => a.enterable);
    if (!asset) {
      useStudio.getState().setStatus("No enterable vault building to pull");
      return;
    }
    const next = hydrateFromVault(d, asset);
    set((st) => ({
      districts: st.districts.map((x) => (x.id === d.id ? next : x)),
    }));
    useStudio.getState().setStatus(`Interior District · ${asset.name} on the plane`);
  },

  pushToVault: () => {
    const s = get();
    const d = s.districts.find((x) => x.id === s.activeId);
    if (!d?.vaultAssetId) {
      useStudio.getState().setStatus("Pull a building first");
      return;
    }
    const vault = useAssetVault.getState();
    const asset = vault.assets.find((a) => a.id === d.vaultAssetId);
    if (!asset) return;
    const rooms = asset.rooms.map((r) => {
      const pad = d.roomPads.find((p) => p.roomId === r.id);
      if (!pad) return r;
      return {
        ...r,
        name: pad.name,
        floor: pad.floor,
        dark: pad.dark,
        locked: pad.locked,
        secret: pad.locked && roomFloor(r) < 0,
        window: pad.window,
        downstairs: pad.floor < 0,
      };
    });
    useAssetVault.setState((st) => ({
      assets: st.assets.map((a) => (a.id === asset.id ? { ...a, rooms } : a)),
    }));
    useAssetVault.getState().rename(asset.id, asset.name);
    useStudio.getState().setStatus(`Pushed plan · ${asset.name} · ${d.roomPads.length} rooms`);
  },

  togglePadLock: (padId) =>
    set((s) => ({
      districts: s.districts.map((d) =>
        d.id !== s.activeId
          ? d
          : { ...d, roomPads: d.roomPads.map((p) => (p.id === padId ? { ...p, locked: !p.locked } : p)) },
      ),
    })),
  togglePadDark: (padId) =>
    set((s) => ({
      districts: s.districts.map((d) =>
        d.id !== s.activeId
          ? d
          : { ...d, roomPads: d.roomPads.map((p) => (p.id === padId ? { ...p, dark: !p.dark } : p)) },
      ),
    })),
  togglePadWindow: (padId) =>
    set((s) => ({
      districts: s.districts.map((d) =>
        d.id !== s.activeId
          ? d
          : { ...d, roomPads: d.roomPads.map((p) => (p.id === padId ? { ...p, window: !p.window } : p)) },
      ),
    })),
  renamePad: (padId, name) =>
    set((s) => ({
      districts: s.districts.map((d) =>
        d.id !== s.activeId
          ? d
          : { ...d, roomPads: d.roomPads.map((p) => (p.id === padId ? { ...p, name } : p)) },
      ),
    })),
}));
