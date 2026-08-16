/**
 * Craft Lab — boil preview, tile kit drop, sprite QA overlay.
 */

import { create } from "zustand";
import { useStudio } from "@/store/studio";
import { compositeLayers } from "@/lib/pixel/buffer";
import { DEFAULT_BOIL, type BoilPattern, type BoilProfile } from "@/lib/pixel/boil";
import { generateTileKit, TILE_VARIANT_META } from "@/lib/pixel/tile-kit";
import { analyzeSprite, type QaReport } from "@/lib/pixel/sprite-qa";
import { stampTimeline } from "@/store/timeline";
import { playJuiceSfx, unlockAudio } from "@/lib/audio/juice";
import { generateProcVfx, defaultProcSpec, defaultLayers, type ProcKind, type ProcVfxSpec, type ProcLayerId, type ProcLayer } from "@/lib/pixel/proc-vfx";

type CraftState = {
  showPanel: boolean;
  tab: "boil" | "tiles" | "qa" | "proc";

  boilOn: boolean;
  boil: BoilProfile;
  boilAll: boolean;
  boilBoardIds: string[] | null;

  qaOn: boolean;
  qaReport: QaReport | null;

  proc: ProcVfxSpec;
  procSmash: boolean;

  setShowPanel: (v: boolean) => void;
  setTab: (t: CraftState["tab"]) => void;
  setBoilOn: (v: boolean) => void;
  setBoilAll: (v: boolean) => void;
  patchBoil: (p: Partial<BoilProfile>) => void;
  setPattern: (p: BoilPattern) => void;

  spawnTileKit: () => void;
  spawnTileKitFrom: (boardId: string) => void;
  runQa: () => void;
  runQaOn: (boardId: string) => void;
  setQaOn: (v: boolean) => void;
  clearQa: () => void;

  patchProc: (p: Partial<ProcVfxSpec>) => void;
  patchProcLayer: (id: ProcLayerId, p: Partial<ProcLayer>) => void;
  setProcKind: (k: ProcKind) => void;
  rerollProc: () => void;
  bakeProc: () => void;
  setProcSmash: (v: boolean) => void;
};

export const useCraftLab = create<CraftState>((set, get) => ({
  showPanel: false,
  tab: "boil",

  boilOn: false,
  boil: { ...DEFAULT_BOIL, intensity: 6 },
  boilAll: true,
  boilBoardIds: null,

  qaOn: false,
  qaReport: null,

  proc: defaultProcSpec(),
  procSmash: true,

  setShowPanel: (showPanel) => set({ showPanel }),
  setTab: (tab) => set({ tab, showPanel: true }),
  setBoilOn: (boilOn) => {
    set({ boilOn, showPanel: true, tab: "boil" });
    try {
      unlockAudio();
      if (boilOn) playJuiceSfx("sizzle", 1.05);
    } catch {
      /* */
    }
    useStudio
      .getState()
      .setStatus(
        boilOn
          ? "Boil live · the sprite itself is moving (overlay, not baked)"
          : "Boil off",
      );
  },
  setBoilAll: (boilAll) => set({ boilAll }),
  patchBoil: (p) => set((s) => ({ boil: { ...s.boil, ...p } })),
  setPattern: (pattern) => {
    set((s) => ({ boil: { ...s.boil, pattern } }));
    try {
      playJuiceSfx("blip", 1.1);
    } catch {
      /* */
    }
  },

  spawnTileKit: () => {
    const id = useStudio.getState().activeArtboardId;
    if (id) get().spawnTileKitFrom(id);
    else useStudio.getState().setStatus("Select a tile board to grow a kit");
  },
  spawnTileKitFrom: (boardId) => {
    const s = useStudio.getState();
    const board = s.artboards.find((b) => b.id === boardId);
    if (!board) {
      s.setStatus("Select a tile board to grow a kit");
      return;
    }
    s.pushHistory();
    const src = compositeLayers(board.layers, board.width, board.height);
    const kit = generateTileKit(src, board.width, board.height);
    const gap = 10;
    const cell = Math.max(board.width, board.height) + gap;
    const ox = board.x + board.width + 28;
    const oy = board.y;
    const cols = 5;
    let i = 0;
    for (const v of kit) {
      if (v.kind === "base") continue;
      const meta = TILE_VARIANT_META[v.kind];
      const px = ox + (i % cols) * cell;
      const py = oy + Math.floor(i / cols) * cell;
      s.importImageToArtboard(v.data, v.w, v.h, `${board.name} · ${meta.name}`, px, py);
      i++;
    }
    const rows = Math.ceil(i / cols);
    const zw = cols * cell + 20;
    const zh = rows * cell + 36;
    const zoneId = s.createWireZone(ox - 16, oy - 24, zw, zh, "environments");
    if (zoneId) {
      s.renameWireZone(zoneId, `Tile kit · ${board.name}`);
      s.setZoneTrigger(zoneId, "tile_kit", true);
    }
    s.selectArtboard(board.id);
    s.setCamera({
      x: -board.x * 0.85 + 40,
      y: -board.y * 0.85 + 50,
      zoom: 0.85,
    });
    s.setStatus(`Tile kit · ${i} variants from ${board.name} · trigger armed`);
    stampTimeline("Tile kit", `${board.name} · ${i}`);
    set({ showPanel: true, tab: "tiles" });
  },

  runQa: () => {
    const id = useStudio.getState().activeArtboardId;
    if (id) get().runQaOn(id);
    else useStudio.getState().setStatus("Select a board to run sprite QA");
  },
  runQaOn: (boardId) => {
    const s = useStudio.getState();
    const board = s.artboards.find((b) => b.id === boardId);
    if (!board) {
      s.setStatus("Select a board to run sprite QA");
      return;
    }
    const src = compositeLayers(board.layers, board.width, board.height);
    const report = analyzeSprite(src, board.width, board.height, board.id, board.name);
    set({ qaReport: report, qaOn: true, showPanel: true, tab: "qa" });
    s.setStatus(
      `QA · ${board.name} · ${report.score} · ${report.counts.orphan} orphans · ${report.counts.bleed} bleed`,
    );
    stampTimeline("Sprite QA", `${board.name} · ${report.score}`);
  },

  setQaOn: (qaOn) => set({ qaOn }),
  clearQa: () => set({ qaOn: false, qaReport: null }),

  patchProc: (p) => set((s) => ({ proc: { ...s.proc, ...p, layers: p.layers ?? s.proc.layers } })),
  patchProcLayer: (id, p) =>
    set((s) => {
      const base = defaultLayers();
      const cur = s.proc.layers ?? base;
      return {
        proc: {
          ...s.proc,
          direction: s.proc.direction ?? 0,
          spread: s.proc.spread ?? 70,
          layers: { ...base, ...cur, [id]: { ...base[id], ...cur[id], ...p } },
        },
      };
    }),
  setProcKind: (kind) => {
    set((s) => ({ proc: { ...s.proc, kind }, showPanel: true, tab: "proc" }));
    try {
      playJuiceSfx("blip", 1.05);
    } catch {
      /* */
    }
  },
  rerollProc: () => {
    set((s) => ({
      proc: { ...s.proc, seed: (Math.random() * 1e9) | 0 },
      showPanel: true,
      tab: "proc",
    }));
  },
  bakeProc: () => {
    const spec = get().proc;
    const out = generateProcVfx(spec);
    const studio = useStudio.getState();
    const cam = studio.camera;
    const z = cam.zoom || 1;
    const x = (-cam.x + 120) / z;
    const y = (-cam.y + 80) / z;
    const id = studio.importImageToArtboard(
      out.sheet,
      out.sheetW,
      out.sheetH,
      `Proc · ${spec.kind} · ${spec.seed.toString(36)}`,
      Math.round(x),
      Math.round(y),
    );
    studio.selectArtboard(id);
    studio.setStatus(`Proc VFX · ${spec.kind} · ${spec.frames} frames baked`);
    stampTimeline("Proc VFX", spec.kind);
    try {
      playJuiceSfx("chord", 1.1);
    } catch {
      /* */
    }
    set({ showPanel: true, tab: "proc" });
  },
  setProcSmash: (procSmash) => set({ procSmash }),
}));
