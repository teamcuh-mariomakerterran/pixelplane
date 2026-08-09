/**
 * Hard plane systems store: private masks (A3), interest (D_10x), play ghosts, watch role.
 */

import { create } from "zustand";
import {
  createMask,
  pruneExpired,
  type MaskMode,
  type PrivateMask,
} from "@/lib/spatial/private-mask";
import {
  interestChunksForCamera,
  type ChunkKey,
  CHUNK,
} from "@/lib/spatial/interest";
import type { PlayTrace } from "@/lib/city-engine/play-trace";
import { useStudio } from "@/store/studio";
import { emptyArtboardFromBuffer } from "@/store/collab-import";

export type CollabRole = "editor" | "witness";

type PlaneSystemsState = {
  masks: PrivateMask[];
  /** drawing a mask */
  maskDraft: { x0: number; y0: number; x1: number; y1: number; mode: MaskMode } | null;
  maskTool: boolean;
  maskMode: MaskMode;
  /** D_10x local interest set */
  localInterest: ChunkKey[];
  peerInterest: Record<string, ChunkKey[]>;
  /** witness = watch mode, no destructive edits expected */
  collabRole: CollabRole;
  playGhosts: PlayTrace[];
  showChunkGrid: boolean;
  showExportMap: boolean;

  setMaskTool: (v: boolean) => void;
  setMaskMode: (m: MaskMode) => void;
  beginMask: (wx: number, wy: number) => void;
  updateMaskDraft: (wx: number, wy: number) => void;
  commitMask: (opts?: { ownerId?: string; ownerName?: string; ttlMs?: number | null }) => void;
  cancelMask: () => void;
  removeMask: (id: string) => void;
  pruneMasks: () => void;

  updateLocalInterest: (cam: { x: number; y: number; zoom: number }, sw: number, sh: number) => void;
  setPeerInterest: (peerId: string, chunks: ChunkKey[]) => void;
  setCollabRole: (r: CollabRole) => void;
  setShowChunkGrid: (v: boolean) => void;
  setShowExportMap: (v: boolean) => void;

  /** drop play ghost onto plane as note artboard */
  commitPlayGhost: (tr: PlayTrace) => void;
};

export const usePlaneSystems = create<PlaneSystemsState>((set, get) => ({
  masks: [],
  maskDraft: null,
  maskTool: false,
  maskMode: "private",
  localInterest: [],
  peerInterest: {},
  collabRole: "editor",
  playGhosts: [],
  showChunkGrid: false,
  showExportMap: false,

  setMaskTool: (maskTool) => set({ maskTool }),
  setMaskMode: (maskMode) => set({ maskMode }),
  beginMask: (wx, wy) =>
    set({
      maskDraft: { x0: wx, y0: wy, x1: wx, y1: wy, mode: get().maskMode },
      maskTool: true,
    }),
  updateMaskDraft: (wx, wy) =>
    set((s) =>
      s.maskDraft ? { maskDraft: { ...s.maskDraft, x1: wx, y1: wy } } : {},
    ),
  commitMask: (opts) => {
    const d = get().maskDraft;
    if (!d) return;
    const x = Math.min(d.x0, d.x1);
    const y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0);
    const h = Math.abs(d.y1 - d.y0);
    if (w < 24 || h < 24) {
      set({ maskDraft: null });
      return;
    }
    const m = createMask({
      x,
      y,
      w,
      h,
      mode: d.mode,
      ownerId: opts?.ownerId ?? "local",
      ownerName: opts?.ownerName ?? "You",
      ttlMs: opts?.ttlMs ?? (d.mode === "private" ? 30 * 60 * 1000 : null),
    });
    set((s) => ({
      masks: pruneExpired([...s.masks, m]),
      maskDraft: null,
      maskTool: false,
    }));
    useStudio.getState().setStatus(`Mask · ${m.name} (${m.mode})`);
  },
  cancelMask: () => set({ maskDraft: null, maskTool: false }),
  removeMask: (id) => set((s) => ({ masks: s.masks.filter((m) => m.id !== id) })),
  pruneMasks: () => set((s) => ({ masks: pruneExpired(s.masks) })),

  updateLocalInterest: (cam, sw, sh) => {
    const setKeys = interestChunksForCamera(cam, sw, sh, 1, CHUNK);
    set({ localInterest: [...setKeys] });
  },
  setPeerInterest: (peerId, chunks) =>
    set((s) => ({ peerInterest: { ...s.peerInterest, [peerId]: chunks } })),
  setCollabRole: (collabRole) => {
    set({ collabRole });
    useStudio.getState().setStatus(
      collabRole === "witness"
        ? "Watch mode · you observe, edits stay soft"
        : "Editor mode · full plane tools",
    );
  },
  setShowChunkGrid: (showChunkGrid) => set({ showChunkGrid }),
  setShowExportMap: (showExportMap) => set({ showExportMap }),

  commitPlayGhost: (tr) => {
    void import("@/lib/city-engine/play-trace").then(({ rasterizeTrace }) => {
      const { data, w, h, name } = rasterizeTrace(tr);
      emptyArtboardFromBuffer({
        name,
        w,
        h,
        data,
        x: 2200 + Math.random() * 80,
        y: 900 + Math.random() * 60,
      });
      set((s) => ({ playGhosts: [...s.playGhosts.slice(-11), tr] }));
      useStudio.getState().setStatus(`Play Ghost dropped on plane · ${name}`);
    });
  },
}));
