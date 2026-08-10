import { create } from "zustand";
import { uid } from "@/lib/utils";
import {
  type Binding,
  type HotkeyAction,
  type KeyChord,
  actionLabel,
  bindingLabel,
  chordKey,
  defaultBindings,
  formatChord,
  FEATURE_TIPS,
} from "@/lib/hotkeys/defaults";
import {
  captureCanvasGhostThumb,
  worldCenterFromCamera,
} from "@/lib/spatial/wave-a";

export type CameraBookmark = {
  slot: number;
  x: number;
  y: number;
  zoom: number;
  label?: string;
  /** world center of view when saved */
  worldX?: number;
  worldY?: number;
  /** session ghost thumbnail (jpeg data URL) */
  thumbDataUrl?: string | null;
  savedAt?: number;
};

export type CanvasOverlay =
  | {
      id: string;
      kind: "tip";
      x: number;
      y: number;
      space: "screen" | "world";
      title: string;
      body: string;
      creative?: string;
      featureId?: string;
      createdAt: number;
      ttl: number;
      anim?: import("@/lib/ui/overlay-anim").OverlayAnim;
    }
  | {
      id: string;
      kind: "dialog";
      x: number;
      y: number;
      space: "screen";
      title: string;
      body: string;
      conflict?: {
        chord: KeyChord;
        incoming: Binding;
        existing: Binding;
        phase: "confirm" | "reassign_old";
      };
      createdAt: number;
      anim?: import("@/lib/ui/overlay-anim").OverlayAnim;
    }
  | {
      id: string;
      kind: "toast";
      x: number;
      y: number;
      space: "screen";
      title: string;
      body: string;
      createdAt: number;
      ttl: number;
      anim?: import("@/lib/ui/overlay-anim").OverlayAnim;
    }
  | {
      id: string;
      kind: "collab";
      x: number;
      y: number;
      space: "screen";
      title: string;
      body: string;
      createdAt: number;
      ttl: number;
      anim?: import("@/lib/ui/overlay-anim").OverlayAnim;
      color?: string;
    };

type HotkeyState = {
  bindings: Binding[];
  bookmarks: Record<number, CameraBookmark | null>;
  seenTips: Record<string, boolean>;
  overlays: CanvasOverlay[];
  rebindMode: null | {
    bindingId: string;
    afterConflictOverlayId?: string;
  };

  getBindingMap: () => Map<string, Binding>;
  findByChord: (c: KeyChord) => Binding | undefined;
  saveBookmark: (slot: number, cam: { x: number; y: number; zoom: number }) => void;
  jumpBookmark: (slot: number) => CameraBookmark | null;
  pushTip: (featureId: string, screen: { x: number; y: number }, force?: boolean) => void;
  pushToast: (title: string, body: string, screen: { x: number; y: number }) => void;
  pushOverlayMessage: (opts: {
    title: string;
    body: string;
    x: number;
    y: number;
    anim?: import("@/lib/ui/overlay-anim").OverlayAnim;
    kind?: "toast" | "collab";
    color?: string;
    ttl?: number;
  }) => void;
  pushConflictDialog: (opts: {
    chord: KeyChord;
    incoming: Binding;
    existing: Binding;
    screen: { x: number; y: number };
  }) => string;
  resolveConflictReplace: (overlayId: string) => void;
  resolveConflictCancel: (overlayId: string) => void;
  completeReassign: (overlayId: string, newChord: KeyChord) => void;
  dismissOverlay: (id: string) => void;
  pruneExpired: () => void;
  tryAssignChord: (
    bindingId: string,
    chord: KeyChord,
    screen: { x: number; y: number },
  ) => "ok" | "conflict" | "same";
  setRebindMode: (v: HotkeyState["rebindMode"]) => void;
  resetBindings: () => void;
  importSeenTips: (seen: Record<string, boolean>) => void;
};

const LS_BINDINGS = "pixelplane_hotkeys_v1";
const LS_TIPS = "pixelplane_tips_v1";
const LS_BOOKMARKS = "pixelplane_bookmarks_v1";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function persistBindings(b: Binding[]) {
  try {
    localStorage.setItem(LS_BINDINGS, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}
function persistTips(t: Record<string, boolean>) {
  try {
    localStorage.setItem(LS_TIPS, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}
function persistBookmarks(b: Record<number, CameraBookmark | null>) {
  try {
    // strip huge thumbs if storage fails later — try full first
    localStorage.setItem(LS_BOOKMARKS, JSON.stringify(b));
  } catch {
    try {
      const slim: Record<number, CameraBookmark | null> = {};
      for (const [k, v] of Object.entries(b)) {
        if (!v) {
          slim[Number(k)] = null;
          continue;
        }
        const { thumbDataUrl: _, ...rest } = v;
        slim[Number(k)] = rest;
      }
      localStorage.setItem(LS_BOOKMARKS, JSON.stringify(slim));
    } catch {
      /* ignore */
    }
  }
}

function initialBookmarks(): Record<number, CameraBookmark | null> {
  const empty: Record<number, CameraBookmark | null> = {};
  for (let i = 1; i <= 12; i++) empty[i] = null;
  return { ...empty, ...loadJson(LS_BOOKMARKS, {}) };
}

export const useHotkeys = create<HotkeyState>((set, get) => ({
  bindings: loadJson(LS_BINDINGS, null) ?? defaultBindings(),
  bookmarks: initialBookmarks(),
  seenTips: loadJson(LS_TIPS, {}),
  overlays: [],
  rebindMode: null,

  getBindingMap: () => {
    const m = new Map<string, Binding>();
    for (const b of get().bindings) m.set(chordKey(b.chord), b);
    return m;
  },

  findByChord: (c) => get().getBindingMap().get(chordKey(c)),

  saveBookmark: (slot, cam) => {
    if (slot < 1 || slot > 12) return;
    const sw = typeof window !== "undefined" ? window.innerWidth : 800;
    const sh = typeof window !== "undefined" ? window.innerHeight : 600;
    const { wx, wy } = worldCenterFromCamera(cam, sw - 360, sh - 80);
    // Session ghost: capture plane thumb (async-safe sync grab)
    const thumb = captureCanvasGhostThumb(96, 64, 0.5);
    const bm: CameraBookmark = {
      slot,
      x: cam.x,
      y: cam.y,
      zoom: cam.zoom,
      worldX: wx,
      worldY: wy,
      thumbDataUrl: thumb,
      savedAt: Date.now(),
    };
    set((s) => {
      const bookmarks = { ...s.bookmarks, [slot]: bm };
      persistBookmarks(bookmarks);
      return { bookmarks };
    });
    get().pushToast(
      `Location ${slot} saved`,
      thumb
        ? `Ghost snapshot stored · F${slot} jumps here`
        : `Press F${slot} to jump · Ctrl+F${slot} to overwrite`,
      { x: 280, y: 72 },
    );
    get().pushTip("session_ghosts", { x: 280, y: 120 });
  },

  jumpBookmark: (slot) => {
    const bm = get().bookmarks[slot];
    if (!bm) {
      get().pushToast(
        `Location ${slot} empty`,
        `Ctrl+F${slot} saves your current camera here`,
        { x: 280, y: 72 },
      );
      return null;
    }
    if (bm.thumbDataUrl) {
      get().pushToast(`Ghost F${slot}`, "Session ghost recalled with location", {
        x: 24,
        y: 72,
      });
    }
    return bm;
  },

  pushTip: (featureId, screen, force = false) => {
    const tip = FEATURE_TIPS[featureId];
    if (!tip) return;
    if (!force && get().seenTips[featureId]) return;
    if (get().overlays.some((o) => o.kind === "tip" && o.featureId === featureId)) return;
    const seen = { ...get().seenTips, [featureId]: true };
    persistTips(seen);
    // Safe default: mid-plane, clear of left systems dock
    const x = screen.x < 240 ? 280 : screen.x;
    const y = screen.y < 60 ? 72 : screen.y;
    const overlay: CanvasOverlay = {
      id: uid("tip"),
      kind: "tip",
      x,
      y,
      space: "screen",
      title: tip.title,
      body: tip.body,
      creative: tip.creative,
      featureId,
      createdAt: Date.now(),
      ttl: 12000,
    };
    // Only one tip visible at a time — replace prior tip, keep toasts/dialogs
    set((s) => ({
      seenTips: seen,
      overlays: [...s.overlays.filter((o) => o.kind !== "tip"), overlay],
    }));
  },


  pushToast: (title, body, screen) => {
    const overlay: CanvasOverlay = {
      id: uid("toast"),
      kind: "toast",
      x: screen.x,
      y: screen.y,
      space: "screen",
      title,
      body,
      createdAt: Date.now(),
      ttl: 3200,
    };
    set((s) => ({ overlays: [...s.overlays, overlay] }));
  },

  pushOverlayMessage: ({ title, body, x, y, anim, kind = "toast", color, ttl }) => {
    const overlay: CanvasOverlay =
      kind === "collab"
        ? {
            id: uid("collab"),
            kind: "collab",
            x,
            y,
            space: "screen",
            title,
            body,
            createdAt: Date.now(),
            ttl: ttl ?? 5000,
            anim,
            color,
          }
        : {
            id: uid("toast"),
            kind: "toast",
            x,
            y,
            space: "screen",
            title,
            body,
            createdAt: Date.now(),
            ttl: ttl ?? 3200,
            anim,
          };
    set((s) => ({ overlays: [...s.overlays, overlay] }));
  },

  pushConflictDialog: ({ chord, incoming, existing, screen }) => {
    const id = uid("dlg");
    const overlay: CanvasOverlay = {
      id,
      kind: "dialog",
      x: screen.x,
      y: screen.y,
      space: "screen",
      title: "Hotkey conflict",
      body: `${formatChord(chord)} is bound to “${actionLabel(existing.action)}”. Replace with “${actionLabel(incoming.action)}”?`,
      conflict: {
        chord,
        incoming,
        existing,
        phase: "confirm",
      },
      createdAt: Date.now(),
    };
    set((s) => ({ overlays: [...s.overlays, overlay] }));
    return id;
  },

  resolveConflictReplace: (overlayId) => {
    const o = get().overlays.find((x) => x.id === overlayId);
    if (!o || o.kind !== "dialog" || !o.conflict) return;
    const { incoming, existing, chord } = o.conflict;
    set((s) => {
      const bindings = s.bindings.map((b) => {
        if (b.id === incoming.id) return { ...b, chord };
        if (b.id === existing.id) return { ...b, chord: { key: "", ctrl: false, alt: false, shift: false, meta: false } };
        return b;
      });
      persistBindings(bindings);
      return {
        bindings,
        overlays: s.overlays.map((ov) =>
          ov.id === overlayId && ov.kind === "dialog" && ov.conflict
            ? {
                ...ov,
                title: "Reassign old hotkey",
                body: `Pick a new chord for “${actionLabel(existing.action)}” (or Esc to leave unbound).`,
                conflict: { ...ov.conflict, phase: "reassign_old" as const },
              }
            : ov,
        ),
        rebindMode: { bindingId: existing.id, afterConflictOverlayId: overlayId },
      };
    });
  },

  resolveConflictCancel: (overlayId) => {
    set((s) => ({
      overlays: s.overlays.filter((o) => o.id !== overlayId),
      rebindMode: null,
    }));
  },

  completeReassign: (overlayId, newChord) => {
    const o = get().overlays.find((x) => x.id === overlayId);
    if (!o || o.kind !== "dialog" || !o.conflict) return;
    const existingId = o.conflict.existing.id;
    set((s) => {
      const bindings = s.bindings.map((b) =>
        b.id === existingId ? { ...b, chord: newChord } : b,
      );
      persistBindings(bindings);
      return {
        bindings,
        overlays: s.overlays.filter((ov) => ov.id !== overlayId),
        rebindMode: null,
      };
    });
    get().pushToast("Hotkey updated", bindingLabel(
      get().bindings.find((b) => b.id === existingId) ?? o.conflict.existing,
    ), { x: 280, y: 72 });
  },

  dismissOverlay: (id) => set((s) => ({ overlays: s.overlays.filter((o) => o.id !== id) })),

  pruneExpired: () => {
    const now = Date.now();
    set((s) => ({
      overlays: s.overlays.filter((o) => {
        if (o.kind === "dialog") return true;
        if (!("ttl" in o) || !o.ttl) return true;
        return now - o.createdAt < o.ttl;
      }),
    }));
  },

  tryAssignChord: (bindingId, chord, screen) => {
    const existing = get().findByChord(chord);
    const target = get().bindings.find((b) => b.id === bindingId);
    if (!target) return "same";
    if (existing && existing.id === bindingId) return "same";
    if (existing) {
      get().pushConflictDialog({
        chord,
        incoming: { ...target, chord },
        existing,
        screen,
      });
      return "conflict";
    }
    set((s) => {
      const bindings = s.bindings.map((b) =>
        b.id === bindingId ? { ...b, chord } : b,
      );
      persistBindings(bindings);
      return { bindings, rebindMode: null };
    });
    return "ok";
  },

  setRebindMode: (rebindMode) => set({ rebindMode }),

  resetBindings: () => {
    const bindings = defaultBindings();
    persistBindings(bindings);
    set({ bindings });
  },

  importSeenTips: (seen) => {
    persistTips(seen);
    set({ seenTips: seen });
  },
}));
