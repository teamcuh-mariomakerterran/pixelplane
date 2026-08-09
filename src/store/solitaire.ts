import { create } from "zustand";
import { uid } from "@/lib/utils";
import {
  drawFromStock,
  newGame,
  tryAutoFoundation,
  tryMove,
  undo,
  type MoveDest,
  type MoveSource,
} from "@/lib/solitaire/engine";
import { buildSolitaireTemplateArtboards, defaultSkin } from "@/lib/solitaire/template";
import type { SolitaireInstance, SolitaireSkin } from "@/lib/solitaire/types";
import { useStudio } from "./studio";

type SolitaireStore = {
  instances: SolitaireInstance[];
  activeId: string | null;
  /** drag payload while moving a card */
  drag: null | {
    instanceId: string;
    source: MoveSource;
    cardIds: string[];
    grabX: number;
    grabY: number;
  };

  placeSolitaire: (x: number, y: number, withTemplate?: boolean) => string;
  select: (id: string | null) => void;
  moveInstance: (id: string, x: number, y: number) => void;
  remove: (id: string) => void;
  setMinimized: (id: string, v: boolean) => void;
  newDeal: (id: string, drawCount?: 1 | 3) => void;
  setDrawCount: (id: string, n: 1 | 3) => void;
  draw: (id: string) => void;
  move: (id: string, src: MoveSource, dest: MoveDest) => void;
  autoFoundation: (id: string, src: MoveSource) => void;
  undoMove: (id: string) => void;
  setDrag: (d: SolitaireStore["drag"]) => void;
  placeTemplateNear: (id: string) => void;
  rebindSkinFromTemplate: (id: string) => void;
  bindSlotFromActiveArtboard: (instanceId: string, slotKey: string) => void;
};

function updateGame(
  instances: SolitaireInstance[],
  id: string,
  fn: (g: SolitaireInstance["game"]) => SolitaireInstance["game"],
): SolitaireInstance[] {
  return instances.map((inst) =>
    inst.id === id ? { ...inst, game: fn(inst.game) } : inst,
  );
}

export const useSolitaire = create<SolitaireStore>((set, get) => ({
  instances: [],
  activeId: null,
  drag: null,

  placeSolitaire: (x, y, withTemplate = true) => {
    const id = uid("sol");
    let skin = defaultSkin();
    if (withTemplate) {
      const studio = useStudio.getState();
      const { boards, skin: sk } = buildSolitaireTemplateArtboards(x + 520, y);
      skin = sk;
      studio.pushHistory();
      useStudio.setState({
        artboards: [...studio.artboards, ...boards],
        status: `Solitaire + skin template (${boards.length} artboards) — edit cards on the plane`,
      });
    }
    const inst: SolitaireInstance = {
      id,
      name: `Solitaire ${get().instances.length + 1}`,
      x,
      y,
      scale: 1.15,
      game: newGame(1),
      skin,
      minimized: false,
      templatePlaced: withTemplate,
    };
    set((s) => ({
      instances: [...s.instances, inst],
      activeId: id,
    }));
    useStudio.getState().setStatus(
      withTemplate
        ? "Solitaire dropped — play on the board; skin template is on the plane to the right"
        : "Solitaire dropped — using default pixel deck",
    );
    return id;
  },

  select: (id) => set({ activeId: id }),
  moveInstance: (id, x, y) =>
    set((s) => ({
      instances: s.instances.map((i) => (i.id === id ? { ...i, x, y } : i)),
    })),
  remove: (id) =>
    set((s) => ({
      instances: s.instances.filter((i) => i.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    })),
  setMinimized: (id, v) =>
    set((s) => ({
      instances: s.instances.map((i) => (i.id === id ? { ...i, minimized: v } : i)),
    })),
  newDeal: (id, drawCount) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id
          ? {
              ...i,
              game: newGame(drawCount ?? i.game.drawCount),
            }
          : i,
      ),
    })),
  setDrawCount: (id, n) =>
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id
          ? { ...i, game: { ...i.game, drawCount: n } }
          : i,
      ),
    })),
  draw: (id) =>
    set((s) => ({
      instances: updateGame(s.instances, id, (g) => drawFromStock(g)),
    })),
  move: (id, src, dest) =>
    set((s) => ({
      instances: updateGame(s.instances, id, (g) => tryMove(g, src, dest)),
    })),
  autoFoundation: (id, src) =>
    set((s) => ({
      instances: updateGame(s.instances, id, (g) => tryAutoFoundation(g, src)),
    })),
  undoMove: (id) =>
    set((s) => ({
      instances: updateGame(s.instances, id, (g) => undo(g)),
    })),
  setDrag: (drag) => set({ drag }),

  placeTemplateNear: (id) => {
    const inst = get().instances.find((i) => i.id === id);
    if (!inst) return;
    const studio = useStudio.getState();
    const { boards, skin } = buildSolitaireTemplateArtboards(inst.x + 520, inst.y);
    studio.pushHistory();
    useStudio.setState({
      artboards: [...studio.artboards, ...boards],
      status: `Solitaire skin template placed (${boards.length} boards)`,
    });
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, skin, templatePlaced: true } : i,
      ),
    }));
  },

  rebindSkinFromTemplate: (id) => {
    const inst = get().instances.find((i) => i.id === id);
    if (!inst) return;
    const boards = useStudio.getState().artboards;
    const slots: SolitaireSkin["slots"] = { ...inst.skin.slots };
    // re-find by name prefix Solitaire ·
    for (const b of boards) {
      const m = /^Solitaire · (.+)$/.exec(b.name);
      if (!m) continue;
      const label = m[1];
      if (label === "Table / felt") slots.table = b.id;
      else if (label === "Card back") slots.card_back = b.id;
      else if (label === "Empty foundation") slots.empty_foundation = b.id;
      else if (label === "Empty tableau") slots.empty_tableau = b.id;
      else if (/^(hearts|diamonds|clubs|spades)_\d+$/.test(label)) {
        slots[label as keyof typeof slots] = b.id;
      }
    }
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === id ? { ...i, skin: { ...i.skin, slots } } : i,
      ),
    }));
    useStudio.getState().setStatus("Solitaire skin re-bound from template artboards");
  },

  bindSlotFromActiveArtboard: (instanceId, slotKey) => {
    const board = useStudio.getState().getActiveArtboard();
    if (!board) {
      useStudio.getState().setStatus("Select an artboard first, then bind to solitaire slot");
      return;
    }
    set((s) => ({
      instances: s.instances.map((i) =>
        i.id === instanceId
          ? {
              ...i,
              skin: {
                ...i.skin,
                slots: { ...i.skin.slots, [slotKey]: board.id },
              },
            }
          : i,
      ),
    }));
    useStudio
      .getState()
      .setStatus(`Bound “${board.name}” → solitaire slot ${slotKey}`);
  },
}));
