// @ts-nocheck
import { create } from "zustand";
import { uid, clamp } from "@/lib/utils";
import {
  cloneBuffer, createBuffer, drawEllipse, drawLine, drawRectOutline,
  extractRegion, floodFill, hexToRgba, pasteRegion, stampBrush, compositeLayers,
  coercePixelData, isBufferHollow,
} from "@/lib/pixel/buffer";
import { removeBackground } from "@/lib/pixel/bg-remove";
import { generateCharacter, generateParticlePreview, sheetFromFrames } from "@/lib/pixel/generate";
import {
  bakeSecondaryLayer, defaultSecondary, type SecondaryKind,
  auditAnimation, formatAuditSummary, bakeCosmeticOnAnim, makeHatStamp, recolorStamp, defaultVariants,
} from "@/lib/anim-lab";
import { useHotkeys } from "@/store/hotkeys";
import {
  addChildFolder, createEngineProject, createEntityFolder, findFolderById,
  mapFolders, WIRE_CATEGORY_META,
} from "@/lib/engine/templates";
import { createStarterQuestTree, addQuestNode, connectQuestNodes, exportQuestTreeJson } from "@/lib/quests/tree";
import { createDestructibleProp, applyDamage, currentStage } from "@/lib/destructibles/presets";
import {
  scopeForQuest, scopeForZone, formatScopeSummary, suggestQuestDestructibleLinks,
} from "@/lib/spatial/scope";
import { buildEnginePackage, downloadBlob } from "@/lib/engine/export-project";
import { coerceEngineId } from "@/lib/pixel/types";
import {
  splitSheetBuffer,
  clipPrefixFromBoardName,
} from "@/lib/pixel/sheet-split";
import type {
  AnimRegion,
  Artboard,
  Camera,
  DestructibleProp,
  EngineId,
  EngineProject,
  Layer,
  ParallaxStack,
  ParticleSystem,
  PendingWireDrop,
  PixelMode,
  ProjectMeta,
  QuestNode,
  QuestNodeKind,
  QuestTree,
  SceneActor,
  Selection,
  ToolId,
  WireCategory,
  WireZone,
} from "@/lib/pixel/types";


export type StudioSnapshot = {
  meta?: ProjectMeta;
  camera?: Camera;
  artboards?: Artboard[];
  animRegions?: AnimRegion[];
  particles?: ParticleSystem[];
  actors?: SceneActor[];
  parallaxStacks?: ParallaxStack[];
  wireZones?: WireZone[];
  questTrees?: QuestTree[];
  destructibles?: DestructibleProp[];
  engineProject?: EngineProject | null;
  activeArtboardId?: string | null;
  activeAnimId?: string | null;
  activeParticleId?: string | null;
  activeParallaxId?: string | null;
  activeQuestTreeId?: string | null;
  activeDestructibleId?: string | null;
  activeWireZoneId?: string | null;
  selection?: Selection;
  [key: string]: unknown;
};

export type StudioState = {
  meta: ProjectMeta;
  camera: Camera;
  tool: ToolId;
  color: string;
  brushSize: number;
  fillShapes: boolean;
  artboards: Artboard[];
  activeArtboardId: string | null;
  animRegions: AnimRegion[];
  activeAnimId: string | null;
  particles: ParticleSystem[];
  activeParticleId: string | null;
  actors: SceneActor[];
  parallaxStacks: ParallaxStack[];
  activeParallaxId: string | null;
  selection: Selection;
  clipboard: { data: Uint8ClampedArray; w: number; h: number } | null;
  hoverPixel: { x: number; y: number; worldX: number; worldY: number; artboardId?: string | null } | null;
  dragPreview: unknown;
  spacePan: boolean;
  showGenerate: boolean;
  showHelp: boolean;
  showEngineConnect: boolean;
  showWirePalette: boolean;
  showStarterPack: boolean;
  showGuides: boolean;
  showIconLibrary: boolean;
  appMode: "studio" | "engine" | string;
  pendingWireDrop: PendingWireDrop;
  engineProject: EngineProject | null;
  wireZones: WireZone[];
  questTrees: QuestTree[];
  activeQuestTreeId: string | null;
  destructibles: DestructibleProp[];
  activeDestructibleId: string | null;
  activeWireZoneId: string | null;
  activeConnector: WireCategory | null;
  fpsTick: number;
  history: ReturnType<typeof snapOf>[];
  future: ReturnType<typeof snapOf>[];
  status: string;

  setTool: (t: ToolId) => void;
  setColor: (c: string) => void;
  setBrushSize: (n: number) => void;
  setFillShapes: (v: boolean) => void;
  setCamera: (c: Partial<Camera>) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, sx: number, sy: number) => void;
  setMeta: (m: Partial<ProjectMeta>) => void;
  setStatus: (status: string) => void;
  setSpacePan: (v: boolean) => void;
  setShowGenerate: (v: boolean) => void;
  setShowHelp: (v: boolean) => void;
  setShowEngineConnect: (v: boolean) => void;
  setShowWirePalette: (v: boolean) => void;
  setShowStarterPack: (v: boolean) => void;
  setShowGuides: (v: boolean) => void;
  setShowIconLibrary: (v: boolean) => void;
  setAppMode: (mode: string) => void;
  setHoverPixel: (p: StudioState["hoverPixel"]) => void;
  setDragPreview: (p: unknown) => void;
  setPendingWireDrop: (p: PendingWireDrop) => void;
  setActiveConnector: (c: WireCategory | null) => void;

  addQuestTree: (x: number, y: number, name?: string) => string;
  selectQuestTree: (id: string | null) => void;
  updateQuestTree: (id: string, patch: Partial<QuestTree>) => void;
  updateQuestNode: (treeId: string, nodeId: string, patch: Partial<QuestNode>) => void;
  addQuestTreeNode: (treeId: string, kind: QuestNodeKind, x?: number, y?: number) => void;
  connectQuestTreeNodes: (treeId: string, fromId: string, toId: string, label?: string) => void;
  deleteQuestTree: (id: string) => void;
  exportActiveQuestJson: () => string | null;
  applySpatialQuestLinks: (treeId?: string | null) => void;

  placeDestructible: (x: number, y: number, kind?: string) => string;
  selectDestructible: (id: string | null) => void;
  damageDestructible: (id: string, amount?: number) => void;
  deleteDestructible: (id: string) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  addArtboard: (partial?: Partial<Artboard> & { width?: number; height?: number }) => string;
  createIndoorScene: (opts?: { w?: number; h?: number; name?: string }) => string;
  selectArtboard: (id: string | null) => void;
  deleteArtboard: (id: string) => void;
  renameArtboard: (id: string, name: string) => void;
  moveArtboard: (id: string, x: number, y: number) => void;
  getActiveArtboard: () => Artboard | null;
  getActiveLayer: () => Layer | null;
  addLayer: (artboardId?: string | null) => void;
  deleteLayer: (layerId: string, artboardId?: string | null) => void;
  selectLayer: (layerId: string, artboardId?: string | null) => void;
  toggleLayerVisible: (layerId: string, artboardId?: string | null) => void;
  toggleLayerLocked: (layerId: string, artboardId?: string | null) => void;
  renameLayer: (layerId: string, name: string, artboardId?: string | null) => void;
  setLayerOpacity: (layerId: string, opacity: number, artboardId?: string | null) => void;
  duplicateLayer: (layerId: string, artboardId?: string | null) => void;
  mergeVisible: (artboardId?: string | null) => void;

  paintAt: (artboardId: string, x: number, y: number, erase?: boolean) => void;
  strokeLine: (artboardId: string, x0: number, y0: number, x1: number, y1: number, erase?: boolean) => void;
  fillAt: (artboardId: string, x: number, y: number) => void;
  sampleAt: (artboardId: string, x: number, y: number) => void;
  commitShape: (kind: "line" | "rect" | "ellipse", artboardId: string, x0: number, y0: number, x1: number, y1: number) => void;
  setSelection: (selection: Selection) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (artboardId: string, x: number, y: number) => void;
  clearSelectionPixels: () => void;

  createAnimRegion: (x: number, y: number, w: number, h: number) => string;
  selectAnim: (id: string | null) => void;
  deleteAnim: (id: string) => void;
  renameAnim: (id: string, name: string) => void;
  setAnimFps: (id: string, fps: number) => void;
  toggleAnimPlay: (id: string) => void;
  setAnimFrame: (id: string, index: number) => void;
  addAnimFrame: (id: string) => void;
  deleteAnimFrame: (id: string, frameIndex?: number) => void;
  captureAnimFrameFromArtboard: (animId: string, artboardId: string, x: number, y: number) => void;
  applySecondaryMotion: (animId: string, kind: SecondaryKind) => void;
  applyCosmeticSystem: (animId: string, anchor?: string) => void;
  auditAnim: (animId: string) => void;
  moveAnim: (id: string, x: number, y: number) => void;
  placeActorFromAnim: (animId: string, x: number, y: number) => string;
  moveActor: (id: string, x: number, y: number) => void;
  deleteActor: (id: string) => void;

  placeParallaxStack: (stack: any) => string;
  selectParallax: (id: string | null) => void;
  deleteParallax: (id: string) => void;
  moveParallax: (id: string, x: number, y: number) => void;
  setParallaxMode: (id: string, mode: string) => void;
  setParallaxViewSize: (id: string, viewW: number, viewH: number) => void;
  setParallaxLayerDepth: (stackId: string, layerId: string, depth: number) => void;
  setParallaxLayerScroll: (stackId: string, layerId: string, sx: number, sy: number) => void;
  toggleParallaxAutoPreview: (id: string) => void;
  wireParallaxStack: (stackId: string, folderId: string, folderPath: string) => void;
  tickAnimations: () => void;

  createParticle: (x: number, y: number, w: number, h: number) => string;
  selectParticle: (id: string | null) => void;
  deleteParticle: (id: string) => void;
  setParticleKind: (id: string, kind: string) => void;
  toggleParticlePlay: (id: string) => void;
  moveParticle: (id: string, x: number, y: number) => void;

  connectEngine: (opts: { name: string; engine: EngineId; rootFolderName?: string; defaultCharacterSize?: number }) => void;
  disconnectEngine: () => void;
  createWireZone: (x: number, y: number, w: number, h: number, category?: WireCategory) => string;
  selectWireZone: (id: string | null) => void;
  deleteWireZone: (id: string) => void;
  moveWireZone: (id: string, x: number, y: number) => void;
  renameWireZone: (id: string, name: string) => void;
  setZoneTrigger: (id: string, kind: string, armed?: boolean) => void;
  armZoneTrigger: (id: string, armed: boolean) => void;
  fireZoneTrigger: (id?: string | null) => void;
  fireArmedTriggers: (kind?: string) => number;
  beginWireConnect: (opts: any) => void;
  assignWireDestination: (opts: any) => void;
  addAssetFolder: (parentId: string, name: string, category?: WireCategory) => string | null;
  addEntityFolder: (parentId: string, name: string, category?: WireCategory, pixelSize?: number) => string | null;
  setCategoryPixelSize: (category: WireCategory, size: number) => void;
  setFolderPixelSize: (folderId: string, size: number) => void;
  exportEnginePackage: () => Promise<void>;

  importImageToArtboard: (data: Uint8ClampedArray, w: number, h: number, name?: string, x?: number, y?: number) => string;
  generateFromPrompt: (opts: any) => void;
  removeBgActive: () => void;
  exportActivePng: () => void;
  exportAnimSheet: () => void;
  sliceArtboardToAnim: (artboardId: string, frameW: number, frameH: number, opts?: any) => string | null;
  /** Per-row clips (walk-down / walk-left / …) + idle from standing frame. */
  splitArtboardToClips: (
    artboardId: string,
    opts?: {
      frameW?: number;
      frameH?: number;
      makeCharacter?: boolean;
      force?: boolean;
      punchBg?: boolean;
    },
  ) => string[];
  makeCharacterFromSheet: (artboardId: string) => string | null;
  ensureSheetCharacters: () => { split: number; detail: string };
  duplicateArtboard: (id: string) => string | null;
  applySnapshot: (snap: StudioSnapshot) => void;
  newProject: () => void;
  seedDemo: () => void | Promise<void>;
  /** Re-seed smashables + Street Heat quest if a v1 autosave dropped them */
  repairPlaneFoundations: () => { repaired: boolean; detail: string };
  focusSmashAlley: () => void;
  focusDemoHome: () => void;
  /** Wipe autosave + full factory demo (the real hard reset) */
  hardResetDemo: () => Promise<void>;
  /** Re-download starter-pack art for hollow/missing boards */
  rehydrateStarterArt: () => Promise<{ fixed: number; total: number }>;
};


const MAX_HISTORY = 30;
function emptyLayer(w: number, h: number, name = "Layer 1"): Layer {
  return {
    id: uid("layer"),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    data: createBuffer(w, h),
    rev: 0
  };
}
function emptyArtboard(w = 128, h = 128, x = 0, y = 0, name = "Artboard", kind: Artboard["kind"] = "sheet"): Artboard {
  const layer = emptyLayer(w, h, "Layer 1");
  return {
    id: uid("board"),
    name,
    x,
    y,
    width: w,
    height: h,
    layers: [layer],
    activeLayerId: layer.id,
    kind,
    sourceUrl: undefined,
  };
}
function snapOf(s: any) {
  return {
    artboards: s.artboards.map((b) => ({
      ...b,
      layers: b.layers.map((l) => ({
        ...l,
        data: cloneBuffer(l.data)
      }))
    })),
    animRegions: s.animRegions.map((a) => ({
      ...a,
      frames: a.frames.map((f) => ({
        ...f,
        data: cloneBuffer(f.data)
      }))
    })),
    particles: s.particles.map((p) => ({ ...p })),
    actors: s.actors.map((a) => ({ ...a })),
    wireZones: s.wireZones.map((z) => ({ ...z })),
    activeArtboardId: s.activeArtboardId
  };
}
function downloadPng(data: Uint8ClampedArray, w: number, h: number, filename: string) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
  c.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}
export const useStudio = create<StudioState>((set, get) => ({
  meta: {
    name: "Untitled Project",
    pixelMode: "16bit",
    gridSize: 16,
    showGrid: true
  },
  camera: {
    x: 80,
    y: 40,
    zoom: 0.45
  },
  tool: "brush",
  color: "#3ecfcf",
  brushSize: 1,
  fillShapes: false,
  artboards: [],
  activeArtboardId: null,
  animRegions: [],
  activeAnimId: null,
  particles: [],
  activeParticleId: null,
  actors: [],
  parallaxStacks: [],
  activeParallaxId: null,
  selection: null,
  clipboard: null,
  hoverPixel: null,
  dragPreview: null,
  spacePan: false,
  showGenerate: false,
  showHelp: false,
  showEngineConnect: false,
  showWirePalette: true,
  showStarterPack: false,
  showGuides: false,
  showIconLibrary: false,
  appMode: "studio",
  pendingWireDrop: null,
  engineProject: null,
  wireZones: [],
  questTrees: [],
  activeQuestTreeId: null,
  destructibles: [],
  activeDestructibleId: null,
  activeWireZoneId: null,
  activeConnector: null,
  fpsTick: 0,
  history: [],
  future: [],
  status: "Welcome to PixelPlane — infinite pixel workspace",
  setTool: (t) => set({
    tool: t,
    status: `Tool: ${t}`
  }),
  setColor: (c) => set({ color: c }),
  setBrushSize: (n) => set({ brushSize: clamp(n, 1, 64) }),
  setFillShapes: (v) => set({ fillShapes: v }),
  setCamera: (c) => set((s) => ({ camera: {
      ...s.camera,
      ...c
    } })),
  panBy: (dx, dy) => set((s) => ({ camera: {
      ...s.camera,
      x: s.camera.x + dx,
      y: s.camera.y + dy
    } })),
  zoomAt: (factor, sx, sy) => set((s) => {
    const z0 = s.camera.zoom;
    const z1 = clamp(z0 * factor, 0.02, 64);
    const worldX = (sx - s.camera.x) / z0;
    const worldY = (sy - s.camera.y) / z0;
    return { camera: {
        zoom: z1,
        x: sx - worldX * z1,
        y: sy - worldY * z1
      } };
  }),
  setMeta: (m) => set((s) => ({ meta: {
      ...s.meta,
      ...m
    } })),
  setStatus: (status) => set({ status }),
  setSpacePan: (spacePan) => set({ spacePan }),
  setShowGenerate: (showGenerate) => set({ showGenerate }),
  setShowHelp: (showHelp) => set({ showHelp }),
  setShowEngineConnect: (showEngineConnect) => set({ showEngineConnect }),
  setShowWirePalette: (showWirePalette) => set({ showWirePalette }),
  setShowStarterPack: (showStarterPack) => set({ showStarterPack }),
  setShowGuides: (showGuides) => set({ showGuides }),
  setShowIconLibrary: (showIconLibrary) => set({ showIconLibrary }),
  setAppMode: (appMode) => set({
    appMode,
    status: appMode === "engine" ? "City Engine — original sandbox · Esc back to Studio" : "Studio — infinite asset plane"
  }),
  setHoverPixel: (hoverPixel) => set({ hoverPixel }),
  setDragPreview: (dragPreview) => set({ dragPreview }),
  setPendingWireDrop: (pendingWireDrop) => set({ pendingWireDrop }),
  setActiveConnector: (activeConnector) => set({
    activeConnector,
    tool: activeConnector ? "wire-zone" : get().tool,
    status: activeConnector ? `Wire connector: ${WIRE_CATEGORY_META[activeConnector].label} — draw a plane or click a zone` : get().status
  }),
  addQuestTree: (x, y, name) => {
    const tree = createStarterQuestTree({
      x,
      y,
      name
    });
    set((s) => ({
      questTrees: [...s.questTrees, tree],
      activeQuestTreeId: tree.id,
      status: `Quest tree “${tree.name}” — edit nodes · wire objectives`
    }));
    return tree.id;
  },
  selectQuestTree: (id) => set({ activeQuestTreeId: id }),
  updateQuestTree: (id, patch) => set((s) => ({ questTrees: s.questTrees.map((q) => q.id === id ? {
      ...q,
      ...patch
    } : q) })),
  updateQuestNode: (treeId, nodeId, patch) => set((s) => ({ questTrees: s.questTrees.map((q) => q.id !== treeId ? q : {
      ...q,
      nodes: q.nodes.map((n) => n.id === nodeId ? {
        ...n,
        ...patch
      } : n)
    }) })),
  addQuestTreeNode: (treeId, kind) => set((s) => ({
    questTrees: s.questTrees.map((q) => q.id === treeId ? addQuestNode(q, kind) : q),
    status: `Added ${kind} node`
  })),
  connectQuestTreeNodes: (treeId, fromId, toId, label) => set((s) => ({ questTrees: s.questTrees.map((q) => q.id === treeId ? connectQuestNodes(q, fromId, toId, label) : q) })),
  deleteQuestTree: (id) => set((s) => ({
    questTrees: s.questTrees.filter((q) => q.id !== id),
    activeQuestTreeId: s.activeQuestTreeId === id ? null : s.activeQuestTreeId,
    status: "Quest tree removed"
  })),
  exportActiveQuestJson: () => {
    const s = get();
    const q = s.questTrees.find((t) => t.id === s.activeQuestTreeId) ?? s.questTrees[0];
    if (!q) return null;
    return JSON.stringify(exportQuestTreeJson(q), null, 2);
  },
  applySpatialQuestLinks: (treeId) => {
    const s = get();
    const tree = s.questTrees.find((t) => t.id === (treeId ?? s.activeQuestTreeId)) ?? s.questTrees[0];
    if (!tree) {
      set({ status: "No quest tree to spatially link" });
      return;
    }
    const scoped = scopeForQuest({
      artboards: s.artboards,
      animRegions: s.animRegions,
      particles: s.particles,
      destructibles: s.destructibles,
      questTrees: s.questTrees.filter((t) => t.id !== tree.id)
    }, tree, { pad: 160 });
    const suggestions = suggestQuestDestructibleLinks(tree, scoped.destructibles);
    if (!suggestions.length && !scoped.artboards.length && !scoped.anims.length) {
      set({ status: `Spatial scope empty near “${tree.name}” — move smashables/art closer` });
      return;
    }
    set((st) => ({
      questTrees: st.questTrees.map((q) => {
        if (q.id !== tree.id) return q;
        const nodes = q.nodes.map((n) => {
          const hit = suggestions.find((x) => x.nodeId === n.id);
          if (!hit) return n;
          return {
            ...n,
            links: {
              ...n.links ?? {},
              destructibleId: hit.destructibleIds[0],
              itemTag: hit.destructibleIds.join(",")
            },
            body: n.body?.includes("[spatial]") ? n.body : `${n.body || ""}\n[spatial] ${hit.destructibleIds.length} nearby smashables`.trim()
          };
        });
        return {
          ...q,
          nodes
        };
      }),
      status: `Spatial link · ${formatScopeSummary(scoped)} → quest “${tree.name}”`
    }));
  },
  placeDestructible: (x, y, kind) => {
    const d = createDestructibleProp({
      x,
      y,
      kind
    });
    set((s) => ({
      destructibles: [...s.destructibles, d],
      activeDestructibleId: d.id,
      status: `Destructible “${d.name}” · ${d.maxHp} HP · pristine→debris stages`
    }));
    return d.id;
  },
  selectDestructible: (id) => set({ activeDestructibleId: id }),
  damageDestructible: (id, amount) => set((s) => ({
    destructibles: s.destructibles.map((d) => d.id === id ? applyDamage(d, amount) : d),
    status: "Destructible damaged"
  })),
  deleteDestructible: (id) => set((s) => ({
    destructibles: s.destructibles.filter((d) => d.id !== id),
    activeDestructibleId: s.activeDestructibleId === id ? null : s.activeDestructibleId
  })),
  pushHistory: () => {
    const s = get();
    const snap = snapOf(s);
    set({
      history: [...s.history.slice(-29), snap],
      future: []
    });
  },
  undo: () => {
    const s = get();
    if (!s.history.length) return;
    const prev = s.history[s.history.length - 1];
    const current = snapOf(s);
    set({
      history: s.history.slice(0, -1),
      future: [current, ...s.future].slice(0, MAX_HISTORY),
      artboards: prev.artboards,
      animRegions: prev.animRegions,
      particles: prev.particles,
      actors: prev.actors,
      wireZones: prev.wireZones,
      activeArtboardId: prev.activeArtboardId,
      status: "Undo"
    });
  },
  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    const current = snapOf(s);
    set({
      future: s.future.slice(1),
      history: [...s.history, current].slice(-30),
      artboards: next.artboards,
      animRegions: next.animRegions,
      particles: next.particles,
      actors: next.actors,
      wireZones: next.wireZones,
      activeArtboardId: next.activeArtboardId,
      status: "Redo"
    });
  },
  addArtboard: (partial) => {
    get().pushHistory();
    const board = emptyArtboard(partial?.width ?? 128, partial?.height ?? 128, partial?.x ?? 40 + get().artboards.length * 20, partial?.y ?? 40 + get().artboards.length * 20, partial?.name ?? `Sheet ${get().artboards.length + 1}`, partial?.kind ?? "sheet");
    if (partial?.layers) board.layers = partial.layers;
    if (partial?.sourceUrl) board.sourceUrl = partial.sourceUrl;
    set((s) => ({
      artboards: [...s.artboards, board],
      activeArtboardId: board.id,
      status: `Created ${board.name}`
    }));
    return board.id;
  },
  createIndoorScene: (opts) => {
    get().pushHistory();
    const w = opts?.w ?? 96;
    const h = opts?.h ?? 72;
    const board = emptyArtboard(w, h, 80 + get().artboards.length * 24, 2000 + get().artboards.length * 20, opts?.name ?? `Indoor ${get().artboards.filter((b) => b.kind === "indoor").length + 1}`, "indoor");
    const layer = board.layers[0];
    const d = layer.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const edge = x < 3 || y < 3 || x >= w - 3 || y >= h - 3;
      if (y >= h - 3 && x > w / 2 - 6 && x < w / 2 + 6) {
        d[i] = 232;
        d[i + 1] = 168;
        d[i + 2] = 56;
        d[i + 3] = 255;
      } else if (edge) {
        d[i] = 30;
        d[i + 1] = 28;
        d[i + 2] = 36;
        d[i + 3] = 255;
      } else {
        const c = (x + y) % 2 === 0 ? 58 : 52;
        d[i] = c;
        d[i + 1] = c - 4;
        d[i + 2] = c + 6;
        d[i + 3] = 255;
      }
    }
    layer.rev++;
    set((s) => ({
      artboards: [...s.artboards, board],
      activeArtboardId: board.id,
      status: `Indoor scene “${board.name}” — paint layout · City Engine reads it as a door`
    }));
    return board.id;
  },
  selectArtboard: (id) => set({
    activeArtboardId: id,
    activeAnimId: null,
    activeParticleId: null,
    activeWireZoneId: null
  }),
  deleteArtboard: (id) => {
    get().pushHistory();
    set((s) => ({
      artboards: s.artboards.filter((b) => b.id !== id),
      activeArtboardId: s.activeArtboardId === id ? null : s.activeArtboardId,
      status: "Artboard deleted"
    }));
  },
  renameArtboard: (id, name) => set((s) => ({ artboards: s.artboards.map((b) => b.id === id ? {
      ...b,
      name
    } : b) })),
  moveArtboard: (id, x, y) => set((s) => ({ artboards: s.artboards.map((b) => b.id === id ? {
      ...b,
      x,
      y
    } : b) })),
  getActiveArtboard: () => {
    const s = get();
    return s.artboards.find((b) => b.id === s.activeArtboardId) ?? null;
  },
  getActiveLayer: () => {
    const b = get().getActiveArtboard();
    if (!b) return null;
    return b.layers.find((l) => l.id === b.activeLayerId) ?? null;
  },
  addLayer: (artboardId) => {
    get().pushHistory();
    set((s) => {
      const id = artboardId ?? s.activeArtboardId;
      return {
        artboards: s.artboards.map((b) => {
          if (b.id !== id) return b;
          const layer = emptyLayer(b.width, b.height, `Layer ${b.layers.length + 1}`);
          return {
            ...b,
            layers: [...b.layers, layer],
            activeLayerId: layer.id
          };
        }),
        status: "Layer added"
      };
    });
  },
  deleteLayer: (layerId, artboardId) => {
    get().pushHistory();
    set((s) => {
      const id = artboardId ?? s.activeArtboardId;
      return { artboards: s.artboards.map((b) => {
          if (b.id !== id) return b;
          if (b.layers.length <= 1) return b;
          const layers = b.layers.filter((l) => l.id !== layerId);
          return {
            ...b,
            layers,
            activeLayerId: b.activeLayerId === layerId ? layers[layers.length - 1].id : b.activeLayerId
          };
        }) };
    });
  },
  selectLayer: (layerId, artboardId) => set((s) => {
    const id = artboardId ?? s.activeArtboardId;
    return { artboards: s.artboards.map((b) => b.id === id ? {
        ...b,
        activeLayerId: layerId
      } : b) };
  }),
  toggleLayerVisible: (layerId, artboardId) => set((s) => {
    const id = artboardId ?? s.activeArtboardId;
    return { artboards: s.artboards.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          layers: b.layers.map((l) => l.id === layerId ? {
            ...l,
            visible: !l.visible
          } : l)
        };
      }) };
  }),
  toggleLayerLocked: (layerId, artboardId) => set((s) => {
    const id = artboardId ?? s.activeArtboardId;
    return { artboards: s.artboards.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          layers: b.layers.map((l) => l.id === layerId ? {
            ...l,
            locked: !l.locked
          } : l)
        };
      }) };
  }),
  renameLayer: (layerId, name, artboardId) => set((s) => {
    const id = artboardId ?? s.activeArtboardId;
    return { artboards: s.artboards.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          layers: b.layers.map((l) => l.id === layerId ? {
            ...l,
            name
          } : l)
        };
      }) };
  }),
  setLayerOpacity: (layerId, opacity, artboardId) => set((s) => {
    const id = artboardId ?? s.activeArtboardId;
    return { artboards: s.artboards.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          layers: b.layers.map((l) => l.id === layerId ? {
            ...l,
            opacity: clamp(opacity, 0, 1)
          } : l)
        };
      }) };
  }),
  duplicateLayer: (layerId, artboardId) => {
    get().pushHistory();
    set((s) => {
      const id = artboardId ?? s.activeArtboardId;
      return { artboards: s.artboards.map((b) => {
          if (b.id !== id) return b;
          const src = b.layers.find((l) => l.id === layerId);
          if (!src) return b;
          const copy = {
            ...src,
            id: uid("layer"),
            name: src.name + " copy",
            data: cloneBuffer(src.data),
            rev: 0
          };
          return {
            ...b,
            layers: [...b.layers, copy],
            activeLayerId: copy.id
          };
        }) };
    });
  },
  mergeVisible: (artboardId) => {
    get().pushHistory();
    set((s) => {
      const id = artboardId ?? s.activeArtboardId;
      return {
        artboards: s.artboards.map((b) => {
          if (b.id !== id) return b;
          const merged = compositeLayers(b.layers, b.width, b.height);
          const layer = emptyLayer(b.width, b.height, "Merged");
          layer.data = merged;
          layer.rev = 1;
          return {
            ...b,
            layers: [layer],
            activeLayerId: layer.id
          };
        }),
        status: "Layers merged"
      };
    });
  },
  paintAt: (artboardId, x, y, erase = false) => {
    const s = get();
    const [r, g, b, a] = hexToRgba(s.color);
    set((state) => ({ artboards: state.artboards.map((board) => {
        if (board.id !== artboardId) return board;
        const layers = board.layers.map((layer) => {
          if (layer.id !== board.activeLayerId || layer.locked) return layer;
          stampBrush(layer.data, board.width, board.height, x, y, s.brushSize, r, g, b, a, erase || s.tool === "eraser");
          return {
            ...layer,
            rev: layer.rev + 1
          };
        });
        return {
          ...board,
          layers
        };
      }) }));
  },
  strokeLine: (artboardId, x0, y0, x1, y1, erase = false) => {
    const s = get();
    const [r, g, b, a] = hexToRgba(s.color);
    set((state) => ({ artboards: state.artboards.map((board) => {
        if (board.id !== artboardId) return board;
        const layers = board.layers.map((layer) => {
          if (layer.id !== board.activeLayerId || layer.locked) return layer;
          drawLine(layer.data, board.width, board.height, x0, y0, x1, y1, s.brushSize, r, g, b, a, erase || s.tool === "eraser");
          return {
            ...layer,
            rev: layer.rev + 1
          };
        });
        return {
          ...board,
          layers
        };
      }) }));
  },
  fillAt: (artboardId, x, y) => {
    get().pushHistory();
    const [r, g, b, a] = hexToRgba(get().color);
    set((state) => ({
      artboards: state.artboards.map((board) => {
        if (board.id !== artboardId) return board;
        const layers = board.layers.map((layer) => {
          if (layer.id !== board.activeLayerId || layer.locked) return layer;
          const data = cloneBuffer(layer.data);
          floodFill(data, board.width, board.height, x, y, r, g, b, a);
          return {
            ...layer,
            data,
            rev: layer.rev + 1
          };
        });
        return {
          ...board,
          layers
        };
      }),
      status: "Fill"
    }));
  },
  sampleAt: (artboardId, x, y) => {
    const board = get().artboards.find((b) => b.id === artboardId);
    if (!board) return;
    const layer = board.layers.find((l) => l.id === board.activeLayerId);
    if (!layer) return;
    const i = (y * board.width + x) * 4;
    const r = layer.data[i];
    const g = layer.data[i + 1];
    const b = layer.data[i + 2];
    if (layer.data[i + 3] < 8) return;
    const hex = "#" + [
    r,
    g,
    b
  ].map((v) => v.toString(16).padStart(2, "0")).join("");
    set({
      color: hex,
      status: `Sampled ${hex}`
    });
  },
  commitShape: (kind, artboardId, x0, y0, x1, y1) => {
    get().pushHistory();
    const s = get();
    const [r, g, b, a] = hexToRgba(s.color);
    set((state) => ({
      artboards: state.artboards.map((board) => {
        if (board.id !== artboardId) return board;
        const layers = board.layers.map((layer) => {
          if (layer.id !== board.activeLayerId || layer.locked) return layer;
          const data = cloneBuffer(layer.data);
          if (kind === "line") drawLine(data, board.width, board.height, x0, y0, x1, y1, s.brushSize, r, g, b, a, false);
          else if (kind === "rect") drawRectOutline(data, board.width, board.height, x0, y0, x1, y1, s.brushSize, r, g, b, a, s.fillShapes);
          else drawEllipse(data, board.width, board.height, x0, y0, x1, y1, r, g, b, a, s.fillShapes);
          return {
            ...layer,
            data,
            rev: layer.rev + 1
          };
        });
        return {
          ...board,
          layers
        };
      }),
      dragPreview: null
    }));
  },
  setSelection: (selection) => set({ selection }),
  copySelection: () => {
    const s = get();
    if (!s.selection) return;
    const board = s.artboards.find((b) => b.id === s.selection.artboardId);
    if (!board) return;
    const layer = board.layers.find((l) => l.id === board.activeLayerId);
    if (!layer) return;
    const data = extractRegion(layer.data, board.width, board.height, s.selection.x, s.selection.y, s.selection.w, s.selection.h);
    set({
      clipboard: {
        w: s.selection.w,
        h: s.selection.h,
        data
      },
      status: "Copied"
    });
  },
  cutSelection: () => {
    get().copySelection();
    get().clearSelectionPixels();
    set({ status: "Cut" });
  },
  clearSelectionPixels: () => {
    const s = get();
    if (!s.selection) return;
    get().pushHistory();
    set((state) => ({ artboards: state.artboards.map((board) => {
        if (board.id !== s.selection.artboardId) return board;
        const layers = board.layers.map((layer) => {
          if (layer.id !== board.activeLayerId || layer.locked) return layer;
          const data = cloneBuffer(layer.data);
          const { x, y, w, h } = s.selection;
          for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
            if (px < 0 || py < 0 || px >= board.width || py >= board.height) continue;
            const i = (py * board.width + px) * 4;
            data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
          }
          return {
            ...layer,
            data,
            rev: layer.rev + 1
          };
        });
        return {
          ...board,
          layers
        };
      }) }));
  },
  pasteClipboard: (artboardId, x, y) => {
    if (!get().clipboard) return;
    get().pushHistory();
    let px = x;
    let py = y;
    // Wave A: soft clamp into active stamp pixel cage (best-effort)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      void 0;
      import("@/store/wave-a").then(({ useWaveA }) => {
        const wa = useWaveA.getState();
        const stamp = wa.constraintStamps.find((s) => s.active || s.id === wa.activeStampId);
        if (!stamp) return;
        // stamp is world-space; paste coords are layer-local — leave as-is if board not aligned
      });
    } catch {
      /* optional */
    }
    set((state) => ({
      artboards: state.artboards.map((board) => {
        if (board.id !== artboardId) return board;
        const layers = board.layers.map((layer) => {
          if (layer.id !== board.activeLayerId || layer.locked) return layer;
          const data = cloneBuffer(layer.data);
          pasteRegion(
            data,
            board.width,
            board.height,
            state.clipboard!.data,
            state.clipboard!.w,
            state.clipboard!.h,
            px,
            py,
          );
          return {
            ...layer,
            data,
            rev: layer.rev + 1
          };
        });
        return {
          ...board,
          layers
        };
      }),
      status: "Pasted"
    }));
  },
  createAnimRegion: (x, y, w, h) => {
    get().pushHistory();
    const frameW = Math.max(8, Math.abs(Math.round(w)));
    const frameH = Math.max(8, Math.abs(Math.round(h)));
    const ax = w < 0 ? x + w : x;
    const ay = h < 0 ? y + h : y;
    const frame = {
      id: uid("frame"),
      data: createBuffer(frameW, frameH)
    };
    const anim = {
      id: uid("anim"),
      name: `Anim ${get().animRegions.length + 1}`,
      x: Math.round(ax),
      y: Math.round(ay),
      frameW,
      frameH,
      frames: [frame],
      fps: 8,
      playing: true,
      currentFrame: 0,
      onionSkin: true
    };
    set((s) => ({
      animRegions: [...s.animRegions, anim],
      activeAnimId: anim.id,
      tool: "select",
      status: `Animation region ${frameW}×${frameH}`
    }));
    import("@/store/character-district").then(({ useCharacterDistrict }) => {
      useCharacterDistrict.getState().rebindStates();
    });
    return anim.id;
  },
  selectAnim: (id) => set({
    activeAnimId: id,
    activeArtboardId: null,
    activeParticleId: null,
    activeWireZoneId: null
  }),
  deleteAnim: (id) => {
    get().pushHistory();
    set((s) => ({
      animRegions: s.animRegions.filter((a) => a.id !== id),
      actors: s.actors.filter((a) => a.animId !== id),
      activeAnimId: s.activeAnimId === id ? null : s.activeAnimId
    }));
  },
  renameAnim: (id, name) => set((s) => ({ animRegions: s.animRegions.map((a) => a.id === id ? {
      ...a,
      name
    } : a) })),
  setAnimFps: (id, fps) => set((s) => ({ animRegions: s.animRegions.map((a) => a.id === id ? {
      ...a,
      fps: clamp(fps, 1, 60)
    } : a) })),
  toggleAnimPlay: (id) => set((s) => ({ animRegions: s.animRegions.map((a) => a.id === id ? {
      ...a,
      playing: !a.playing
    } : a) })),
  setAnimFrame: (id, frame) => set((s) => ({ animRegions: s.animRegions.map((a) => a.id === id ? {
      ...a,
      currentFrame: clamp(frame, 0, Math.max(0, a.frames.length - 1)),
      playing: false
    } : a) })),
  addAnimFrame: (id, fromSelection) => {
    get().pushHistory();
    const s = get();
    const anim = s.animRegions.find((a) => a.id === id);
    if (!anim) return;
    let data = createBuffer(anim.frameW, anim.frameH);
    if (fromSelection && s.selection) {
      const board = s.artboards.find((b) => b.id === s.selection.artboardId);
      if (board) {
        const layer = board.layers.find((l) => l.id === board.activeLayerId);
        if (layer) {
          const extracted = extractRegion(layer.data, board.width, board.height, s.selection.x, s.selection.y, s.selection.w, s.selection.h);
          data = createBuffer(anim.frameW, anim.frameH);
          pasteRegion(data, anim.frameW, anim.frameH, extracted, s.selection.w, s.selection.h, 0, 0);
        }
      }
    } else if (anim.frames.length) data = cloneBuffer(anim.frames[anim.frames.length - 1].data);
    const frame = {
      id: uid("frame"),
      data
    };
    set((state) => ({
      animRegions: state.animRegions.map((a) => a.id === id ? {
        ...a,
        frames: [...a.frames, frame],
        currentFrame: a.frames.length
      } : a),
      status: "Frame added"
    }));
  },
  deleteAnimFrame: (id, frameIndex) => {
    get().pushHistory();
    set((s) => ({ animRegions: s.animRegions.map((a) => {
        if (a.id !== id || a.frames.length <= 1) return a;
        const frames = a.frames.filter((_, i) => i !== frameIndex);
        return {
          ...a,
          frames,
          currentFrame: clamp(a.currentFrame, 0, frames.length - 1)
        };
      }) }));
  },
  captureAnimFrameFromArtboard: (animId, artboardId, x, y) => {
    get().pushHistory();
    const s = get();
    const anim = s.animRegions.find((a) => a.id === animId);
    const board = s.artboards.find((b) => b.id === artboardId);
    if (!anim || !board) return;
    const data = extractRegion(compositeLayers(board.layers, board.width, board.height), board.width, board.height, x, y, anim.frameW, anim.frameH);
    const frame = {
      id: uid("frame"),
      data
    };
    set((state) => ({
      animRegions: state.animRegions.map((a) => a.id === animId ? {
        ...a,
        frames: [...a.frames, frame],
        currentFrame: a.frames.length
      } : a),
      status: "Captured frame into animation"
    }));
  },
  applySecondaryMotion: (animId, kind) => {
    const anim = get().animRegions.find((a) => a.id === animId);
    if (!anim || anim.frames.length < 1) {
      set({ status: "Select an animation with frames first" });
      return;
    }
    get().pushHistory();
    const def = defaultSecondary(kind, anim.frameW, anim.frameH, uid("sec"));
    const f0 = anim.frames[0].data;
    const mid = (Math.floor(anim.frameH / 2) * anim.frameW + Math.floor(anim.frameW / 2)) * 4;
    if (f0[mid + 3] > 20) def.color = [
    f0[mid],
    f0[mid + 1],
    f0[mid + 2],
    255
  ];
    const frames = bakeSecondaryLayer(anim.frames.map((f) => f.data), anim.frameW, anim.frameH, def).composites.map((data) => ({
      id: uid("frame"),
      data
    }));
    const sibling = {
      id: uid("anim"),
      name: `${anim.name} + ${def.name}`,
      x: anim.x + anim.frameW + 16,
      y: anim.y,
      frameW: anim.frameW,
      frameH: anim.frameH,
      frames,
      fps: anim.fps,
      playing: true,
      currentFrame: 0,
      onionSkin: false,
      beast: {
        secondaryKinds: [...anim.beast?.secondaryKinds ?? [], kind],
        cosmeticsApplied: anim.beast?.cosmeticsApplied ?? []
      }
    };
    set((s) => ({
      animRegions: [...s.animRegions, sibling],
      activeAnimId: sibling.id,
      status: `Secondary “${def.name}” baked · ${frames.length} frames (original kept)`
    }));
    useHotkeys.getState().pushToast("Secondary motion", `${def.name} follows body via offline springs — not random gen`, {
      x: 80,
      y: 100
    });
  },
  applyCosmeticSystem: (animId, anchor = "head") => {
    const anim = get().animRegions.find((a) => a.id === animId);
    if (!anim || anim.frames.length < 1) {
      set({ status: "Select an animation with frames first" });
      return;
    }
    get().pushHistory();
    const hat = makeHatStamp(Math.max(10, Math.round(anim.frameW * 0.45)), Math.max(8, Math.round(anim.frameH * 0.32)));
    const variants = defaultVariants();
    const newAnims = [];
    let ox = anim.x + anim.frameW + 20;
    for (const v of variants) {
      const stamp = recolorStamp(hat.data, hat.w, hat.h, v.hue, v.sat, v.val);
      const baked = bakeCosmeticOnAnim(anim.frames.map((f) => f.data), anim.frameW, anim.frameH, {
        id: uid("cos"),
        name: v.name,
        anchor,
        ox: 0,
        oy: anchor === "head" ? -Math.round(anim.frameH * 0.06) : 0,
        stamp,
        stampW: hat.w,
        stampH: hat.h,
        followScale: true,
        lockToSilhouette: true,
        scale: 1
      });
      newAnims.push({
        id: uid("anim"),
        name: `${anim.name} · ${v.name}`,
        x: ox,
        y: anim.y + (newAnims.length > 2 ? anim.frameH + 12 : 0),
        frameW: anim.frameW,
        frameH: anim.frameH,
        frames: baked.map((data) => ({
          id: uid("frame"),
          data
        })),
        fps: anim.fps,
        playing: true,
        currentFrame: 0,
        onionSkin: false,
        beast: {
          secondaryKinds: anim.beast?.secondaryKinds ?? [],
          cosmeticsApplied: [...anim.beast?.cosmeticsApplied ?? [], v.name]
        }
      });
      if (newAnims.length === 3) ox = anim.x + anim.frameW + 20;
      else ox += anim.frameW + 12;
    }
    set((s) => ({
      animRegions: [...s.animRegions, ...newAnims],
      activeAnimId: newAnims[0]?.id ?? animId,
      status: `Cosmetic system · ${newAnims.length} silhouette-locked variants`
    }));
  },
  auditAnim: (animId) => {
    const anim = get().animRegions.find((a) => a.id === animId);
    if (!anim) {
      set({ status: "No animation selected" });
      return;
    }
    const report = auditAnimation(anim.frames.map((f) => f.data), anim.frameW, anim.frameH);
    const summary = formatAuditSummary(report);
    set((s) => ({
      animRegions: s.animRegions.map((a) => a.id === animId ? {
        ...a,
        beast: {
          secondaryKinds: a.beast?.secondaryKinds ?? [],
          cosmeticsApplied: a.beast?.cosmeticsApplied ?? [],
          lastAuditScore: report.score,
          lastAuditAt: Date.now()
        }
      } : a),
      status: summary + (report.findings[0] ? ` · ${report.findings[0].message}` : " · clean strip")
    }));
    const top = report.findings.slice(0, 2);
    useHotkeys.getState().pushToast(`Audit ${report.score}/100`, top.length ? top.map((f) => f.message).join(" · ") : "Looks solid — mass and continuity check out", {
      x: 90,
      y: 96
    });
  },
  moveAnim: (id, x, y) => set((s) => ({ animRegions: s.animRegions.map((a) => a.id === id ? {
      ...a,
      x,
      y
    } : a) })),
  placeActorFromAnim: (animId, x, y) => {
    get().pushHistory();
    const actor = {
      id: uid("actor"),
      animId,
      x,
      y,
      scale: 1,
      flipX: false
    };
    set((s) => ({
      actors: [...s.actors, actor],
      status: "Placed animation in scene"
    }));
  },
  moveActor: (id, x, y) => set((s) => ({ actors: s.actors.map((a) => a.id === id ? {
      ...a,
      x,
      y
    } : a) })),
  deleteActor: (id) => set((s) => ({ actors: s.actors.filter((a) => a.id !== id) })),
  placeParallaxStack: (stack) => {
    get().pushHistory();
    const id = uid("px");
    const layers = stack.layers.map((L, i) => ({
      ...L,
      scrollScaleX: L.scrollScaleX ?? L.depth,
      scrollScaleY: L.scrollScaleY ?? L.depth,
      repeatX: L.repeatX ?? true,
      repeatY: L.repeatY ?? false,
      autoscrollX: L.autoscrollX ?? 0,
      autoscrollY: L.autoscrollY ?? 0,
      zIndex: L.zIndex ?? i
    }));
    const full = {
      ...stack,
      layers,
      id,
      mode: stack.mode ?? "viewport",
      autoPreview: stack.autoPreview ?? true,
      previewCamX: stack.previewCamX ?? 0,
      previewCamY: stack.previewCamY ?? 0,
      folderId: stack.folderId ?? null,
      folderPath: stack.folderPath ?? null
    };
    set((s) => ({
      parallaxStacks: [...s.parallaxStacks, full],
      activeParallaxId: id,
      status: `Parallax “${full.name}” · ${full.layers.length} layers · pan or auto-preview depth`
    }));
    return id;
  },
  selectParallax: (id) => set({
    activeParallaxId: id,
    activeArtboardId: null,
    activeAnimId: null,
    activeParticleId: null,
    activeWireZoneId: null
  }),
  deleteParallax: (id) => {
    get().pushHistory();
    set((s) => ({
      parallaxStacks: s.parallaxStacks.filter((p) => p.id !== id),
      activeParallaxId: s.activeParallaxId === id ? null : s.activeParallaxId
    }));
  },
  moveParallax: (id, x, y) => set((s) => ({ parallaxStacks: s.parallaxStacks.map((p) => p.id === id ? {
      ...p,
      x,
      y
    } : p) })),
  setParallaxMode: (id, mode) => set((s) => ({
    parallaxStacks: s.parallaxStacks.map((p) => {
      if (p.id !== id) return p;
      if (mode === "sheet") {
        const maxH = Math.max(...p.layers.map((l) => l.h), p.viewH);
        const totalW = p.layers.reduce((acc, l) => acc + l.w, 0) + Math.max(0, p.layers.length - 1) * 8;
        return {
          ...p,
          mode,
          viewW: Math.max(p.viewW, totalW),
          viewH: Math.max(p.viewH, maxH)
        };
      }
      return {
        ...p,
        mode
      };
    }),
    status: mode === "sheet" ? "Sheet-wide parallax — full layers side by side" : "Viewport parallax window"
  })),
  setParallaxViewSize: (id, viewW, viewH) => set((s) => ({ parallaxStacks: s.parallaxStacks.map((p) => p.id === id ? {
      ...p,
      viewW: Math.max(64, Math.round(viewW)),
      viewH: Math.max(48, Math.round(viewH))
    } : p) })),
  setParallaxLayerDepth: (stackId, layerId, depth) => set((s) => ({ parallaxStacks: s.parallaxStacks.map((p) => {
      if (p.id !== stackId) return p;
      return {
        ...p,
        layers: p.layers.map((L) => L.id === layerId ? {
          ...L,
          depth: Math.max(0, Math.min(1.5, depth)),
          scrollScaleX: Math.max(0, Math.min(1.5, depth)),
          scrollScaleY: Math.max(0, Math.min(1.5, depth)),
          rev: L.rev + 1
        } : L)
      };
    }) })),
  setParallaxLayerScroll: (stackId, layerId, scrollScaleX, scrollScaleY) => set((s) => ({ parallaxStacks: s.parallaxStacks.map((p) => {
      if (p.id !== stackId) return p;
      return {
        ...p,
        layers: p.layers.map((L) => L.id === layerId ? {
          ...L,
          scrollScaleX,
          scrollScaleY,
          depth: scrollScaleX,
          rev: L.rev + 1
        } : L)
      };
    }) })),
  toggleParallaxAutoPreview: (id) => set((s) => ({ parallaxStacks: s.parallaxStacks.map((p) => p.id === id ? {
      ...p,
      autoPreview: !p.autoPreview
    } : p) })),
  wireParallaxStack: (stackId, folderId, folderPath) => set((s) => ({
    parallaxStacks: s.parallaxStacks.map((p) => p.id === stackId ? {
      ...p,
      folderId,
      folderPath
    } : p),
    status: `Parallax wired → ${folderPath}`
  })),
  tickAnimations: () => {
    const s = get();
    s.fpsTick += 1;
    for (const a of s.animRegions) {
      if (!a.playing || a.frames.length <= 1) continue;
      const stepEvery = Math.max(1, Math.round(10 / a.fps));
      if (s.fpsTick % stepEvery !== 0) continue;
      a.currentFrame = (a.currentFrame + 1) % a.frames.length;
    }
    for (const px of s.parallaxStacks) {
      if (!px.autoPreview) continue;
      const t = s.fpsTick * 0.08;
      px.previewCamX = Math.sin(t) * 80;
      px.previewCamY = Math.cos(t * 0.6) * 24;
    }
  },
  createParticle: (x, y, w, h) => {
    get().pushHistory();
    const pw = Math.max(16, Math.abs(Math.round(w)));
    const ph = Math.max(16, Math.abs(Math.round(h)));
    const px = w < 0 ? x + w : x;
    const py = h < 0 ? y + h : y;
    const p = {
      id: uid("fx"),
      name: `FX ${get().particles.length + 1}`,
      x: Math.round(px),
      y: Math.round(py),
      w: pw,
      h: ph,
      kind: "magic",
      rate: 12,
      life: 1,
      color: get().color,
      playing: true
    };
    set((s) => ({
      particles: [...s.particles, p],
      activeParticleId: p.id,
      tool: "select",
      status: "Particle system created"
    }));
    return p.id;
  },
  selectParticle: (id) => set({
    activeParticleId: id,
    activeArtboardId: null,
    activeAnimId: null,
    activeWireZoneId: null
  }),
  deleteParticle: (id) => {
    get().pushHistory();
    set((s) => ({
      particles: s.particles.filter((p) => p.id !== id),
      activeParticleId: s.activeParticleId === id ? null : s.activeParticleId
    }));
  },
  setParticleKind: (id, kind) => set((s) => ({ particles: s.particles.map((p) => p.id === id ? {
      ...p,
      kind
    } : p) })),
  toggleParticlePlay: (id) => set((s) => ({ particles: s.particles.map((p) => p.id === id ? {
      ...p,
      playing: !p.playing
    } : p) })),
  moveParticle: (id, x, y) => set((s) => ({ particles: s.particles.map((p) => p.id === id ? {
      ...p,
      x,
      y
    } : p) })),
  connectEngine: (opts) => {
    const project = createEngineProject(opts);
    set({
      engineProject: project,
      showEngineConnect: false,
      showWirePalette: true,
      meta: {
        ...get().meta,
        name: opts.name || get().meta.name
      },
      status: `Play project "${project.name}" on this plane → ${project.rootFolderName}/`
    });
  },
  disconnectEngine: () => {
    set({
      engineProject: null,
      wireZones: get().wireZones.map((z) => ({
        ...z,
        folderId: null,
        folderPath: null
      })),
      status: "Play project disconnected — feed planes kept, destinations cleared"
    });
  },
  createWireZone: (x, y, w, h, category = "characters") => {
    get().pushHistory();
    const ww = Math.max(24, Math.abs(Math.round(w)));
    const hh = Math.max(24, Math.abs(Math.round(h)));
    const zx = Math.round(w < 0 ? x + w : x);
    const zy = Math.round(h < 0 ? y + h : y);
    const meta = WIRE_CATEGORY_META[category];
    let questTreeId = null;
    let destructibleId = null;
    if (category === "quests") {
      const tree = createStarterQuestTree({
        x: zx + 12,
        y: zy + 12,
        name: "Quest line",
        color: meta.color
      });
      questTreeId = tree.id;
      set((s) => ({
        questTrees: [...s.questTrees, tree],
        activeQuestTreeId: tree.id
      }));
    }
    if (category === "destructibles") {
      const d = createDestructibleProp({
        x: zx + ww / 2 - 18,
        y: zy + hh / 2 - 18,
        kind: "crate"
      });
      destructibleId = d.id;
      set((s) => ({
        destructibles: [...s.destructibles, d],
        activeDestructibleId: d.id
      }));
    }
    const zone = {
      id: uid("wire"),
      name: `${meta.label} plane`,
      x: zx,
      y: zy,
      w: ww,
      h: hh,
      category,
      folderId: null,
      folderPath: null,
      color: meta.color,
      enabled: true,
      questTreeId,
      destructibleId,
      trigger: { kind: "none", armed: false },
    };
    if (questTreeId) set((s) => ({ questTrees: s.questTrees.map((q) => q.id === questTreeId ? {
        ...q,
        wireZoneId: zone.id,
        w: Math.max(q.w, ww - 24),
        h: Math.max(q.h, hh - 24)
      } : q) }));
    set((s) => ({
      wireZones: [...s.wireZones, zone],
      activeWireZoneId: zone.id,
      status: category === "quests" ? `Quest builder plane ${ww}×${hh} — tree ready · wire to quests folder` : category === "destructibles" ? `Destructibles plane ${ww}×${hh} — crate placed · wire stage art` : `Feed plane ${ww}×${hh} — drop a connector to wire a folder`
    }));
    return zone.id;
  },
  selectWireZone: (id) => set({
    activeWireZoneId: id,
    activeArtboardId: null,
    activeAnimId: null,
    activeParticleId: null
  }),
  deleteWireZone: (id) => {
    get().pushHistory();
    set((s) => ({
      wireZones: s.wireZones.filter((z) => z.id !== id),
      activeWireZoneId: s.activeWireZoneId === id ? null : s.activeWireZoneId,
      status: "Feed plane removed"
    }));
  },
  moveWireZone: (id, x, y) => set((s) => ({ wireZones: s.wireZones.map((z) => z.id === id ? {
      ...z,
      x,
      y
    } : z) })),
  renameWireZone: (id, name) => set((s) => ({ wireZones: s.wireZones.map((z) => z.id === id ? {
      ...z,
      name
    } : z) })),
  setZoneTrigger: (id, kind, armed) => {
    set((s) => ({
      wireZones: s.wireZones.map((z) =>
        z.id === id
          ? {
              ...z,
              trigger: {
                kind,
                armed: kind === "none" ? false : armed ?? true,
                lastFiredAt: z.trigger?.lastFiredAt,
              },
            }
          : z,
      ),
      status:
        kind === "none"
          ? "Trigger cleared"
          : `Trigger armed · ${String(kind).replace("_", " ")} · T to fire`,
    }));
  },
  armZoneTrigger: (id, armed) => {
    set((s) => ({
      wireZones: s.wireZones.map((z) =>
        z.id === id && z.trigger
          ? { ...z, trigger: { ...z.trigger, armed } }
          : z.id === id
            ? { ...z, trigger: { kind: "none", armed } }
            : z,
      ),
      status: armed ? "Trigger valve open" : "Trigger valve closed",
    }));
  },
  fireZoneTrigger: (id) => {
    const s = get();
    const zone = s.wireZones.find((z) => z.id === (id || s.activeWireZoneId));
    if (!zone) {
      set({ status: "No feed plane selected" });
      return;
    }
    const kind = zone.trigger?.kind ?? "none";
    if (kind === "none") {
      set({ status: "Plane has no trigger — arm one on the wire strip" });
      return;
    }
    if (zone.trigger && !zone.trigger.armed) {
      set({ status: "Valve closed · click the valve to arm" });
      return;
    }
    void import("@/lib/wires/fire").then(({ fireWireAction }) => {
      fireWireAction(zone, kind);
    });
    set((st) => ({
      wireZones: st.wireZones.map((z) =>
        z.id === zone.id
          ? {
              ...z,
              trigger: { ...(z.trigger ?? { kind, armed: true }), lastFiredAt: Date.now() },
            }
          : z,
      ),
    }));
  },
  fireArmedTriggers: (kind) => {
    const s = get();
    let n = 0;
    const hits = [];
    for (const z of s.wireZones) {
      if (!z.trigger?.armed) continue;
      if (kind && z.trigger.kind !== kind) continue;
      if (z.trigger.kind === "none") continue;
      hits.push(z);
      n++;
    }
    if (n) {
      void import("@/lib/wires/fire").then(({ fireWireAction }) => {
        for (const z of hits) fireWireAction(z, z.trigger.kind);
      });
      set((st) => ({
        wireZones: st.wireZones.map((z) =>
          z.trigger?.armed && (!kind || z.trigger.kind === kind)
            ? { ...z, trigger: { ...z.trigger, lastFiredAt: Date.now() } }
            : z,
        ),
        status: `Fired ${n} armed plane${n === 1 ? "" : "s"}`,
      }));
    }
    return n;
  },
  beginWireConnect: (opts) => {
    if (!get().engineProject) {
      set({
        showEngineConnect: true,
        status: "Connect a game engine project first"
      });
      return;
    }
    set({ pendingWireDrop: {
        zoneId: opts.zoneId ?? null,
        draft: opts.draft,
        category: opts.category,
        screenX: opts.screenX,
        screenY: opts.screenY
      } });
  },
  assignWireDestination: (opts) => {
    const project = get().engineProject;
    if (!project) return;
    const folder = findFolderById(project.folders, opts.folderId);
    if (!folder) return;
    get().pushHistory();
    const meta = WIRE_CATEGORY_META[opts.category];
    let zoneId = opts.zoneId;
    if (!zoneId && opts.draft) zoneId = get().createWireZone(opts.draft.x, opts.draft.y, opts.draft.w, opts.draft.h, opts.category);
    if (!zoneId) return;
    set((s) => ({
      wireZones: s.wireZones.map((z) => z.id === zoneId ? {
        ...z,
        folderId: folder.id,
        folderPath: folder.path,
        category: opts.category,
        color: meta.color,
        name: opts.zoneName?.trim() || z.name || folder.name,
        enabled: true
      } : z),
      pendingWireDrop: null,
      activeConnector: null,
      activeWireZoneId: zoneId,
      tool: "select",
      status: `Wired → ${folder.path}`
    }));
  },
  addAssetFolder: (parentId, name, category) => {
    const project = get().engineProject;
    if (!project) return null;
    const parent = findFolderById(project.folders, parentId);
    if (!parent) return null;
    const cat = category ?? parent.category;
    const child = {
      id: uid("folder"),
      name: name.trim() || "New Folder",
      category: cat,
      path: `${parent.path}/${name.trim() || "New Folder"}`,
      children: [],
      pixelSize: parent.pixelSize ?? project.sizeDefaults[cat],
      inheritsSize: true,
      isEntityRoot: false,
      createdAt: Date.now()
    };
    set({
      engineProject: {
        ...project,
        folders: addChildFolder(project.folders, parentId, child)
      },
      status: `Folder ${child.name} created`
    });
    return child.id;
  },
  addEntityFolder: (parentId, entityName, category, pixelSize) => {
    const project = get().engineProject;
    if (!project) return null;
    const parent = findFolderById(project.folders, parentId);
    if (!parent) return null;
    const size = pixelSize ?? project.sizeDefaults[category] ?? parent.pixelSize ?? 48;
    const entity = createEntityFolder(parent, entityName, category, size);
    const withParentPath = {
      ...entity,
      path: `${parent.path}/${entity.name}`,
      children: entity.children.map((c) => ({
        ...c,
        path: `${parent.path}/${entity.name}/${c.name}`,
        children: c.children.map((cc) => ({
          ...cc,
          path: `${parent.path}/${entity.name}/${c.name}/${cc.name}`
        }))
      }))
    };
    set({
      engineProject: {
        ...project,
        folders: addChildFolder(project.folders, parentId, withParentPath),
        sizeDefaults: {
          ...project.sizeDefaults,
          [category]: size
        }
      },
      status: `Entity "${entityName}" → ${withParentPath.path} (${size}px)`
    });
    return withParentPath.id;
  },
  setCategoryPixelSize: (category, size) => {
    const project = get().engineProject;
    if (!project) return;
    set({
      engineProject: {
        ...project,
        sizeDefaults: {
          ...project.sizeDefaults,
          [category]: size
        },
        folders: mapFolders(project.folders, (f) => {
          if (f.category !== category) return f;
          if (!f.inheritsSize && f.pixelSize != null) return f;
          return {
            ...f,
            pixelSize: size
          };
        })
      },
      status: `${WIRE_CATEGORY_META[category].label} default size → ${size}px`
    });
  },
  setFolderPixelSize: (folderId, size, propagate = true) => {
    const project = get().engineProject;
    if (!project) return;
    const apply = (f) => {
      if (f.id === folderId) return {
        ...f,
        pixelSize: size,
        inheritsSize: false,
        children: propagate ? f.children.map((c) => ({
          ...c,
          pixelSize: c.inheritsSize ? size : c.pixelSize,
          children: c.children.map((cc) => cc.inheritsSize ? {
            ...cc,
            pixelSize: size
          } : cc)
        })) : f.children
      };
      return {
        ...f,
        children: f.children.map(apply)
      };
    };
    set({
      engineProject: {
        ...project,
        folders: project.folders.map(apply)
      },
      status: `Folder size → ${size}px`
    });
  },
  exportEnginePackage: async () => {
    const s = get();
    if (!s.engineProject) {
      set({
        showEngineConnect: true,
        status: "Connect a play project to pack it"
      });
      return;
    }
    set({ status: "Packaging play project…" });
    try {
      downloadBlob(await buildEnginePackage({
        project: s.engineProject,
        zones: s.wireZones,
        artboards: s.artboards,
        animRegions: s.animRegions,
        particles: s.particles,
        parallaxStacks: s.parallaxStacks,
        questTrees: s.questTrees,
        destructibles: s.destructibles
      }), `${s.engineProject.rootFolderName}_pixelplane.zip`);
      set({ status: `Packed ${s.engineProject.rootFolderName}_pixelplane.zip` });
    } catch (e) {
      console.error(e);
      set({ status: "Export failed — see console" });
    }
  },
  importImageToArtboard: (data, w, h, name, x, y) => {
    get().pushHistory();
    const layer = emptyLayer(w, h, "Import");
    layer.data = data;
    layer.rev = 1;
    const board = emptyArtboard(w, h, x ?? 20, y ?? 20, name ?? "Import", "sheet");
    board.layers = [layer];
    board.activeLayerId = layer.id;
    set((s) => ({
      artboards: [...s.artboards, board],
      activeArtboardId: board.id,
      status: `Imported ${name ?? "image"} (${w}×${h})`
    }));
    return board.id;
  },
  generateFromPrompt: (opts) => {
    get().pushHistory();
    const mode = opts.style === "8bit" ? "8bit" : opts.style === "hd-pixel" ? "hd" : "16bit";
    const result = generateCharacter({
      prompt: opts.prompt,
      style: opts.style,
      mode,
      size: opts.size,
      frames: opts.anim === "none" ? 1 : 8,
      anim: opts.anim
    });
    const sheet = sheetFromFrames(result.frames, result.width, result.height, Math.min(result.frames.length, 8));
    const layer = emptyLayer(sheet.width, sheet.height, "Generated");
    layer.data = sheet.data;
    layer.rev = 1;
    const board = emptyArtboard(sheet.width, sheet.height, 40 + get().artboards.length * 24, 40, opts.prompt.slice(0, 28) || "Generated", "sheet");
    board.layers = [layer];
    board.activeLayerId = layer.id;
    const frames = result.frames.map((f) => ({
      id: uid("frame"),
      data: f
    }));
    const anim = {
      id: uid("anim"),
      name: `${opts.anim} — ${opts.prompt.slice(0, 16)}`,
      x: board.x + board.width + 24,
      y: board.y,
      frameW: result.width,
      frameH: result.height,
      frames,
      fps: opts.anim === "run" ? 12 : 8,
      playing: true,
      currentFrame: 0,
      onionSkin: false
    };
    set((s) => ({
      artboards: [...s.artboards, board],
      animRegions: [...s.animRegions, anim],
      activeArtboardId: board.id,
      activeAnimId: anim.id,
      showGenerate: false,
      meta: {
        ...s.meta,
        pixelMode: mode
      },
      status: `Generated ${result.frames.length} frames · ${mode}`
    }));
  },
  removeBgActive: () => {
    const board = get().getActiveArtboard();
    if (!board) {
      set({ status: "Select an artboard first" });
      return;
    }
    get().pushHistory();
    set((state) => ({
      artboards: state.artboards.map((b) => {
        if (b.id !== board.id) return b;
        const layers = b.layers.map((l) => {
          if (l.id !== b.activeLayerId) return l;
          return {
            ...l,
            data: removeBackground(l.data, b.width, b.height),
            rev: l.rev + 1
          };
        });
        return {
          ...b,
          layers
        };
      }),
      status: "Background removed"
    }));
  },
  exportActivePng: () => {
    const board = get().getActiveArtboard();
    if (!board) {
      set({ status: "No artboard selected" });
      return;
    }
    downloadPng(compositeLayers(board.layers, board.width, board.height), board.width, board.height, `${board.name.replace(/\s+/g, "_")}.png`);
    set({ status: `Exported ${board.name}.png` });
  },
  exportAnimSheet: (animId) => {
    const anim = get().animRegions.find((a) => a.id === animId);
    if (!anim) return;
    const sheet = sheetFromFrames(anim.frames.map((f) => f.data), anim.frameW, anim.frameH);
    downloadPng(sheet.data, sheet.width, sheet.height, `${anim.name.replace(/\s+/g, "_")}_sheet.png`);
    set({ status: `Exported sheet ${anim.name}` });
  },
  sliceArtboardToAnim: (artboardId, frameW, frameH, opts) => {
    const board = get().artboards.find((b) => b.id === artboardId);
    if (!board) {
      set({ status: "Artboard not found" });
      return null;
    }
    const fw = Math.max(4, Math.floor(frameW));
    const fh = Math.max(4, Math.floor(frameH));
    if (fw > board.width || fh > board.height) {
      set({ status: `Frame ${fw}×${fh} larger than board ${board.width}×${board.height}` });
      return null;
    }
    get().pushHistory();
    const comp = compositeLayers(board.layers, board.width, board.height);
    const cols = Math.floor(board.width / fw);
    const rows = Math.floor(board.height / fh);
    const maxFrames = opts?.maxFrames ?? 64;
    const frames = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      if (frames.length >= maxFrames) break;
      const sx = col * fw;
      const sy = row * fh;
      const cell = extractRegion(comp, board.width, board.height, sx, sy, fw, fh);
      let opaque = 0;
      for (let i = 3; i < cell.length; i += 4) if (cell[i] > 12) opaque++;
      if (opaque < 4) continue;
      frames.push({
        id: uid("frame"),
        data: cell
      });
    }
    if (frames.length === 0) {
      set({ status: "No non-empty frames found — check frame size" });
      return null;
    }
    const anim = {
      id: uid("anim"),
      name: opts?.name ?? `${board.name} slice`,
      x: board.x + board.width + 24,
      y: board.y,
      frameW: fw,
      frameH: fh,
      frames,
      fps: 8,
      playing: true,
      currentFrame: 0,
      onionSkin: false
    };
    set((s) => ({
      animRegions: [...s.animRegions, anim],
      activeAnimId: anim.id,
      status: `Sliced ${frames.length} frames · ${fw}×${fh} from “${board.name}”`
    }));
    return anim.id;
  },
  splitArtboardToClips: (artboardId, opts) => {
    const board = get().artboards.find((b) => b.id === artboardId);
    if (!board) {
      set({ status: "Artboard not found" });
      return [];
    }
    const prefix = clipPrefixFromBoardName(board.name);
    const already = get().animRegions.filter(
      (a) =>
        a.sourceBoardId === board.id ||
        a.name.toLowerCase().startsWith(prefix.toLowerCase() + " ·"),
    );
    if (already.length >= 2 && !opts?.force) {
      if (opts?.makeCharacter) get().makeCharacterFromSheet(board.id);
      set({
        status: `“${board.name}” already split · ${already.length} clips`,
        activeArtboardId: board.id,
      });
      return already.map((a) => a.id);
    }
    const comp = compositeLayers(board.layers, board.width, board.height);
    const split = splitSheetBuffer(comp, board.width, board.height, {
      frameW: opts?.frameW,
      frameH: opts?.frameH,
      punchBg: opts?.punchBg,
      prefix,
    });
    if (!split) {
      set({ status: `Couldn’t detect a grid on “${board.name}” — set frame size` });
      return [];
    }
    get().pushHistory();
    const { grid, clips } = split;
    const originX = board.x + board.width + 28;
    const originY = board.y;
    const created = clips.map((clip, i) => ({
      id: uid("anim"),
      name: clip.name,
      x: originX,
      y: originY + i * (clip.frameH + 18),
      frameW: clip.frameW,
      frameH: clip.frameH,
      frames: clip.frames.map((data) => ({ id: uid("frame"), data })),
      fps: clip.fps,
      playing: true,
      currentFrame: 0,
      onionSkin: false,
      loop: true,
      facing: clip.facing,
      stateName: clip.state,
      sourceBoardId: board.id,
    }));
    set((s) => ({
      animRegions: [...s.animRegions, ...created],
      activeAnimId: created[0]?.id ?? s.activeAnimId,
      activeArtboardId: board.id,
      status: `Split “${board.name}” → ${created.length} clips · ${grid.cols}×${grid.rows} ${grid.layout} · ${grid.frameW}×${grid.frameH}`,
    }));
    if (opts?.makeCharacter) get().makeCharacterFromSheet(board.id);
    return created.map((a) => a.id);
  },
  makeCharacterFromSheet: (artboardId) => {
    const board = get().artboards.find((b) => b.id === artboardId);
    if (!board) return null;
    let ids = get()
      .animRegions.filter(
        (a) =>
          a.sourceBoardId === board.id ||
          a.name.toLowerCase().startsWith(clipPrefixFromBoardName(board.name).toLowerCase() + " ·"),
      )
      .map((a) => a.id);
    if (ids.length < 2) {
      ids = get().splitArtboardToClips(board.id, { makeCharacter: false, force: true });
    }
    if (!ids.length) return null;
    const anims = get().animRegions.filter((a) => ids.includes(a.id));
    const idle = anims.find((a) => a.stateName === "idle" || /idle/i.test(a.name));
    const walks = anims.filter((a) => a.id !== idle?.id);
    const origin = { x: board.x + board.width + 40, y: board.y + board.height + 24 };
    const payload = {
      name: clipPrefixFromBoardName(board.name),
      idleId: idle?.id ?? null,
      walkIds: walks.map((w) => w.id),
      origin,
    };
    void import("@/store/character-district").then(({ useCharacterDistrict }) => {
      useCharacterDistrict.getState().bindSplitClips(payload);
    });
    if (idle) {
      const actorAnim = walks[0]?.id ?? idle.id;
      const exists = get().actors.some((a) => a.animId === actorAnim);
      if (!exists) {
        get().placeActorFromAnim(actorAnim, board.x, board.y + board.height + 16);
      }
    }
    const first = idle ?? walks[0];
    if (first) {
      const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;
      set({
        camera: {
          zoom: 0.55,
          x: vw / 2 - (first.x + first.frameW / 2) * 0.55,
          y: vh / 2 - (first.y + first.frameH / 2) * 0.55,
        },
        activeAnimId: first.id,
      });
    }
    return payload.name;
  },
  ensureSheetCharacters: () => {
    const cat = get().artboards.find((b) => /cat/i.test(b.name) && /sheet/i.test(b.name));
    if (!cat) return { split: 0, detail: "no cat sheet" };
    const prefix = clipPrefixFromBoardName(cat.name);
    const have = get().animRegions.filter(
      (a) =>
        a.sourceBoardId === cat.id ||
        a.name.toLowerCase().startsWith(prefix.toLowerCase() + " ·"),
    );
    const detected = (() => {
      try {
        const comp = compositeLayers(cat.layers, cat.width, cat.height);
        return splitSheetBuffer(comp, cat.width, cat.height, { prefix, punchBg: true });
      } catch {
        return null;
      }
    })();
    const sizeOk =
      have.length >= 2 &&
      detected &&
      have.some(
        (a) => a.frameW === detected.grid.frameW && a.frameH === detected.grid.frameH,
      );
    if (sizeOk) {
      const idle = have.find((a) => a.stateName === "idle" || /idle/i.test(a.name));
      const walks = have.filter((a) => a.id !== idle?.id);
      try {
        void import("@/store/character-district").then(({ useCharacterDistrict }) => {
          useCharacterDistrict.getState().bindSplitClips({
            name: prefix,
            idleId: idle?.id ?? null,
            walkIds: walks.map((w) => w.id),
            origin: { x: cat.x + cat.width + 40, y: cat.y + cat.height + 24 },
          });
        });
      } catch {
        /* district optional */
      }
      return { split: have.length, detail: "already split" };
    }
    if (have.length) {
      set((s) => ({
        animRegions: s.animRegions.filter((a) => !have.some((h) => h.id === a.id)),
      }));
    }
    const ids = get().splitArtboardToClips(cat.id, {
      makeCharacter: true,
      punchBg: true,
      force: true,
    });
    return { split: ids.length, detail: ids.length ? "split + bound" : "detect failed" };
  },
  duplicateArtboard: (id) => {
    const board = get().artboards.find((b) => b.id === id);
    if (!board) return null;
    get().pushHistory();
    const layers = board.layers.map((l) => ({
      ...l,
      id: uid("layer"),
      data: cloneBuffer(l.data),
      rev: l.rev
    }));
    const copy = {
      ...board,
      id: uid("board"),
      name: `${board.name} copy`,
      x: board.x + 24,
      y: board.y + 24,
      layers,
      activeLayerId: layers[0]?.id ?? uid("layer")
    };
    set((s) => ({
      artboards: [...s.artboards, copy],
      activeArtboardId: copy.id,
      status: `Duplicated “${board.name}”`
    }));
    return copy.id;
  },
  applySnapshot: (snap) => {
    const questTrees = Array.isArray(snap.questTrees)
      ? snap.questTrees
      : get().questTrees;
    const destructibles = Array.isArray(snap.destructibles)
      ? snap.destructibles
      : get().destructibles;

    // Coerce pixel buffers — IDB can return plain arrays / wrong lengths
    const artboards = (Array.isArray(snap.artboards) ? snap.artboards : []).map((b: any) => {
      const w = b.width | 0;
      const h = b.height | 0;
      const layers = (b.layers || []).map((l: any) => ({
        ...l,
        data: coercePixelData(l.data, w, h),
        rev: typeof l.rev === "number" ? l.rev : 1,
      }));
      return { ...b, layers };
    });
    const animRegions = (Array.isArray(snap.animRegions) ? snap.animRegions : []).map((a: any) => ({
      ...a,
      frames: (a.frames || []).map((f: any) => ({
        ...f,
        data: coercePixelData(f.data, a.frameW | 0, a.frameH | 0),
      })),
    }));
    const parallaxStacks = (Array.isArray(snap.parallaxStacks) ? snap.parallaxStacks : []).map(
      (p: any) => ({
        ...p,
        layers: (p.layers || []).map((l: any) => ({
          ...l,
          data: coercePixelData(l.data, l.w | 0, l.h | 0),
        })),
      }),
    );

    set({
      meta: snap.meta ?? get().meta,
      camera: snap.camera ?? get().camera,
      artboards,
      animRegions,
      particles: snap.particles ?? [],
      actors: snap.actors ?? [],
      parallaxStacks,
      wireZones: (snap.wireZones ?? []).map((z: { trigger?: unknown }) => ({
        ...z,
        trigger: z.trigger ?? { kind: "none", armed: false },
      })),
      engineProject: snap.engineProject
        ? {
            ...(snap.engineProject as EngineProject),
            engine: coerceEngineId((snap.engineProject as EngineProject).engine),
          }
        : null,
      questTrees,
      destructibles,
      activeArtboardId: snap.activeArtboardId ?? artboards[0]?.id ?? null,
      activeAnimId: snap.activeAnimId ?? null,
      activeQuestTreeId:
        (snap.activeQuestTreeId as string | null | undefined) ??
        questTrees[0]?.id ??
        null,
      activeDestructibleId:
        (snap.activeDestructibleId as string | null | undefined) ??
        destructibles[0]?.id ??
        null,
      activeWireZoneId:
        (snap.activeWireZoneId as string | null | undefined) ??
        get().activeWireZoneId,
      activeParticleId:
        (snap.activeParticleId as string | null | undefined) ?? null,
      activeParallaxId:
        (snap.activeParallaxId as string | null | undefined) ?? null,
      color: typeof snap.color === "string" ? snap.color : get().color,
      brushSize: typeof snap.brushSize === "number" ? snap.brushSize : get().brushSize,
      history: [],
      future: [],
      status: `Restored autosave · ${new Date((snap as { savedAt?: number }).savedAt || Date.now()).toLocaleString()}`,
    });
  },
  newProject: () => {
    set({
      artboards: [],
      animRegions: [],
      particles: [],
      actors: [],
      parallaxStacks: [],
      activeParallaxId: null,
      wireZones: [],
      questTrees: [],
      activeQuestTreeId: null,
      destructibles: [],
      activeDestructibleId: null,
      engineProject: null,
      activeArtboardId: null,
      activeAnimId: null,
      activeParticleId: null,
      activeWireZoneId: null,
      selection: null,
      history: [],
      future: [],
      meta: {
        name: "Untitled Project",
        pixelMode: "16bit",
        gridSize: 16,
        showGrid: true
      },
      camera: {
        x: 80,
        y: 40,
        zoom: 0.45
      },
      status: "New project"
    });
    return get().seedDemo();
  },
  seedDemo: () => {
    const board = emptyArtboard(64, 64, 24, 24, "Scratch pad", "note");
    board.layers[0].rev = 1;
    const engine = createEngineProject({
      name: "PixelPlane Demo Game",
      engine: "pixelplane",
      rootFolderName: "pixelplane_demo",
      defaultCharacterSize: 48
    });
    const charRoot = engine.folders.find((f) => f.category === "characters");
    let entityId = null;
    let entityPath = null;
    if (charRoot) {
      const entity = createEntityFolder(charRoot, "Rat_Ninja", "characters", 48);
      const withPath = {
        ...entity,
        path: `${charRoot.path}/${entity.name}`,
        children: entity.children.map((c) => ({
          ...c,
          path: `${charRoot.path}/${entity.name}/${c.name}`,
          children: []
        }))
      };
      entityId = withPath.id;
      entityPath = withPath.path;
      charRoot.children = [...charRoot.children, withPath];
    }
    const animRoot = engine.folders.find((f) => f.category === "animations");
    const envRoot = engine.folders.find((f) => f.category === "environments");
    const charZone = {
      id: uid("wire"),
      name: "Characters feed",
      x: -80,
      y: -80,
      w: 1400,
      h: 720,
      category: "characters",
      folderId: entityId,
      folderPath: entityPath,
      color: WIRE_CATEGORY_META.characters.color,
      enabled: true
    };
    const animZone = {
      id: uid("wire"),
      name: "Anims feed",
      x: 1400,
      y: -80,
      w: 900,
      h: 720,
      category: "animations",
      folderId: animRoot?.id ?? null,
      folderPath: animRoot?.path ?? null,
      color: WIRE_CATEGORY_META.animations.color,
      enabled: true
    };
    const sceneZone = {
      id: uid("wire"),
      name: "Scene feed",
      x: -80,
      y: 720,
      w: 1400,
      h: 900,
      category: "environments",
      folderId: envRoot?.id ?? null,
      folderPath: envRoot?.path ?? null,
      color: WIRE_CATEGORY_META.environments.color,
      enabled: true
    };
    const openZone = {
      id: uid("wire"),
      name: "Open build field",
      x: 1400,
      y: 720,
      w: 1600,
      h: 1200,
      category: "scenes",
      folderId: null,
      folderPath: null,
      color: WIRE_CATEGORY_META.scenes.color,
      enabled: true
    };
    const questRoot = engine.folders.find((f) => f.category === "quests");
    const questTree = createStarterQuestTree({
      x: 1480,
      y: 780,
      name: "Street Heat — first night",
      color: WIRE_CATEGORY_META.quests.color
    });
    questTree.nodes = questTree.nodes.map((n) => {
      if (n.kind === "objective") return {
        ...n,
        title: "Smash the alley crates",
        body: "Break 5 street props · links to destructibles"
      };
      if (n.kind === "start") return {
        ...n,
        title: "Call from the crew",
        body: "Meet at the neon alley"
      };
      return n;
    });
    const questZone = {
      id: uid("wire"),
      name: "Quest lines",
      x: 1450,
      y: 750,
      w: 480,
      h: 480,
      category: "quests",
      folderId: questRoot?.id ?? null,
      folderPath: questRoot?.path ?? null,
      color: WIRE_CATEGORY_META.quests.color,
      enabled: true,
      questTreeId: questTree.id
    };
    questTree.wireZoneId = questZone.id;
    const destRoot = engine.folders.find((f) => f.category === "destructibles");
    // Sit smashables to the RIGHT of Neon Alley (alley ~x:40–460, y:820) so labels don't pile on the art
    const dests = [
      createDestructibleProp({ x: 500, y: 840, kind: "crate" }),
      createDestructibleProp({ x: 560, y: 845, kind: "crate" }),
      createDestructibleProp({ x: 620, y: 835, kind: "barrel" }),
      createDestructibleProp({ x: 680, y: 850, kind: "pot" }),
      createDestructibleProp({ x: 520, y: 910, kind: "sign" }),
      createDestructibleProp({ x: 590, y: 915, kind: "barrel" }),
      createDestructibleProp({ x: 660, y: 920, kind: "crate" }),
    ];
    const destZone = {
      id: uid("wire"),
      name: "Smashables alley",
      x: 480,
      y: 800,
      w: 300,
      h: 220,
      category: "destructibles",
      folderId: destRoot?.id ?? null,
      folderPath: destRoot?.path ?? null,
      color: WIRE_CATEGORY_META.destructibles.color,
      enabled: true
    };
    set({
      artboards: [board],
      animRegions: [],
      actors: [],
      parallaxStacks: [],
      activeParallaxId: null,
      particles: [],
      engineProject: engine,
      wireZones: [
      charZone,
      animZone,
      sceneZone,
      openZone,
      questZone,
      destZone
    ],
      questTrees: [questTree],
      activeQuestTreeId: questTree.id,
      destructibles: dests,
      activeDestructibleId: dests[0]?.id ?? null,
      activeArtboardId: board.id,
      activeAnimId: null,
      activeWireZoneId: charZone.id,
      showWirePalette: true,
      camera: {
        x: 120,
        y: 80,
        zoom: 0.38
      },
      meta: {
        name: "PixelPlane Demo Game",
        pixelMode: "16bit",
        gridSize: 16,
        showGrid: true
      },
      status: "Demo plane · quest tree + smash alley ready · City Engine: F smash / E doors"
    });
    return hydrateStarterDemo(get, set);
  },

  repairPlaneFoundations: () => {
    const s = get();
    const patches: Partial<StudioState> = {};
    const notes: string[] = [];
    let dests = s.destructibles;
    let quests = s.questTrees;
    let zones = s.wireZones;
    let engine = s.engineProject;

    // Ensure engine project exists so wire folders resolve
    if (!engine) {
      engine = createEngineProject({
        name: "PixelPlane Demo Game",
        engine: "pixelplane",
        rootFolderName: "pixelplane_demo",
        defaultCharacterSize: 48,
      });
      patches.engineProject = engine;
      notes.push("engine project");
    }

    if (!dests.length) {
      dests = [
        createDestructibleProp({ x: 500, y: 840, kind: "crate" }),
        createDestructibleProp({ x: 560, y: 845, kind: "crate" }),
        createDestructibleProp({ x: 620, y: 835, kind: "barrel" }),
        createDestructibleProp({ x: 680, y: 850, kind: "pot" }),
        createDestructibleProp({ x: 520, y: 910, kind: "sign" }),
        createDestructibleProp({ x: 590, y: 915, kind: "barrel" }),
        createDestructibleProp({ x: 660, y: 920, kind: "crate" }),
      ];
      patches.destructibles = dests;
      patches.activeDestructibleId = dests[0]!.id;
      notes.push(`${dests.length} smashables`);
    } else {
      // migrate old on-top-of-alley positions (x < 450, y > 850) off the Neon Alley art
      const overlapping = dests.filter((d) => d.x < 450 && d.y > 780);
      if (overlapping.length >= Math.min(3, dests.length)) {
        const layout = [
          { x: 500, y: 840 },
          { x: 560, y: 845 },
          { x: 620, y: 835 },
          { x: 680, y: 850 },
          { x: 520, y: 910 },
          { x: 590, y: 915 },
          { x: 660, y: 920 },
        ];
        dests = dests.map((d, i) => {
          const p = layout[i % layout.length]!;
          return { ...d, x: p.x, y: p.y };
        });
        patches.destructibles = dests;
        notes.push("relocated smashables off Neon Alley");
      }
    }

    if (!quests.length) {
      const questRoot = engine.folders.find((f) => f.category === "quests");
      const questTree = createStarterQuestTree({
        x: 1480,
        y: 780,
        name: "Street Heat — first night",
        color: WIRE_CATEGORY_META.quests.color,
      });
      questTree.nodes = questTree.nodes.map((n) => {
        if (n.kind === "objective")
          return {
            ...n,
            title: "Smash the alley crates",
            body: "Break 5 street props · links to destructibles",
          };
        if (n.kind === "start")
          return {
            ...n,
            title: "Call from the crew",
            body: "Meet at the neon alley",
          };
        return n;
      });
      quests = [questTree];
      patches.questTrees = quests;
      patches.activeQuestTreeId = questTree.id;
      notes.push("Street Heat quest");

      // wire zone for quests if missing
      if (!zones.some((z) => z.category === "quests" || /quest/i.test(z.name))) {
        const questZone: WireZone = {
          id: uid("wire"),
          name: "Quest lines",
          x: 1450,
          y: 750,
          w: 480,
          h: 480,
          category: "quests",
          folderId: questRoot?.id ?? null,
          folderPath: questRoot?.path ?? null,
          color: WIRE_CATEGORY_META.quests.color,
          enabled: true,
          questTreeId: questTree.id,
        };
        questTree.wireZoneId = questZone.id;
        zones = [...zones, questZone];
        patches.wireZones = zones;
        notes.push("quest feed plane");
      } else {
        // link first quest zone
        zones = zones.map((z) =>
          z.category === "quests" || /quest/i.test(z.name)
            ? { ...z, questTreeId: questTree.id }
            : z,
        );
        questTree.wireZoneId =
          zones.find((z) => z.category === "quests" || /quest/i.test(z.name))?.id ??
          null;
        patches.wireZones = zones;
      }
    }

    // smashables alley zone if missing or still on top of neon alley
    const smashZone = zones.find(
      (z) => z.category === "destructibles" || /smash/i.test(z.name),
    );
    if (!smashZone) {
      const destRoot = engine.folders.find((f) => f.category === "destructibles");
      const destZone: WireZone = {
        id: uid("wire"),
        name: "Smashables alley",
        x: 480,
        y: 800,
        w: 300,
        h: 220,
        category: "destructibles",
        folderId: destRoot?.id ?? null,
        folderPath: destRoot?.path ?? null,
        color: WIRE_CATEGORY_META.destructibles.color,
        enabled: true,
      };
      zones = [...zones, destZone];
      patches.wireZones = zones;
      notes.push("smashables alley plane");
    } else if (smashZone.x < 400) {
      zones = zones.map((z) =>
        z.id === smashZone.id
          ? { ...z, x: 480, y: 800, w: 300, h: 220 }
          : z,
      );
      patches.wireZones = zones;
      notes.push("shifted smash zone off Neon Alley");
    }

    if (!notes.length) {
      set({ status: "Plane foundations already intact" });
      return { repaired: false, detail: "nothing missing" };
    }

    set({
      ...patches,
      status: `Repaired plane · ${notes.join(" · ")}`,
    });
    return { repaired: true, detail: notes.join(", ") };
  },

  focusSmashAlley: () => {
    const s = get();
    const zone =
      s.wireZones.find((z) => z.category === "destructibles" || /smash/i.test(z.name)) ??
      null;
    const d = s.destructibles[0];
    const cx = zone ? zone.x + zone.w / 2 : d ? d.x + d.w / 2 : 630;
    const cy = zone ? zone.y + zone.h / 2 : d ? d.y + d.h / 2 : 900;
    const zoom = 0.9;
    const vw = typeof window !== "undefined" ? Math.max(640, window.innerWidth - 360) : 900;
    const vh = typeof window !== "undefined" ? Math.max(400, window.innerHeight - 140) : 700;
    set({
      camera: {
        zoom,
        x: vw / 2 - cx * zoom,
        y: vh / 2 - cy * zoom,
      },
      activeDestructibleId: d?.id ?? s.activeDestructibleId,
      activeWireZoneId: zone?.id ?? s.activeWireZoneId,
      status: `Framed Smashables alley · ${s.destructibles.length} props`,
    });
  },

  focusDemoHome: () => {
    // Frame characters + neon alley + smash + open field (parallax BGs + quest)
    const zoom = 0.28;
    const cx = 900;
    const cy = 700;
    const vw = typeof window !== "undefined" ? Math.max(640, window.innerWidth - 360) : 900;
    const vh = typeof window !== "undefined" ? Math.max(400, window.innerHeight - 140) : 700;
    set({
      camera: {
        zoom,
        x: vw / 2 - cx * zoom,
        y: vh / 2 - cy * zoom,
      },
      status: "Demo home · Characters · Neon Alley · Smash · Parallax BGs · Quest",
    });
  },

  hardResetDemo: async () => {
    set({ status: "Hard reset · wiping browser save + reseeding factory demo…" });
    try {
      const { clearSnapshot } = await import("@/lib/pixel/persist");
      await clearSnapshot();
    } catch {
      /* still reseed */
    }
    try {
      const { clearPlaneBlitCaches } = await import("@/components/studio/CanvasWorkspace");
      clearPlaneBlitCaches();
    } catch {
      /* */
    }
    // newProject → seedDemo → hydrateStarterDemo (await full pixel load)
    await Promise.resolve(get().newProject());
    // give paint a tick, then ensure foundations + non-hollow art
    await new Promise((r) => setTimeout(r, 50));
    get().repairPlaneFoundations();
    const reh = await get().rehydrateStarterArt();
    get().focusDemoHome();
    try {
      const { saveSnapshot, pickSnapshot } = await import("@/lib/pixel/persist");
      await saveSnapshot(pickSnapshot(get()));
    } catch {
      /* */
    }
    const s = get();
    const hollow = s.artboards.filter((b) => {
      const L = b.layers?.[0];
      return !L || isBufferHollow(L.data, b.width, b.height);
    }).length;
    set({
      status: `Factory demo restored · ${s.artboards.length} boards (${hollow} hollow) · ${s.destructibles.length} smash · ${s.parallaxStacks[0]?.layers?.length || 0} px layers · reloaded ${reh.fixed}`,
    });
  },

  rehydrateStarterArt: async () => {
    const { loadImageAsBuffer } = await import("@/lib/starter-pack");
    const catalog: { name: string; src: string; max: number; bg?: boolean }[] = [
      { name: "Rat Ninja Front", src: "/starter-pack/characters/rat_ninja_front_idle.jpg", max: 128, bg: true },
      { name: "Rat Ninja Back", src: "/starter-pack/characters/rat_ninja_back_idle.jpg", max: 128, bg: true },
      { name: "Rat Ninja Attack", src: "/starter-pack/characters/rat_ninja_attack.png", max: 140, bg: true },
      { name: "Face Right", src: "/starter-pack/characters/rat_ninja_face_right.png", max: 80, bg: true },
      { name: "Face Left", src: "/starter-pack/characters/rat_ninja_face_left.png", max: 80, bg: true },
      { name: "Step Forward", src: "/starter-pack/characters/rat_ninja_step.jpg", max: 120, bg: true },
      { name: "Neon Alley", src: "/starter-pack/environments/neon_alley.jpg", max: 420 },
      { name: "Cat Sheet", src: "/starter-pack/sheets/cat_sprite_sheet.png", max: 512 },
      { name: "zeRo.exe", src: "/starter-pack/characters/zero_exe_idle.jpg", max: 120, bg: true },
      { name: "BG · Far City", src: "/starter-pack/environments/parallax_far_city.jpg", max: 360 },
      { name: "BG · Mid Skyline", src: "/starter-pack/environments/parallax_mid_skyline.jpg", max: 360 },
      { name: "BG · Near Rooftop", src: "/starter-pack/environments/parallax_near_rooftop.jpg", max: 360 },
      { name: "Rainy City", src: "/starter-pack/environments/rainy_city.jpg", max: 420 },
    ];
    let fixed = 0;
    const s0 = get();
    let boards = [...s0.artboards];
    let stacks = s0.parallaxStacks.map((p) => ({
      ...p,
      layers: p.layers.map((l) => ({ ...l })),
    }));

    for (const item of catalog) {
      let board = boards.find((b) => b.name === item.name);
      const needs =
        !board ||
        !board.layers?.[0] ||
        isBufferHollow(board.layers[0].data, board.width, board.height) ||
        (item.name === "Cat Sheet" && (board.width !== 256 || board.height !== 320));
      if (!needs && board) {
        // still refresh parallax layer link/data for BG boards
        if (item.name.startsWith("BG ·")) {
          const layerName = item.name.replace(/^BG · /, "");
          stacks = stacks.map((p) => ({
            ...p,
            layers: p.layers.map((L) =>
              L.name === layerName || (L as { artboardId?: string }).artboardId === board!.id
                ? {
                    ...L,
                    artboardId: board!.id,
                    data: board!.layers[0]!.data,
                    w: board!.width,
                    h: board!.height,
                    rev: (board!.layers[0]!.rev || 1) + 1,
                  }
                : L,
            ),
          }));
        }
        continue;
      }
      try {
        let { data, w, h } = await loadImageAsBuffer(item.src, item.max);
        if (item.bg) data = removeBackground(data, w, h);
        if (isBufferHollow(data, w, h)) continue;
        if (board) {
          const layer = {
            ...board.layers[0]!,
            data,
            rev: (board.layers[0]!.rev || 0) + 1,
          };
          board = {
            ...board,
            width: w,
            height: h,
            layers: [layer],
            activeLayerId: layer.id,
          };
          boards = boards.map((b) => (b.id === board!.id ? board! : b));
        } else {
          const layer = emptyLayer(w, h, "Base");
          layer.data = data;
          layer.rev = 1;
          // place new boards in sensible zones
          const pos =
            item.name === "Neon Alley"
              ? { x: 40, y: 820 }
              : item.name === "Rainy City"
                ? { x: 40, y: 1120 }
                : item.name === "Cat Sheet"
                  ? { x: 1480, y: 40 }
                  : item.name.startsWith("BG ·")
                    ? {
                        x: 1550,
                        y:
                          40 +
                          ["Far City", "Mid Skyline", "Near Rooftop"].indexOf(
                            item.name.replace("BG · ", ""),
                          ) *
                            260,
                      }
                    : { x: 40, y: 40 };
          board = emptyArtboard(
            w,
            h,
            pos.x,
            pos.y,
            item.name,
            item.name.includes("City") || item.name.includes("Alley") || item.name.startsWith("BG")
              ? "scene"
              : "sheet",
          );
          board.layers = [layer];
          board.activeLayerId = layer.id;
          boards = [...boards, board];
        }
        fixed++;
        if (item.name.startsWith("BG ·") && board) {
          const layerName = item.name.replace(/^BG · /, "");
          stacks = stacks.map((p) => ({
            ...p,
            layers: p.layers.map((L) =>
              L.name === layerName
                ? {
                    ...L,
                    artboardId: board!.id,
                    data: board!.layers[0]!.data,
                    w: board!.width,
                    h: board!.height,
                    rev: board!.layers[0]!.rev,
                  }
                : L,
            ),
          }));
          // if stack has no matching layer, append
          stacks = stacks.map((p) => {
            if (p.layers.some((L) => L.name === layerName)) return p;
            return {
              ...p,
              layers: [
                ...p.layers,
                {
                  id: uid("pxl"),
                  name: layerName,
                  artboardId: board!.id,
                  depth: layerName.includes("Far")
                    ? 0.15
                    : layerName.includes("Mid")
                      ? 0.45
                      : 0.85,
                  speedX: 0.5,
                  speedY: 0.3,
                  scrollScaleX: layerName.includes("Far")
                    ? 0.15
                    : layerName.includes("Mid")
                      ? 0.45
                      : 0.85,
                  scrollScaleY: 0.2,
                  data: board!.layers[0]!.data,
                  w: board!.width,
                  h: board!.height,
                  rev: 1,
                  visible: true,
                },
              ],
            };
          });
        }
      } catch {
        /* skip */
      }
    }

    // ensure at least one parallax stack exists with linked layers
    if (!stacks.length || !stacks[0]!.layers.length) {
      const bgBoards = boards.filter((b) => b.name.startsWith("BG ·"));
      if (bgBoards.length) {
        stacks = [
          {
            id: uid("px"),
            name: "Rain City Parallax",
            x: 1500,
            y: 1280,
            viewW: 480,
            viewH: 280,
            mode: "viewport" as const,
            layers: bgBoards.map((b, i) => ({
              id: uid("pxl"),
              name: b.name.replace("BG · ", ""),
              artboardId: b.id,
              depth: [0.15, 0.45, 0.85][i] ?? 0.5,
              speedX: 0.5,
              speedY: 0.3,
              scrollScaleX: [0.15, 0.45, 0.85][i] ?? 0.5,
              scrollScaleY: 0.2,
              data: b.layers[0]!.data,
              w: b.width,
              h: b.height,
              rev: b.layers[0]!.rev,
              visible: true,
            })),
            playing: true,
            autoPreview: true,
            previewCamX: 0,
            previewCamY: 0,
            folderId: null,
            folderPath: null,
          },
        ];
      }
    } else {
      // reposition viewport out from under quest graph
      stacks = stacks.map((p, i) =>
        i === 0 ? { ...p, x: 1500, y: 1280, viewW: Math.max(p.viewW, 480), viewH: Math.max(p.viewH, 280) } : p,
      );
    }

    try {
      const { clearPlaneBlitCaches } = await import("@/components/studio/CanvasWorkspace");
      clearPlaneBlitCaches();
    } catch {
      /* */
    }

    set({
      artboards: boards,
      parallaxStacks: stacks,
      activeParallaxId: stacks[0]?.id ?? get().activeParallaxId,
      status: `Starter art · fixed ${fixed}/${catalog.length} · ${stacks[0]?.layers?.length || 0} parallax layers live`,
    });
    try {
      const cat = get().ensureSheetCharacters();
      if (cat.split) {
        set({
          status: `Starter art · fixed ${fixed}/${catalog.length} · cat ${cat.detail}`,
        });
      }
    } catch {
      /* */
    }
    return { fixed, total: catalog.length };
  },
}));
async function hydrateStarterDemo(get: () => StudioState, set: any) {
  try {
    const { loadImageAsBuffer } = await import("@/lib/starter-pack");
    const loads = [
    {
      src: "/starter-pack/characters/rat_ninja_front_idle.jpg",
      name: "Rat Ninja Front",
      x: 40,
      y: 40,
      max: 128,
      kind: "sheet",
      bg: true
    },
    {
      src: "/starter-pack/characters/rat_ninja_back_idle.jpg",
      name: "Rat Ninja Back",
      x: 220,
      y: 40,
      max: 128,
      kind: "sheet",
      bg: true
    },
    {
      src: "/starter-pack/characters/rat_ninja_attack.png",
      name: "Rat Ninja Attack",
      x: 400,
      y: 32,
      max: 140,
      kind: "sheet",
      bg: true
    },
    {
      src: "/starter-pack/characters/rat_ninja_face_right.png",
      name: "Face Right",
      x: 600,
      y: 48,
      max: 80,
      kind: "sheet",
      bg: true
    },
    {
      src: "/starter-pack/characters/rat_ninja_face_left.png",
      name: "Face Left",
      x: 720,
      y: 48,
      max: 80,
      kind: "sheet",
      bg: true
    },
    {
      src: "/starter-pack/characters/rat_ninja_step.jpg",
      name: "Step Forward",
      x: 40,
      y: 240,
      max: 120,
      kind: "sheet",
      bg: true
    },
    {
      src: "/starter-pack/environments/neon_alley.jpg",
      name: "Neon Alley",
      x: 40,
      y: 820,
      max: 420,
      kind: "scene",
      bg: false
    },
    {
      src: "/starter-pack/sheets/cat_sprite_sheet.png",
      name: "Cat Sheet",
      x: 1480,
      y: 40,
      max: 512,
      kind: "sheet",
      bg: false
    },
    {
      src: "/starter-pack/characters/zero_exe_idle.jpg",
      name: "zeRo.exe",
      x: 900,
      y: 240,
      max: 120,
      kind: "sheet",
      bg: true
    },
    {
      src: "/starter-pack/environments/rainy_city.jpg",
      name: "Rainy City",
      x: 40,
      y: 1120,
      max: 420,
      kind: "scene",
      bg: false
    }
  ];
    const boards = [];
    const anims = [];
    for (const item of loads) try {
      let { data, w, h } = await loadImageAsBuffer(item.src, item.max);
      if (item.bg) data = removeBackground(data, w, h);
      const layer = emptyLayer(w, h, "Base");
      layer.data = data;
      layer.rev = 1;
      const b = emptyArtboard(w, h, item.x, item.y, item.name, item.kind === "scene" ? "scene" : "sheet");
      b.layers = [layer];
      b.activeLayerId = layer.id;
      boards.push(b);
    } catch {}
    const front = boards.find((b) => b.name === "Rat Ninja Front");
    const step = boards.find((b) => b.name === "Step Forward");
    if (front && step) {
      const fw = Math.min(front.width, step.width, 96);
      const fh = Math.min(front.height, step.height, 96);
      const frames = [];
      for (const b of [
      front,
      step,
      front,
      step
    ]) {
        const comp = compositeLayers(b.layers, b.width, b.height);
        const frameData = createBuffer(fw, fh);
        const copyW = Math.min(fw, b.width);
        const copyH = Math.min(fh, b.height);
        const ox = Math.max(0, Math.floor((b.width - copyW) / 2));
        const oy = Math.max(0, Math.floor((b.height - copyH) / 2));
        for (let y = 0; y < copyH; y++) for (let x = 0; x < copyW; x++) {
          const si = ((y + oy) * b.width + (x + ox)) * 4;
          const di = (y * fw + x) * 4;
          frameData[di] = comp[si];
          frameData[di + 1] = comp[si + 1];
          frameData[di + 2] = comp[si + 2];
          frameData[di + 3] = comp[si + 3];
        }
        frames.push({
          id: uid("frame"),
          data: frameData
        });
      }
      anims.push({
        id: uid("anim"),
        name: "Rat Walk Preview",
        x: 860,
        y: 280,
        frameW: fw,
        frameH: fh,
        frames,
        fps: 6,
        playing: true,
        currentFrame: 0,
        onionSkin: false
      });
    }
    const pxLayers = [
    {
      src: "/starter-pack/environments/parallax_far_city.jpg",
      name: "Far City",
      depth: 0.15,
      max: 360
    },
    {
      src: "/starter-pack/environments/parallax_mid_skyline.jpg",
      name: "Mid Skyline",
      depth: 0.45,
      max: 360
    },
    {
      src: "/starter-pack/environments/parallax_near_rooftop.jpg",
      name: "Near Rooftop",
      depth: 0.85,
      max: 360
    }
  ];
    const pLayers = [];
    // Open build field — stack parallax BGs where the user can actually see them
    let px = 1550;
    let py = 40;
    for (const pl of pxLayers) try {
      const { data, w, h } = await loadImageAsBuffer(pl.src, pl.max);
      const layer = emptyLayer(w, h, "Base");
      layer.data = cloneBuffer(data);
      layer.rev = 1;
      const b = emptyArtboard(w, h, px, py, `BG · ${pl.name}`, "scene");
      b.layers = [layer];
      b.activeLayerId = layer.id;
      boards.push(b);
      pLayers.push({
        id: uid("pxl"),
        name: pl.name,
        artboardId: b.id,
        depth: pl.depth,
        speedX: pl.depth,
        speedY: pl.depth * 0.6,
        scrollScaleX: pl.depth,
        scrollScaleY: pl.depth * 0.6,
        offsetX: 0,
        offsetY: 0,
        repeatX: true,
        repeatY: false,
        autoscrollX: 0,
        autoscrollY: 0,
        zIndex: pLayers.length,
        data: cloneBuffer(data),
        w,
        h,
        rev: 1,
        visible: true,
      });
      py += h + 16;
    } catch {}
    const stacks = [];
    if (pLayers.length) {
      const viewW = Math.min(...pLayers.map((l) => l.w));
      const viewH = Math.min(...pLayers.map((l) => l.h));
      stacks.push({
        id: uid("px"),
        name: "Rain City Parallax",
        // below quest graph so both read clearly
        x: 1500,
        y: 1280,
        viewW: Math.min(520, Math.max(420, viewW)),
        viewH: Math.min(300, Math.max(240, viewH)),
        mode: "viewport",
        layers: pLayers,
        playing: true,
        autoPreview: true,
        previewCamX: 0,
        previewCamY: 0,
        folderId: null,
        folderPath: null
      });
    }
    set({
      artboards: boards.length ? boards : get().artboards,
      animRegions: anims,
      actors: [],
      parallaxStacks: stacks,
      activeParallaxId: stacks[0]?.id ?? null,
      particles: [{
        id: uid("fx"),
        name: "Magic FX",
        x: 1100,
        y: 280,
        w: 48,
        h: 48,
        kind: "magic",
        rate: 12,
        life: 1,
        color: "#3ecfcf",
        playing: true
      }],
      activeArtboardId: front?.id ?? boards[0]?.id ?? null,
      activeAnimId: anims[0]?.id ?? null,
      camera: {
        x: 160,
        y: 100,
        zoom: 0.32
      },
      status: `Huge plane · ${boards.length} assets · ${pLayers.length} parallax layers · scroll-wheel zoom 2%–6400%`
    });
    try {
      get().ensureSheetCharacters();
    } catch {
      /* split is best-effort on first seed */
    }
  } catch {
    set({ status: "Demo ready — open Pack to drop free-use art" });
  }
}
export function particleFrame(p: any, tick: number) {
  const size = Math.max(p.w, p.h);
  const total = 12;
  const frame = p.playing ? tick % total : 0;
  const [r, g, b] = hexToRgba(p.color);
  return {
    data: generateParticlePreview(p.kind, size, [
    r,
    g,
    b
  ], frame, total),
    w: size,
    h: size
  };
}
