/**
 * Wave B signature systems: Reference Orbit · Diff Lantern · Mutation Rails.
 * Rails keep a parent→child link and re-bake when the base is painted.
 */

import { create } from "zustand";
import { useStudio } from "@/store/studio";
import { compositeLayers } from "@/lib/pixel/buffer";
import {
  applyOps,
  RAILS,
  CORE_RAIL_IDS,
  railById,
  diffMask,
  type RailOp,
} from "@/lib/pixel/mutation-rails";
import { uid } from "@/lib/utils";
import { stampTimeline } from "@/store/timeline";

export type OrbitPin = {
  boardId: string;
  label: string;
};

export type MutationLink = {
  id: string;
  parentId: string;
  childId: string;
  railId: string;
  name: string;
  ops: RailOp[];
  amount: number;
  live: boolean;
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
  orbitSpeed: number;

  diffEnabled: boolean;
  diffResult: DiffResult | null;
  diffBoardA: string | null;
  diffBoardB: string | null;

  nightHeroInEngine: boolean;

  links: MutationLink[];
  showRailsPanel: boolean;
  activeLinkId: string | null;

  setOrbitEnabled: (v: boolean) => void;
  pinActiveToOrbit: () => void;
  unpinOrbit: (boardId: string) => void;
  clearOrbit: () => void;

  setDiffEnabled: (v: boolean) => void;
  runDiffLantern: () => void;
  clearDiff: () => void;

  spawnMutationRails: (opts?: { full?: boolean }) => void;
  addRailToActive: (railId: string) => void;
  setLinkAmount: (linkId: string, amount: number) => void;
  setLinkLive: (linkId: string, live: boolean) => void;
  rebakeLink: (linkId: string) => void;
  rebakeParent: (parentId: string) => void;
  scheduleRebuke: (parentId: string) => void;
  unlink: (linkId: string, deleteBoard?: boolean) => void;
  pruneDead: () => void;
  setShowRailsPanel: (v: boolean) => void;
  selectLink: (id: string | null) => void;
  bakeNeonBloomOnActive: () => void;
  linksForBoard: (boardId: string | null) => MutationLink[];
  parentOf: (boardId: string | null) => string | null;

  setNightHeroInEngine: (v: boolean) => void;
};

const LS = "pixelplane_mutation_rails_v1";

function loadLinks(): MutationLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MutationLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLinks(links: MutationLink[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS, JSON.stringify(links));
  } catch {
    /* */
  }
}

function revSum(board: { layers: { rev: number }[] }) {
  return board.layers.reduce((a, l) => a + (l.rev || 0), 0);
}

function writeVariant(
  boardId: string,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  name: string,
) {
  useStudio.setState((s) => ({
    artboards: s.artboards.map((b) => {
      if (b.id !== boardId) return b;
      const prev = b.layers[0];
      const layer = {
        id: prev?.id ?? uid("layer"),
        name: "Rail",
        visible: true,
        locked: false,
        opacity: 1,
        data,
        rev: (prev?.rev ?? 0) + 1,
      };
      return {
        ...b,
        width: w,
        height: h,
        name,
        layers: [layer],
        activeLayerId: layer.id,
        kind: "variant" as const,
        sourceUrl: null,
      };
    }),
  }));
}

const rebakeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastParentRev = new Map<string, number>();

function resolveParentId(boardId: string | null, links: MutationLink[]) {
  if (!boardId) return null;
  const asChild = links.find((l) => l.childId === boardId);
  if (asChild) return asChild.parentId;
  return boardId;
}

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

  links: loadLinks(),
  showRailsPanel: false,
  activeLinkId: null,

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
    s.setStatus(`Diff lantern · ${mask.changed} px differ · ${a.name} ↔ ${b.name}`);
    stampTimeline("Diff lantern", `${mask.changed} Δ`);
  },

  clearDiff: () => set({ diffResult: null, diffEnabled: false }),

  linksForBoard: (boardId) => {
    if (!boardId) return [];
    const parent = resolveParentId(boardId, get().links) ?? boardId;
    return get().links.filter((l) => l.parentId === parent);
  },

  parentOf: (boardId) => resolveParentId(boardId, get().links),

  setShowRailsPanel: (showRailsPanel) => set({ showRailsPanel }),
  selectLink: (activeLinkId) => set({ activeLinkId, showRailsPanel: true }),

  spawnMutationRails: (opts) => {
    const s = useStudio.getState();
    const id = s.activeArtboardId;
    const board = s.artboards.find((b) => b.id === id);
    if (!board) {
      s.setStatus("Select a board for Mutation Rails");
      return;
    }
    const parentId = resolveParentId(board.id, get().links) ?? board.id;
    const parent = s.artboards.find((b) => b.id === parentId) ?? board;
    const existing = get().links.filter((l) => l.parentId === parentId);
    if (existing.length && !opts?.full) {
      get().rebakeParent(parentId);
      set({ showRailsPanel: true });
      s.setStatus(`Mutation rails · rebaked ${existing.length} from ${parent.name}`);
      return;
    }
    const wanted = opts?.full ? RAILS : RAILS.filter((r) => (CORE_RAIL_IDS as readonly string[]).includes(r.id));
    const have = new Set(existing.map((l) => l.railId));
    const toAdd = wanted.filter((r) => !have.has(r.id));
    if (!toAdd.length) {
      get().rebakeParent(parentId);
      set({ showRailsPanel: true });
      return;
    }
    s.pushHistory();
    const src = compositeLayers(parent.layers, parent.width, parent.height);
    lastParentRev.set(parentId, revSum(parent));
    const newLinks: MutationLink[] = [];
    const existingKids = existing
      .map((l) => s.artboards.find((b) => b.id === l.childId))
      .filter(Boolean);
    let cursorX =
      existingKids.length > 0
        ? Math.max(...existingKids.map((b) => b!.x + b!.width)) + 16
        : parent.x + parent.width + 24;
    for (const rail of toAdd) {
      const baked = applyOps(src, parent.width, parent.height, rail.ops, 1);
      const name = `${parent.name} · ${rail.name}`;
      const ox = cursorX;
      const oy = parent.y + 8;
      const childId = s.importImageToArtboard(baked.data, baked.w, baked.h, name, ox, oy);
      writeVariant(childId, baked.data, baked.w, baked.h, name);
      cursorX += baked.w + 16;
      newLinks.push({
        id: uid("rail"),
        parentId,
        childId,
        railId: rail.id,
        name: rail.name,
        ops: rail.ops.map((o) => ({ ...o })),
        amount: 1,
        live: true,
      });
    }
    const links = [...get().links, ...newLinks];
    persistLinks(links);
    const pins = get().orbitPins.slice();
    for (const link of newLinks) {
      if (!pins.some((p) => p.boardId === link.childId)) {
        pins.push({ boardId: link.childId, label: link.name });
      }
    }
    set({
      links,
      orbitPins: pins.slice(-6),
      orbitEnabled: true,
      showRailsPanel: true,
      activeLinkId: newLinks[0]?.id ?? get().activeLinkId,
    });
    s.selectArtboard(parentId);
    s.setStatus(`Mutation rails · ${newLinks.length} live variants from ${parent.name}`);
    stampTimeline("Mutation rails", `${parent.name} · ${newLinks.map((l) => l.name).join(", ")}`);
  },

  addRailToActive: (railId) => {
    const s = useStudio.getState();
    const board = s.artboards.find((b) => b.id === s.activeArtboardId);
    if (!board) {
      s.setStatus("Select a board to add a rail");
      return;
    }
    const rail = railById(railId);
    if (!rail) return;
    const parentId = resolveParentId(board.id, get().links) ?? board.id;
    if (get().links.some((l) => l.parentId === parentId && l.railId === railId)) {
      s.setStatus(`${rail.name} already on this base`);
      return;
    }
    const parent = s.artboards.find((b) => b.id === parentId) ?? board;
    s.pushHistory();
    const src = compositeLayers(parent.layers, parent.width, parent.height);
    lastParentRev.set(parentId, revSum(parent));
    const baked = applyOps(src, parent.width, parent.height, rail.ops, 1);
    const sibs = get()
      .links.filter((l) => l.parentId === parentId)
      .map((l) => s.artboards.find((b) => b.id === l.childId))
      .filter(Boolean);
    const name = `${parent.name} · ${rail.name}`;
    const ox =
      sibs.length > 0
        ? Math.max(...sibs.map((b) => b!.x + b!.width)) + 16
        : parent.x + parent.width + 24;
    const childId = s.importImageToArtboard(baked.data, baked.w, baked.h, name, ox, parent.y + 8);
    writeVariant(childId, baked.data, baked.w, baked.h, name);
    const link: MutationLink = {
      id: uid("rail"),
      parentId,
      childId,
      railId: rail.id,
      name: rail.name,
      ops: rail.ops.map((o) => ({ ...o })),
      amount: 1,
      live: true,
    };
    const links = [...get().links, link];
    persistLinks(links);
    set({ links, showRailsPanel: true, activeLinkId: link.id });
    s.selectArtboard(parentId);
    s.setStatus(`Rail · ${rail.name} linked to ${parent.name}`);
  },

  setLinkAmount: (linkId, amount) => {
    const amt = Math.max(0, Math.min(1, amount));
    const links = get().links.map((l) => (l.id === linkId ? { ...l, amount: amt } : l));
    persistLinks(links);
    set({ links });
    get().rebakeLink(linkId);
  },

  setLinkLive: (linkId, live) => {
    const links = get().links.map((l) => (l.id === linkId ? { ...l, live } : l));
    persistLinks(links);
    set({ links });
  },

  rebakeLink: (linkId) => {
    const link = get().links.find((l) => l.id === linkId);
    if (!link) return;
    const s = useStudio.getState();
    const parent = s.artboards.find((b) => b.id === link.parentId);
    const child = s.artboards.find((b) => b.id === link.childId);
    if (!parent || !child) return;
    const src = compositeLayers(parent.layers, parent.width, parent.height);
    lastParentRev.set(parent.id, revSum(parent));
    const baked = applyOps(src, parent.width, parent.height, link.ops, link.amount);
    writeVariant(child.id, baked.data, baked.w, baked.h, `${parent.name} · ${link.name}`);
  },

  rebakeParent: (parentId) => {
    const live = get().links.filter((l) => l.parentId === parentId);
    for (const l of live) get().rebakeLink(l.id);
    if (live.length) {
      useStudio.getState().setStatus(`Rails rebaked · ${live.length} variants`);
    }
  },

  scheduleRebuke: (parentId) => {
    const prev = rebakeTimers.get(parentId);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      rebakeTimers.delete(parentId);
      const live = get().links.filter((l) => l.parentId === parentId && l.live);
      if (!live.length) return;
      get().rebakeParent(parentId);
    }, 140);
    rebakeTimers.set(parentId, t);
  },

  unlink: (linkId, deleteBoard) => {
    const link = get().links.find((l) => l.id === linkId);
    const links = get().links.filter((l) => l.id !== linkId);
    persistLinks(links);
    set({
      links,
      activeLinkId: get().activeLinkId === linkId ? null : get().activeLinkId,
    });
    if (deleteBoard && link) {
      useStudio.getState().deleteArtboard(link.childId);
    }
    useStudio.getState().setStatus("Rail unlinked");
  },

  pruneDead: () => {
    const ids = new Set(useStudio.getState().artboards.map((b) => b.id));
    const links = get().links.filter((l) => ids.has(l.parentId) && ids.has(l.childId));
    if (links.length !== get().links.length) {
      persistLinks(links);
      set({ links });
    }
  },

  bakeNeonBloomOnActive: () => {
    const s = useStudio.getState();
    const board = s.artboards.find((b) => b.id === s.activeArtboardId);
    if (!board) {
      s.setStatus("Select a board to bake neon bloom");
      return;
    }
    get().addRailToActive("bloom");
    s.setStatus(`Neon bloom · live rail on ${board.name}`);
    stampTimeline("Neon bloom bake", board.name);
  },

  setNightHeroInEngine: (nightHeroInEngine) => set({ nightHeroInEngine }),
}));

function bindLiveRebuke() {
  if (typeof window === "undefined") return;
  let seeded = false;
  useStudio.subscribe((s) => {
    const links = useSignature.getState().links;
    if (!links.length) return;
    if (!seeded) {
      for (const l of links) {
        const b = s.artboards.find((x) => x.id === l.parentId);
        if (b) lastParentRev.set(l.parentId, revSum(b));
      }
      seeded = true;
      return;
    }
    const parents = new Set(links.filter((l) => l.live).map((l) => l.parentId));
    for (const id of parents) {
      const b = s.artboards.find((x) => x.id === id);
      if (!b) continue;
      const r = revSum(b);
      if (lastParentRev.get(id) !== r) {
        lastParentRev.set(id, r);
        useSignature.getState().scheduleRebuke(id);
      }
    }
  });
}
bindLiveRebuke();
