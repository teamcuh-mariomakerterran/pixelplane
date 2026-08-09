/**
 * Zustand bridge for Memory Web + Live Asset Sockets.
 */

import { create } from "zustand";
import {
  createEmptyWeb,
  createAgent,
  createFaction,
  addAgent,
  addFaction,
  assignToFaction,
  groupFromSelection,
  groupFromPlaneCluster,
  remember,
  memoriesOf,
  dialogueHook,
  seedDemoWeb,
  exportMemoryJson,
} from "@/lib/memory-web/web";
import type { MemoryWebState, MemoryEventKind } from "@/lib/memory-web/types";
import {
  createSocket,
  pollSocketUpdates,
  suggestSocketsFromWires,
  type LiveSocket,
  type SocketPayload,
  type SocketKind,
} from "@/lib/engine/live-sockets";
import { compositeLayers } from "@/lib/pixel/buffer";
import { useStudio } from "@/store/studio";

type MemStore = {
  web: MemoryWebState;
  selectedAgentIds: string[];
  showPanel: boolean;
  sockets: LiveSocket[];
  lastPayloads: SocketPayload[];
  socketLog: string[];

  setShowPanel: (v: boolean) => void;
  resetDemo: () => void;
  selectAgent: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  spawnNpcOnPlane: (name: string, x: number, y: number) => void;
  groupSelection: (name?: string) => void;
  groupPlaneRect: (rect: { x: number; y: number; w: number; h: number }, name?: string) => void;
  makeFaction: (name: string) => void;
  assignSelectionToFaction: (factionId: string | null) => void;
  record: (opts: {
    ownerId?: string;
    kind: MemoryEventKind;
    summary: string;
    subjectId?: string;
    weight?: number;
    propagate?: "none" | "group" | "faction" | "both";
    x?: number;
    y?: number;
  }) => void;
  /** engine bridge: player smash near NPCs */
  engineSmashAt: (x: number, y: number, radius?: number) => void;
  exportJson: () => string;
  dialogueFor: (speakerId: string) => string | null;

  // live sockets
  rebuildSocketsFromWires: () => void;
  addSocket: (opts: {
    name: string;
    kind: SocketKind;
    engineKey: string;
    artboardId?: string;
    animId?: string;
  }) => void;
  removeSocket: (id: string) => void;
  pollSockets: () => SocketPayload[];
  bindActiveBoardToSocket: (engineKey: string, kind?: SocketKind) => void;
};

export const useMemoryWeb = create<MemStore>((set, get) => ({
  web: seedDemoWeb(),
  selectedAgentIds: [],
  showPanel: false,
  sockets: [],
  lastPayloads: [],
  socketLog: [],

  setShowPanel: (showPanel) => set({ showPanel }),
  resetDemo: () => set({ web: seedDemoWeb(), selectedAgentIds: [] }),
  selectAgent: (id, multi) =>
    set((s) => {
      if (!multi) return { selectedAgentIds: [id] };
      const has = s.selectedAgentIds.includes(id);
      return {
        selectedAgentIds: has
          ? s.selectedAgentIds.filter((x) => x !== id)
          : [...s.selectedAgentIds, id],
      };
    }),
  clearSelection: () => set({ selectedAgentIds: [] }),

  spawnNpcOnPlane: (name, x, y) => {
    const a = createAgent({
      name,
      kind: "npc",
      planeX: x,
      planeY: y,
      engineX: x * 0.4 + 400,
      engineY: y * 0.3 + 600,
    });
    set((s) => ({ web: addAgent(s.web, a) }));
    useStudio.getState().setStatus(`NPC “${name}” on plane · memory web`);
  },

  groupSelection: (name) => {
    const ids = get().selectedAgentIds;
    if (ids.length < 2) {
      useStudio.getState().setStatus("Select 2+ NPCs to group");
      return;
    }
    const { web, group } = groupFromSelection(get().web, ids, name);
    set({ web });
    useStudio.getState().setStatus(`Group “${group.name}” · ${group.memberIds.length} agents`);
  },

  groupPlaneRect: (rect, name) => {
    const { web, group } = groupFromPlaneCluster(get().web, rect, name);
    set({ web });
    useStudio.getState().setStatus(
      `Plane cluster “${group.name}” · ${group.memberIds.length} agents`,
    );
  },

  makeFaction: (name) => {
    const f = createFaction(name);
    set((s) => ({ web: addFaction(s.web, f) }));
    useStudio.getState().setStatus(`Faction “${name}”`);
  },

  assignSelectionToFaction: (factionId) => {
    let web = get().web;
    for (const id of get().selectedAgentIds) {
      web = assignToFaction(web, id, factionId);
    }
    set({ web });
  },

  record: (opts) => {
    const web = remember(get().web, {
      ownerId: opts.ownerId ?? get().web.playerId,
      kind: opts.kind,
      summary: opts.summary,
      subjectId: opts.subjectId,
      weight: opts.weight,
      propagate: opts.propagate ?? "none",
      x: opts.x,
      y: opts.y,
    });
    set({ web });
  },

  engineSmashAt: (x, y, radius = 120) => {
    let web = get().web;
    const playerId = web.playerId;
    for (const a of web.agents) {
      if (a.kind !== "npc" || a.engineX == null || a.engineY == null) continue;
      if (Math.hypot(a.engineX - x, a.engineY - y) > radius) continue;
      web = remember(web, {
        ownerId: a.id,
        kind: "smash_near",
        summary: "Watched them smash property nearby",
        subjectId: playerId,
        weight: 0.7,
        propagate: "both",
        x,
        y,
      });
    }
    set({ web });
  },

  exportJson: () => exportMemoryJson(get().web),
  dialogueFor: (speakerId) =>
    dialogueHook(get().web, speakerId, get().web.playerId),

  rebuildSocketsFromWires: () => {
    const st = useStudio.getState();
    const socks = suggestSocketsFromWires(
      st.wireZones.map((z) => ({
        id: z.id,
        name: z.name,
        category: z.category,
        folderPath: z.folderPath,
      })),
      st.artboards.map((b) => ({ id: b.id, name: b.name, x: b.x, y: b.y })),
    );
    set({ sockets: socks, socketLog: [`Rebuilt ${socks.length} sockets from feed planes`] });
    useStudio.getState().setStatus(`Live sockets · ${socks.length} bound`);
  },

  addSocket: (opts) => {
    const s = createSocket(opts);
    set((st) => ({ sockets: [...st.sockets, s] }));
  },

  removeSocket: (id) => set((s) => ({ sockets: s.sockets.filter((x) => x.id !== id) })),

  pollSockets: () => {
    const st = useStudio.getState();
    const { sockets, payloads } = pollSocketUpdates(get().sockets, {
      artboards: st.artboards.map((b) => ({
        id: b.id,
        name: b.name,
        width: b.width,
        height: b.height,
        layers: b.layers,
      })),
      anims: st.animRegions.map((a) => ({
        id: a.id,
        name: a.name,
        frameW: a.frameW,
        frameH: a.frameH,
        frames: a.frames,
      })),
      composite: (layers, w, h) =>
        compositeLayers(
          layers.map((L, i) => ({
            id: `L${i}`,
            name: "L",
            visible: L.visible,
            locked: false,
            opacity: L.opacity ?? 1,
            data: L.data,
            rev: L.rev,
          })),
          w,
          h,
        ),
    });
    if (payloads.length) {
      set((s) => ({
        sockets,
        lastPayloads: payloads,
        socketLog: [
          ...payloads.map((p) => `Hot · ${p.engineKey} rev ${p.rev}`),
          ...s.socketLog,
        ].slice(0, 40),
      }));
    } else {
      set({ sockets });
    }
    return payloads;
  },

  bindActiveBoardToSocket: (engineKey, kind = "sprite") => {
    const st = useStudio.getState();
    const id = st.activeArtboardId;
    if (!id) {
      useStudio.getState().setStatus("Select an artboard to bind socket");
      return;
    }
    const board = st.artboards.find((b) => b.id === id);
    const s = createSocket({
      name: board?.name ?? engineKey,
      kind,
      engineKey,
      artboardId: id,
    });
    set((st) => ({ sockets: [...st.sockets, s] }));
    useStudio.getState().setStatus(`Socket bound · ${engineKey}`);
  },
}));

// handy for engine
export function memoriesForAgent(agentId: string) {
  return memoriesOf(useMemoryWeb.getState().web, agentId, 12);
}
