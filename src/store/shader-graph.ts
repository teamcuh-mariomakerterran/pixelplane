/**
 * Shader Graph lab — nodes + live WebGL preview on the plane.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { stampTimeline } from "@/store/timeline";
import {
  defaultGraph,
  applyPresetToGraph,
  migrateGraph,
  type ShaderGraph,
  type ShaderPresetId,
} from "@/lib/shaders/graph";

type ShaderState = {
  graphs: ShaderGraph[];
  activeId: string | null;
  activeNodeId: string | null;
  showOnPlane: boolean;
  enginePost: boolean;

  setShowOnPlane: (v: boolean) => void;
  setEnginePost: (v: boolean) => void;
  select: (id: string | null, nodeId?: string | null) => void;
  seedLab: (frameCamera?: boolean) => void;
  applyPreset: (graphId: string, preset: ShaderPresetId) => void;
  cycleSource: (graphId: string) => void;
  migrateAll: () => void;
  toggleNode: (graphId: string, nodeId: string) => void;
  setAmount: (graphId: string, nodeId: string, amount: number) => void;
  setPlaying: (graphId: string, playing: boolean) => void;
  moveGraph: (id: string, x: number, y: number) => void;
  moveNode: (graphId: string, nodeId: string, x: number, y: number) => void;
  removeGraph: (id: string) => void;
};

function labOrigin(): { x: number; y: number } {
  const s = useStudio.getState();
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  for (const b of s.artboards) boxes.push({ x: b.x, y: b.y, w: b.width, h: b.height });
  for (const z of s.wireZones) {
    if (z.category === "scenes" && /open/i.test(z.name || "")) continue;
    boxes.push({ x: z.x, y: z.y, w: z.w, h: z.h });
  }
  for (const p of s.parallaxStacks) boxes.push({ x: p.x, y: p.y, w: p.viewW, h: p.viewH });
  for (const p of s.particles) boxes.push({ x: p.x, y: p.y, w: p.w, h: p.h });

  const needW = 500;
  const needH = 420;
  const overlaps = (x: number, y: number) => {
    const x2 = x + needW;
    const y2 = y + needH;
    for (const b of boxes) {
      if (x < b.x + b.w && x2 > b.x && y < b.y + b.h && y2 > b.y) return true;
    }
    return false;
  };

  const candidates = [
    { x: 2280, y: 1100 },
    { x: 2280, y: 1480 },
    { x: 2100, y: 1680 },
    { x: 40, y: 1680 },
    { x: 1900, y: 1680 },
  ];
  const open = s.wireZones.find(
    (z) => z.category === "scenes" || /open build/i.test(z.name || ""),
  );
  if (open) {
    candidates.unshift(
      { x: open.x + open.w * 0.5, y: open.y + open.h * 0.55 },
      { x: open.x + 40, y: open.y + open.h * 0.62 },
    );
  }
  for (const c of candidates) {
    if (!overlaps(c.x, c.y)) return { x: Math.round(c.x), y: Math.round(c.y) };
  }
  let maxX = 2000;
  for (const b of boxes) maxX = Math.max(maxX, b.x + b.w);
  return { x: Math.round(maxX + 80), y: 1100 };
}

export const useShaderGraph = create<ShaderState>((set, get) => ({
  graphs: [],
  activeId: null,
  activeNodeId: null,
  showOnPlane: true,
  enginePost: false,

  setShowOnPlane: (showOnPlane) => set({ showOnPlane }),
  setEnginePost: (enginePost) => {
    set({ enginePost });
    useStudio
      .getState()
      .setStatus(enginePost ? "City Engine · CRT grade armed" : "City Engine · CRT grade off");
  },

  select: (activeId, nodeId) =>
    set({ activeId, activeNodeId: nodeId === undefined ? get().activeNodeId : nodeId }),

  seedLab: (frameCamera = true) => {
    const home = labOrigin();
    const g = defaultGraph(home.x, home.y);
    g.id = uid("sg");
    set({ graphs: [g], activeId: g.id, activeNodeId: null, showOnPlane: true });
    const studio = useStudio.getState();
    if (frameCamera) {
      const zoom = 0.62;
      const vw = typeof window !== "undefined" ? Math.max(640, window.innerWidth - 360) : 900;
      const vh = typeof window !== "undefined" ? Math.max(400, window.innerHeight - 140) : 700;
      const cx = home.x + 230;
      const cy = home.y + 180;
      studio.setCamera({
        zoom,
        x: vw / 2 - cx * zoom,
        y: vh / 2 - cy * zoom,
      });
    }
    stampTimeline("Shader lab", g.name);
    studio.setStatus(`Shader lab · ${g.name} @ ${home.x},${home.y} · try VHS / Acid / Thermal`);

    const names = new Set(studio.particles.map((p) => p.name));
    const kinds: Array<{ kind: string; color: string; name: string }> = [
      { kind: "spark", color: "#fb923c", name: "Spark jet" },
      { kind: "smoke", color: "#94a3b8", name: "Smoke column" },
      { kind: "magic", color: "#c084fc", name: "Magic swirl" },
      { kind: "dust", color: "#d6b07c", name: "Dust settle" },
      { kind: "slash", color: "#3ecfcf", name: "Slash arc" },
    ];
    const add = kinds
      .filter((k) => !names.has(k.name))
      .map((k, i) => ({
        id: uid("fx"),
        name: k.name,
        x: home.x + i * 76,
        y: home.y - 80,
        w: 60,
        h: 60,
        kind: k.kind,
        rate: 16,
        life: 1.05,
        color: k.color,
        playing: true,
      }));
    if (add.length) {
      useStudio.setState({ particles: [...studio.particles, ...add] });
    }
  },

  applyPreset: (graphId, preset) => {
    set((st) => ({
      graphs: st.graphs.map((g) =>
        g.id === graphId ? applyPresetToGraph(g, preset) : g,
      ),
      activeId: graphId,
    }));
    const pName = applyPresetToGraph(defaultGraph(), preset).name;
    useStudio.getState().setStatus(`Look · ${pName}`);
    stampTimeline("Shader look", preset);
  },

  cycleSource: (graphId) =>
    set((st) => ({
      graphs: st.graphs.map((g) =>
        g.id !== graphId
          ? g
          : { ...g, source: g.source === "nearest" ? "card" : "nearest" },
      ),
    })),

  migrateAll: () =>
    set((st) => ({
      graphs: st.graphs.map(migrateGraph),
    })),

  toggleNode: (graphId, nodeId) =>
    set((st) => ({
      graphs: st.graphs.map((g) =>
        g.id !== graphId
          ? g
          : {
              ...g,
              nodes: g.nodes.map((n) =>
                n.id === nodeId ? { ...n, enabled: !n.enabled } : n,
              ),
            },
      ),
      activeId: graphId,
      activeNodeId: nodeId,
    })),

  setAmount: (graphId, nodeId, amount) =>
    set((st) => ({
      graphs: st.graphs.map((g) =>
        g.id !== graphId
          ? g
          : {
              ...g,
              nodes: g.nodes.map((n) =>
                n.id === nodeId ? { ...n, amount: Math.max(0, Math.min(1, amount)) } : n,
              ),
            },
      ),
    })),

  setPlaying: (graphId, playing) =>
    set((st) => ({
      graphs: st.graphs.map((g) => (g.id === graphId ? { ...g, playing } : g)),
    })),

  moveGraph: (id, x, y) =>
    set((st) => ({
      graphs: st.graphs.map((g) => {
        if (g.id !== id) return g;
        const dx = x - g.x;
        const dy = y - g.y;
        return {
          ...g,
          x,
          y,
          nodes: g.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })),
        };
      }),
    })),

  moveNode: (graphId, nodeId, x, y) =>
    set((st) => ({
      graphs: st.graphs.map((g) =>
        g.id !== graphId
          ? g
          : {
              ...g,
              nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
            },
      ),
    })),

  removeGraph: (id) =>
    set((st) => ({
      graphs: st.graphs.filter((g) => g.id !== id),
      activeId: st.activeId === id ? null : st.activeId,
    })),
}));

export type { ShaderGraph };
