/**
 * Spatial navigation — Look-at-This beacons (B3) + First Night path (A1).
 * Camera beacons are plane physics, not just social sugar (Gemini).
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { FIRST_NIGHT_STEPS, type FirstNightStep } from "@/lib/first-night/path";
import { useStudio } from "@/store/studio";

export type SpatialBeacon = {
  id: string;
  x: number;
  y: number;
  zoom: number;
  label: string;
  color: string;
  createdAt: number;
  /** peer name if from collab */
  fromName?: string;
  /** first-night step id if seeded by tour */
  stepId?: string;
};

type SpatialNavState = {
  beacons: SpatialBeacon[];
  /** last beacon we auto-jumped to */
  activeBeaconId: string | null;
  firstNightOn: boolean;
  firstNightIndex: number;
  /** soft spatial pad for scope v2 (family cluster) */
  softPad: number;
  showScopeOverlaps: boolean;

  dropBeacon: (opts?: {
    label?: string;
    color?: string;
    fromName?: string;
    worldX?: number;
    worldY?: number;
    zoom?: number;
    jump?: boolean;
  }) => string;
  jumpToBeacon: (id: string) => void;
  removeBeacon: (id: string) => void;
  clearBeacons: () => void;
  cycleBeacons: () => void;

  startFirstNight: () => void;
  nextFirstNight: () => void;
  prevFirstNight: () => void;
  stopFirstNight: () => void;
  goFirstNightStep: (i: number) => void;
  setSoftPad: (n: number) => void;
  setShowScopeOverlaps: (v: boolean) => void;
};

function viewCenterWorld() {
  const cam = useStudio.getState().camera;
  const vw = typeof window !== "undefined" ? window.innerWidth - 360 : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight - 80 : 700;
  // camera x,y is top-left of view in world? check setCamera usage
  // From CanvasWorkspace: typically cam.x + world * zoom = screen
  // world at screen center:
  const wx = (vw / 2 - cam.x) / cam.zoom;
  const wy = (vh / 2 - cam.y) / cam.zoom;
  return { x: wx, y: wy, zoom: cam.zoom };
}

function focusWorld(x: number, y: number, zoom: number) {
  const vw = typeof window !== "undefined" ? window.innerWidth - 360 : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight - 80 : 700;
  // Place world (x,y) at view center: cam.x + x*zoom = vw/2
  useStudio.getState().setCamera({
    x: vw / 2 - x * zoom,
    y: vh / 2 - y * zoom,
    zoom,
  });
}

export const useSpatialNav = create<SpatialNavState>((set, get) => ({
  beacons: [],
  activeBeaconId: null,
  firstNightOn: false,
  firstNightIndex: 0,
  softPad: 80,
  showScopeOverlaps: true,

  dropBeacon: (opts) => {
    const center = viewCenterWorld();
    const id = uid("bcn");
    const b: SpatialBeacon = {
      id,
      x: opts?.worldX ?? center.x,
      y: opts?.worldY ?? center.y,
      zoom: opts?.zoom ?? center.zoom,
      label: opts?.label ?? "Look at this",
      color: opts?.color ?? "#38bdf8",
      createdAt: Date.now(),
      fromName: opts?.fromName,
    };
    set((s) => ({
      beacons: [...s.beacons.slice(-23), b],
      activeBeaconId: b.id,
    }));
    if (opts?.jump !== false) {
      focusWorld(b.x, b.y, Math.min(2.5, Math.max(0.2, b.zoom)));
    }
    useStudio.getState().setStatus(`Beacon · ${b.label}`);
    return id;
  },

  jumpToBeacon: (id) => {
    const b = get().beacons.find((x) => x.id === id);
    if (!b) return;
    focusWorld(b.x, b.y, b.zoom);
    set({ activeBeaconId: id });
    useStudio.getState().setStatus(`Jumped to · ${b.label}`);
  },

  removeBeacon: (id) =>
    set((s) => ({
      beacons: s.beacons.filter((b) => b.id !== id),
      activeBeaconId: s.activeBeaconId === id ? null : s.activeBeaconId,
    })),

  clearBeacons: () => set({ beacons: [], activeBeaconId: null }),

  cycleBeacons: () => {
    const { beacons, activeBeaconId } = get();
    if (!beacons.length) return;
    const i = beacons.findIndex((b) => b.id === activeBeaconId);
    const next = beacons[(i + 1) % beacons.length]!;
    get().jumpToBeacon(next.id);
  },

  startFirstNight: () => {
    set({ firstNightOn: true, firstNightIndex: 0 });
    get().goFirstNightStep(0);
  },

  goFirstNightStep: (i) => {
    const steps = FIRST_NIGHT_STEPS;
    const idx = Math.max(0, Math.min(steps.length - 1, i));
    const step = steps[idx]!;
    set({ firstNightOn: true, firstNightIndex: idx });
    // seed beacon for step
    const existing = get().beacons.find((b) => b.stepId === step.id);
    if (!existing) {
      const id = uid("bcn");
      const b: SpatialBeacon = {
        id,
        x: step.x,
        y: step.y,
        zoom: step.zoom,
        label: step.beacon,
        color: "#e8a838",
        createdAt: Date.now(),
        stepId: step.id,
      };
      set((s) => ({ beacons: [...s.beacons, b], activeBeaconId: id }));
    } else {
      set({ activeBeaconId: existing.id });
    }
    focusWorld(step.x, step.y, step.zoom);
    useStudio.getState().setStatus(`First Night · ${step.title}`);
  },

  nextFirstNight: () => {
    const i = get().firstNightIndex;
    if (i >= FIRST_NIGHT_STEPS.length - 1) {
      // last step — offer engine
      const step = FIRST_NIGHT_STEPS[i]!;
      if (step.action === "open_engine") {
        useStudio.getState().setAppMode("engine");
      }
      return;
    }
    get().goFirstNightStep(i + 1);
  },

  prevFirstNight: () => {
    get().goFirstNightStep(get().firstNightIndex - 1);
  },

  stopFirstNight: () => set({ firstNightOn: false }),

  setSoftPad: (softPad) => set({ softPad }),
  setShowScopeOverlaps: (showScopeOverlaps) => set({ showScopeOverlaps }),
}));

export function currentFirstNightStep(): FirstNightStep | null {
  const s = useSpatialNav.getState();
  if (!s.firstNightOn) return null;
  return FIRST_NIGHT_STEPS[s.firstNightIndex] ?? null;
}
