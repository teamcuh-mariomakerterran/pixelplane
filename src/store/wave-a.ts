/**
 * Wave A plane entities: game viewports, constraint stamps, heat/ghost toggles.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import {
  type ConstraintStamp,
  type GameViewport,
  VIEWPORT_PRESETS,
  STAMP_PRESETS,
} from "@/lib/spatial/wave-a";

type WaveAState = {
  gameViewports: GameViewport[];
  activeViewportId: string | null;
  constraintStamps: ConstraintStamp[];
  activeStampId: string | null;
  showWireHeatMap: boolean;
  showSessionGhosts: boolean;
  defaultViewportPreset: number;
  defaultStampPreset: number;

  setShowWireHeatMap: (v: boolean) => void;
  setShowSessionGhosts: (v: boolean) => void;
  setDefaultViewportPreset: (i: number) => void;
  setDefaultStampPreset: (i: number) => void;

  addGameViewport: (x: number, y: number, presetIndex?: number) => string;
  selectViewport: (id: string | null) => void;
  updateViewport: (id: string, patch: Partial<GameViewport>) => void;
  deleteViewport: (id: string) => void;
  captureViewportPng: (id: string) => string | null;

  addConstraintStamp: (x: number, y: number, presetIndex?: number) => string;
  selectStamp: (id: string | null) => void;
  updateStamp: (id: string, patch: Partial<ConstraintStamp>) => void;
  deleteStamp: (id: string) => void;
  setActiveStamp: (id: string | null) => void;
};

const LS = "pixelplane_wave_a_v1";

function load(): Partial<WaveAState> {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<WaveAState>;
  } catch {
    return {};
  }
}

function persist(s: WaveAState) {
  try {
    localStorage.setItem(
      LS,
      JSON.stringify({
        gameViewports: s.gameViewports,
        constraintStamps: s.constraintStamps,
        showWireHeatMap: s.showWireHeatMap,
        showSessionGhosts: s.showSessionGhosts,
        defaultViewportPreset: s.defaultViewportPreset,
        defaultStampPreset: s.defaultStampPreset,
        activeViewportId: s.activeViewportId,
        activeStampId: s.activeStampId,
      }),
    );
  } catch {
    /* ignore */
  }
}

const saved = load();

export const useWaveA = create<WaveAState>((set, get) => ({
  gameViewports: saved.gameViewports ?? [],
  activeViewportId: saved.activeViewportId ?? null,
  constraintStamps: saved.constraintStamps ?? [],
  activeStampId: saved.activeStampId ?? null,
  showWireHeatMap: saved.showWireHeatMap ?? false,
  showSessionGhosts: saved.showSessionGhosts ?? true,
  defaultViewportPreset: saved.defaultViewportPreset ?? 3,
  defaultStampPreset: saved.defaultStampPreset ?? 3,

  setShowWireHeatMap: (showWireHeatMap) => {
    set({ showWireHeatMap });
    persist(get());
  },
  setShowSessionGhosts: (showSessionGhosts) => {
    set({ showSessionGhosts });
    persist(get());
  },
  setDefaultViewportPreset: (defaultViewportPreset) => {
    set({ defaultViewportPreset });
    persist(get());
  },
  setDefaultStampPreset: (defaultStampPreset) => {
    set({ defaultStampPreset });
    persist(get());
  },

  addGameViewport: (x, y, presetIndex) => {
    const pi = presetIndex ?? get().defaultViewportPreset;
    const p = VIEWPORT_PRESETS[pi] ?? VIEWPORT_PRESETS[3];
    // display at 2× res for readability on plane
    const scale = 2;
    const id = uid("gvp");
    const vp: GameViewport = {
      id,
      name: `Game ${p.resW}×${p.resH}`,
      x,
      y,
      w: p.resW * scale,
      h: p.resH * scale,
      resW: p.resW,
      resH: p.resH,
      showSafeArea: true,
      showHudGuide: true,
      color: "#e8a838",
    };
    set((s) => {
      const next = {
        ...s,
        gameViewports: [...s.gameViewports, vp],
        activeViewportId: id,
      };
      persist(next as WaveAState);
      return next;
    });
    return id;
  },

  selectViewport: (activeViewportId) => {
    set({ activeViewportId });
    persist(get());
  },

  updateViewport: (id, patch) => {
    set((s) => {
      const next = {
        ...s,
        gameViewports: s.gameViewports.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      };
      persist(next as WaveAState);
      return next;
    });
  },

  deleteViewport: (id) => {
    set((s) => {
      const next = {
        ...s,
        gameViewports: s.gameViewports.filter((v) => v.id !== id),
        activeViewportId: s.activeViewportId === id ? null : s.activeViewportId,
      };
      persist(next as WaveAState);
      return next;
    });
  },

  captureViewportPng: (id) => {
    const vp = get().gameViewports.find((v) => v.id === id);
    if (!vp || typeof document === "undefined") return null;
    const canvases = [...document.querySelectorAll("canvas")];
    let best: HTMLCanvasElement | null = null;
    let bestArea = 0;
    for (const c of canvases) {
      const a = c.width * c.height;
      if (a > bestArea && c.width > 200) {
        best = c;
        bestArea = a;
      }
    }
    if (!best) return null;
    // Map world rect → approximate screen via camera is hard without cam;
    // capture full canvas and label as viewport reference for now
    try {
      const off = document.createElement("canvas");
      off.width = vp.resW;
      off.height = vp.resH;
      const ctx = off.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#0c0e14";
      ctx.fillRect(0, 0, vp.resW, vp.resH);
      // scale plane into resolution box
      ctx.drawImage(best, 0, 0, best.width, best.height, 0, 0, vp.resW, vp.resH);
      const url = off.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vp.name.replace(/\s+/g, "_")}_${vp.resW}x${vp.resH}.png`;
      a.click();
      return url;
    } catch {
      return null;
    }
  },

  addConstraintStamp: (x, y, presetIndex) => {
    const pi = presetIndex ?? get().defaultStampPreset;
    const p = STAMP_PRESETS[pi] ?? STAMP_PRESETS[3];
    const id = uid("stamp");
    const stamp: ConstraintStamp = {
      id,
      name: `${p.w}×${p.h}`,
      x,
      y,
      pixelW: p.w,
      pixelH: p.h,
      scale: 2,
      color: "#2dd4bf",
      active: true,
    };
    set((s) => {
      const stamps = s.constraintStamps.map((t) => ({ ...t, active: false }));
      const next = {
        ...s,
        constraintStamps: [...stamps, stamp],
        activeStampId: id,
      };
      persist(next as WaveAState);
      return next;
    });
    return id;
  },

  selectStamp: (activeStampId) => {
    set({ activeStampId });
    persist(get());
  },

  updateStamp: (id, patch) => {
    set((s) => {
      const next = {
        ...s,
        constraintStamps: s.constraintStamps.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      };
      persist(next as WaveAState);
      return next;
    });
  },

  deleteStamp: (id) => {
    set((s) => {
      const next = {
        ...s,
        constraintStamps: s.constraintStamps.filter((t) => t.id !== id),
        activeStampId: s.activeStampId === id ? null : s.activeStampId,
      };
      persist(next as WaveAState);
      return next;
    });
  },

  setActiveStamp: (id) => {
    set((s) => {
      const next = {
        ...s,
        activeStampId: id,
        constraintStamps: s.constraintStamps.map((t) => ({
          ...t,
          active: t.id === id,
        })),
      };
      persist(next as WaveAState);
      return next;
    });
  },
}));
