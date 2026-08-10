/**
 * Wave B signature systems: Reference Orbit · Diff Lantern · Mutation Rails.
 * Post-Calamity freestyle layer II.
 */

import { create } from "zustand";
import { useStudio } from "@/store/studio";
import { compositeLayers } from "@/lib/pixel/buffer";
import { applyRail, RAILS, diffMask } from "@/lib/pixel/mutation-rails";
import { uid } from "@/lib/utils";
import { stampTimeline } from "@/store/timeline";

export type OrbitPin = {
  boardId: string;
  label: string;
};

type DiffResult = {
  x: number;
  y: number;
  w: number;
  h: number;
  data: Uint8ClampedArray;
  changed: number;
  aName: string;
  bName: string;
  createdAt: number;
};

type SignatureState = {
  orbitPins: OrbitPin[];
  orbitEnabled: boolean;
  orbitRadius: number;
  orbitSpeed: number; // rad/s

  diffEnabled: boolean;
  diffResult: DiffResult | null;
  diffBoardA: string | null;
  diffBoardB: string | null;

  nightHeroInEngine: boolean;

  setOrbitEnabled: (v: boolean) => void;
  pinActiveToOrbit: () => void;
  unpinOrbit: (boardId: string) => void;
  clearOrbit: () => void;

  setDiffEnabled: (v: boolean) => void;
  runDiffLantern: () => void;
  clearDiff: () => void;

  spawnMutationRails: () => void;
  setNightHeroInEngine: (v: boolean) => void;
};

export const useSignature = create<SignatureState>((set, get) => ({
  orbitPins: [],
  orbitEnabled: true,
  orbitRadius: 160,
  orbitSpeed: 0.35,

  diffEnabled: false,
  diffResult: null,
  diffBoardA: null,
  diffBoardB: null,

  nightHeroInEngine: true,

  setOrbitEnabled: (orbitEnabled) => set({ orbitEnabled }),

  pinActiveToOrbit: () => {
    const s = useStudio.getState();
    const id = s.activeArtboardId;
    if (!id) {
      s.setStatus("Select a board to pin into Reference Orbit");
      return;
    }
    const board = s.artboards.find((b) => b.id === id);
    if (!board) return;
    const pins = get().orbitPins.filter((p) => p.boardId !== id);
    if (pins.length >= 6) pins.shift();
    pins.push({ boardId: id, label: board.name });
    set({ orbitPins: pins, orbitEnabled: true });
    s.setStatus(`Orbit pin · ${board.name} (${pins.length}/6)`);
  },

  unpinOrbit: (boardId) =>
    set((st) => ({ orbitPins: st.orbitPins.filter((p) => p.boardId !== boardId) })),

  clearOrbit: () => set({ orbitPins: [] }),

  setDiffEnabled: (diffEnabled) => set({ diffEnabled }),

  runDiffLantern: () => {
    const s = useStudio.getState();
    const boards = s.artboards;
    if (boards.length < 2) {
      s.setStatus("Diff lantern needs 2+ artboards");
      return;
    }
    const a =
      boards.find((b) => b.id === s.activeArtboardId) ??
      boards[boards.length - 1]!;
    // nearest other board by center distance
    const acx = a.x + a.width / 2;
    const acy = a.y + a.height / 2;
    let b = boards[0]!;
    let best = Infinity;
    for (const cand of boards) {
      if (cand.id === a.id) continue;
      const d = Math.hypot(
        cand.x + cand.width / 2 - acx,
        cand.y + cand.height / 2 - acy,
      );
      if (d < best) {
        best = d;
        b = cand;
      }
    }
    const da = compositeLayers(a.layers, a.width, a.height);
    const db = compositeLayers(b.layers, b.width, b.height);
    const mask = diffMask(da, db, a.width, a.height, a.width, a.height, b.width, b.height);
    const result: DiffResult = {
      x: a.x,
      y: a.y,
      w: mask.w,
      h: mask.h,
      data: mask.data,
      changed: mask.changed,
      aName: a.name,
      bName: b.name,
      createdAt: Date.now(),
    };
    set({
      diffResult: result,
      diffEnabled: true,
      diffBoardA: a.id,
      diffBoardB: b.id,
    });
    s.setStatus(
      `Diff lantern · ${mask.changed} px differ · ${a.name} ↔ ${b.name}`,
    );
    stampTimeline("Diff lantern", `${mask.changed} Δ`);
  },

  clearDiff: () => set({ diffResult: null, diffEnabled: false }),

  spawnMutationRails: () => {
    const s = useStudio.getState();
    const id = s.activeArtboardId;
    const board = s.artboards.find((b) => b.id === id);
    if (!board) {
      s.setStatus("Select a board for Mutation Rails");
      return;
    }
    s.pushHistory();
    const src = compositeLayers(board.layers, board.width, board.height);
    let i = 0;
    for (const rail of RAILS) {
      const data = applyRail(src, rail.id);
      const name = `${board.name} · ${rail.name}`;
      const ox = board.x + board.width + 24 + i * (board.width + 16);
      const oy = board.y + 8;
      s.importImageToArtboard(data, board.width, board.height, name, ox, oy);
      i++;
    }
    // soft link pins for orbit so variants circle the parent
    const pins = get().orbitPins.slice();
    for (const rail of RAILS) {
      const name = `${board.name} · ${rail.name}`;
      const b = useStudio.getState().artboards.find((x) => x.name === name);
      if (b && !pins.some((p) => p.boardId === b.id)) {
        pins.push({ boardId: b.id, label: rail.name });
      }
    }
    set({ orbitPins: pins.slice(-6), orbitEnabled: true });
    s.setStatus(`Mutation rails · ${RAILS.length} variants from ${board.name}`);
    stampTimeline("Mutation rails", board.name);
  },

  setNightHeroInEngine: (nightHeroInEngine) => set({ nightHeroInEngine }),
}));
