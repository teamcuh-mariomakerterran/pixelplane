/**
 * Character District store — spatial anim pipeline (Gemini blueprint).
 * Slices: hitbox · composite · bake · audio · springs · debug pulse
 */

import { create } from "zustand";
import {
  createCharacterDistrict,
  resolveStateBindings,
  districtToStateMachine,
  padWorld,
  zoneWorld,
} from "@/lib/character-district/layout";
import type {
  CharacterDistrict,
  CollisionBox,
  CollisionBoxKind,
} from "@/lib/character-district/types";
import { COLLISION_COLORS } from "@/lib/character-district/types";
import {
  applyBoxesToAllFrames,
  ghostBoxesForFrame,
  propagateToNextFrame,
} from "@/lib/character-district/hitbox";
import {
  DEFAULT_GRAVITY_RADIUS,
  findCompositeLinks,
  buildComposeExport,
  type BakeMode,
} from "@/lib/character-district/compose";
import {
  createAudioAnchor,
  type AudioAnchor,
} from "@/lib/character-district/audio-anchors";
import {
  createSpring,
  simulateSpringOffsets,
  type SpringNode,
} from "@/lib/character-district/springs";
import {
  inferStateFromEngine,
  pushPulse,
  type RuntimePulse,
} from "@/lib/character-district/debug-pulse";
import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";

type HitboxDraft = {
  animId: string;
  frameIndex: number;
  kind: CollisionBoxKind;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type DistrictStore = {
  districts: CharacterDistrict[];
  activeId: string | null;
  showPanel: boolean;
  collisionTool: CollisionBoxKind | null;
  hitboxDraft: HitboxDraft | null;
  showOnionGhosts: boolean;
  gravityRadius: number;
  bakeMode: BakeMode;
  showGravityRings: boolean;

  setShowPanel: (v: boolean) => void;
  spawnDistrict: (name?: string) => string;
  selectDistrict: (id: string | null) => void;
  rebindStates: () => void;
  addTransition: (fromPadId: string, toPadId: string, condition: string) => void;
  setTransitionCondition: (id: string, condition: string) => void;
  manualBindAnim: (padId: string, animId: string) => void;
  addCollision: (
    animId: string,
    frameIndex: number,
    kind: CollisionBoxKind,
    box: { x: number; y: number; w: number; h: number },
  ) => void;
  beginHitboxDraw: (animId: string, frameIndex: number, lx: number, ly: number) => void;
  updateHitboxDraw: (lx: number, ly: number) => void;
  commitHitboxDraw: () => void;
  cancelHitboxDraw: () => void;
  applyHitboxesToAllFrames: (animId: string, kind?: CollisionBoxKind) => void;
  propagateHitboxNext: (animId: string, frameIndex: number) => void;
  setChassis: (artboardId: string | null) => void;
  setGravityRadius: (r: number) => void;
  setBakeMode: (m: BakeMode) => void;
  setShowOnionGhosts: (v: boolean) => void;
  setShowGravityRings: (v: boolean) => void;
  exportActiveMachine: () => string | null;
  exportComposePack: () => void;
  setCollisionTool: (k: CollisionBoxKind | null) => void;
  ghostsFor: (animId: string, frameIndex: number) => CollisionBox[];
  // D_Audio / D_Spring / D_Debug
  addAudioOnActiveFrame: (name?: string) => void;
  removeAudio: (id: string) => void;
  addSpring: (opts?: { name?: string; stiffness?: number; damping?: number }) => void;
  updateSpring: (id: string, patch: Partial<SpringNode>) => void;
  removeSpring: (id: string) => void;
  simSpringPreview: (id: string) => void;
  runtimePulse: RuntimePulse | null;
  reportEngineState: (opts: {
    mode: "foot" | "drive";
    speed: number;
    smashing?: boolean;
    indoor?: boolean;
    t: number;
  }) => void;
  clearPulse: () => void;
};

export const useCharacterDistrict = create<DistrictStore>((set, get) => ({
  districts: [],
  activeId: null,
  showPanel: false,
  collisionTool: null,
  hitboxDraft: null,
  showOnionGhosts: true,
  gravityRadius: DEFAULT_GRAVITY_RADIUS,
  bakeMode: "layered",
  showGravityRings: true,
  runtimePulse: null,

  setShowPanel: (showPanel) => set({ showPanel }),
  setCollisionTool: (collisionTool) => set({ collisionTool }),
  setShowOnionGhosts: (showOnionGhosts) => set({ showOnionGhosts }),
  setShowGravityRings: (showGravityRings) => set({ showGravityRings }),
  setGravityRadius: (gravityRadius) => set({ gravityRadius }),
  setBakeMode: (bakeMode) => set({ bakeMode }),

  spawnDistrict: (name) => {
    const cam = useStudio.getState().camera;
    const x = (-cam.x + 200) / (cam.zoom || 1);
    const y = (-cam.y + 100) / (cam.zoom || 1);
    const d = createCharacterDistrict({ name: name ?? "Character District", x, y });
    set((s) => ({
      districts: [...s.districts, d],
      activeId: d.id,
      showPanel: true,
    }));
    useStudio.getState().setCamera({
      x: -d.x * cam.zoom + 80,
      y: -d.y * cam.zoom + 60,
      zoom: Math.min(0.55, Math.max(0.25, cam.zoom)),
    });
    useStudio.getState().setStatus(`Character District “${d.name}” · 4 zones + state pads`);
    get().rebindStates();
    return d.id;
  },

  selectDistrict: (activeId) => set({ activeId }),

  rebindStates: () => {
    const anims = useStudio.getState().animRegions;
    set((s) => ({
      districts: s.districts.map((d) =>
        resolveStateBindings(
          d,
          anims.map((a) => ({
            id: a.id,
            x: a.x,
            y: a.y,
            frameW: a.frameW,
            frameH: a.frameH,
            name: a.name,
          })),
        ),
      ),
    }));
  },

  addTransition: (fromPadId, toPadId, condition) => {
    const id = get().activeId;
    if (!id) return;
    set((s) => ({
      districts: s.districts.map((d) =>
        d.id !== id
          ? d
          : {
              ...d,
              transitions: [
                ...d.transitions,
                { id: uid("stx"), fromPadId, toPadId, condition },
              ],
            },
      ),
    }));
  },

  setTransitionCondition: (tid, condition) => {
    set((s) => ({
      districts: s.districts.map((d) => ({
        ...d,
        transitions: d.transitions.map((t) =>
          t.id === tid ? { ...t, condition } : t,
        ),
      })),
    }));
  },

  manualBindAnim: (padId, animId) => {
    set((s) => ({
      districts: s.districts.map((d) => ({
        ...d,
        statePads: d.statePads.map((p) =>
          p.id === padId
            ? {
                ...p,
                manualAnimIds: [...new Set([...p.manualAnimIds, animId])],
              }
            : p,
        ),
      })),
    }));
    get().rebindStates();
  },

  addCollision: (animId, frameIndex, kind, box) => {
    const id = get().activeId;
    if (!id) return;
    const c: CollisionBox = {
      id: uid("col"),
      kind,
      frameIndex,
      ...box,
      eventTag: kind === "hit" ? "damage" : undefined,
    };
    set((s) => ({
      districts: s.districts.map((d) => {
        if (d.id !== id) return d;
        const list = d.collisions[animId] ?? [];
        return {
          ...d,
          collisions: { ...d.collisions, [animId]: [...list, c] },
        };
      }),
    }));
    useStudio.getState().setStatus(`Collision ${kind} · frame ${frameIndex}`);
    void COLLISION_COLORS;
  },

  beginHitboxDraw: (animId, frameIndex, lx, ly) => {
    const kind = get().collisionTool;
    if (!kind) return;
    set({
      hitboxDraft: {
        animId,
        frameIndex,
        kind,
        x0: lx,
        y0: ly,
        x1: lx,
        y1: ly,
      },
    });
  },

  updateHitboxDraw: (lx, ly) => {
    set((s) =>
      s.hitboxDraft
        ? { hitboxDraft: { ...s.hitboxDraft, x1: lx, y1: ly } }
        : {},
    );
  },

  commitHitboxDraw: () => {
    const d = get().hitboxDraft;
    if (!d) return;
    const x = Math.min(d.x0, d.x1);
    const y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0);
    const h = Math.abs(d.y1 - d.y0);
    set({ hitboxDraft: null });
    if (w < 2 || h < 2) return;
    get().addCollision(d.animId, d.frameIndex, d.kind, {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
    });
  },

  cancelHitboxDraw: () => set({ hitboxDraft: null }),

  applyHitboxesToAllFrames: (animId, kind) => {
    const id = get().activeId;
    if (!id) return;
    const anim = useStudio.getState().animRegions.find((a) => a.id === animId);
    if (!anim) return;
    set((s) => ({
      districts: s.districts.map((d) => {
        if (d.id !== id) return d;
        const boxes = d.collisions[animId] ?? [];
        return {
          ...d,
          collisions: {
            ...d.collisions,
            [animId]: applyBoxesToAllFrames(boxes, anim.frames.length, {
              kind,
              sourceFrame: anim.currentFrame ?? 0,
            }),
          },
        };
      }),
    }));
    useStudio.getState().setStatus(
      `Hitboxes applied to all ${anim.frames.length} frames${kind ? ` (${kind})` : ""}`,
    );
  },

  propagateHitboxNext: (animId, frameIndex) => {
    const id = get().activeId;
    if (!id) return;
    const anim = useStudio.getState().animRegions.find((a) => a.id === animId);
    if (!anim) return;
    set((s) => ({
      districts: s.districts.map((d) => {
        if (d.id !== id) return d;
        const boxes = d.collisions[animId] ?? [];
        return {
          ...d,
          collisions: {
            ...d.collisions,
            [animId]: propagateToNextFrame(boxes, frameIndex, anim.frames.length),
          },
        };
      }),
    }));
    useStudio.getState().setStatus(`Propagated boxes → frame ${frameIndex + 1}`);
  },

  setChassis: (artboardId) => {
    const id = get().activeId;
    if (!id) return;
    set((s) => ({
      districts: s.districts.map((d) =>
        d.id === id ? { ...d, chassisArtboardId: artboardId } : d,
      ),
    }));
    useStudio.getState().setStatus(
      artboardId ? "Chassis set · gravity ring active" : "Chassis cleared",
    );
  },

  ghostsFor: (animId, frameIndex) => {
    if (!get().showOnionGhosts) return [];
    const d = get().districts.find((x) => x.id === get().activeId);
    if (!d) return [];
    return ghostBoxesForFrame(d.collisions[animId] ?? [], frameIndex);
  },

  exportActiveMachine: () => {
    const d = get().districts.find((x) => x.id === get().activeId);
    if (!d) return null;
    const anims = useStudio.getState().animRegions.map((a) => ({
      id: a.id,
      name: a.name,
    }));
    const json = JSON.stringify(districtToStateMachine(d, anims), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${d.name.replace(/\s+/g, "_")}_state_machine.json`;
    a.click();
    return json;
  },

  exportComposePack: () => {
    const d = get().districts.find((x) => x.id === get().activeId);
    if (!d) {
      useStudio.getState().setStatus("No active district");
      return;
    }
    const boards = useStudio.getState().artboards;
    const pack = buildComposeExport(d, boards, get().bakeMode, get().gravityRadius);
    // download meta JSON + describe files (PNG via canvas)
    const files: { name: string; blob: Blob }[] = [
      {
        name: "compose_meta.json",
        blob: new Blob([JSON.stringify(pack.meta, null, 2)], {
          type: "application/json",
        }),
      },
    ];
    const toPng = (pixels: Uint8ClampedArray, w: number, h: number) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), w, h), 0, 0);
      return new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
    };
    void (async () => {
      if (pack.atlas) {
        files.push({
          name: "Character_Full_Atlas.png",
          blob: await toPng(pack.atlas.pixels, pack.atlas.width, pack.atlas.height),
        });
        files.push({
          name: "atlas_layout.json",
          blob: new Blob([JSON.stringify(pack.atlas.layout, null, 2)], {
            type: "application/json",
          }),
        });
      } else {
        for (const p of pack.pieces) {
          files.push({
            name: `${p.role}_${p.name}.png`,
            blob: await toPng(p.pixels, p.width, p.height),
          });
        }
      }
      // zip-lite: multi download
      for (const f of files) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(f.blob);
        a.download = f.name;
        a.click();
      }
      useStudio.getState().setStatus(
        `Compose export · ${get().bakeMode} · ${files.length} files (plane untouched)`,
      );
    })();
  },

  addAudioOnActiveFrame: (name) => {
    const id = get().activeId;
    if (!id) return;
    const animId = useStudio.getState().activeAnimId;
    if (!animId) {
      useStudio.getState().setStatus("Select an anim strip first");
      return;
    }
    const anim = useStudio.getState().animRegions.find((a) => a.id === animId);
    if (!anim) return;
    const fi = anim.currentFrame ?? 0;
    const anchor = createAudioAnchor({
      animId,
      frameIndex: fi,
      name: name ?? (fi % 2 === 0 ? "step_left" : "step_right"),
      planeX: anim.x + anim.frameW + 20,
      planeY: anim.y + fi * 14,
    });
    set((s) => ({
      districts: s.districts.map((d) =>
        d.id === id
          ? { ...d, audioAnchors: [...(d.audioAnchors ?? []), anchor] }
          : d,
      ),
    }));
    useStudio.getState().setStatus(`SFX “${anchor.name}” @ frame ${fi}`);
  },

  removeAudio: (aid) => {
    set((s) => ({
      districts: s.districts.map((d) => ({
        ...d,
        audioAnchors: (d.audioAnchors ?? []).filter((a) => a.id !== aid),
      })),
    }));
  },

  addSpring: (opts) => {
    const id = get().activeId;
    if (!id) return;
    const d = get().districts.find((x) => x.id === id);
    const anchor = d?.chassisArtboardId ?? "chassis";
    const spr = createSpring({
      name: opts?.name ?? "Hair / cape spring",
      anchorId: anchor,
      stiffness: opts?.stiffness,
      damping: opts?.damping,
    });
    set((s) => ({
      districts: s.districts.map((dist) =>
        dist.id === id
          ? { ...dist, springs: [...(dist.springs ?? []), spr] }
          : dist,
      ),
    }));
    useStudio
      .getState()
      .setStatus(`Spring “${spr.name}” · k=${spr.stiffness} d=${spr.damping}`);
  },

  updateSpring: (sid, patch) => {
    set((s) => ({
      districts: s.districts.map((d) => ({
        ...d,
        springs: (d.springs ?? []).map((sp) =>
          sp.id === sid ? { ...sp, ...patch } : sp,
        ),
      })),
    }));
  },

  removeSpring: (sid) => {
    set((s) => ({
      districts: s.districts.map((d) => ({
        ...d,
        springs: (d.springs ?? []).filter((sp) => sp.id !== sid),
      })),
    }));
  },

  simSpringPreview: (sid) => {
    const d = get().districts.find((x) => x.id === get().activeId);
    const spr = d?.springs?.find((s) => s.id === sid);
    if (!spr) return;
    const path = Array.from({ length: 16 }, (_, i) => ({
      x: i * 4,
      y: Math.sin(i * 0.6) * 2,
    }));
    const offs = simulateSpringOffsets(spr, path);
    const tip = offs[offs.length - 1];
    useStudio.getState().setStatus(
      `Spring sim · tip ${tip ? `${tip.x.toFixed(1)}, ${tip.y.toFixed(1)}` : "—"} · ${offs.length}f`,
    );
  },

  reportEngineState: (opts) => {
    const state = inferStateFromEngine(opts);
    const pulse: RuntimePulse = {
      state,
      intensity: opts.smashing ? 1 : opts.speed > 20 ? 0.85 : 0.6,
      t: opts.t,
      source: "city_engine",
    };
    set({ runtimePulse: pulse });
  },

  clearPulse: () => set({ runtimePulse: null }),
}));

export function hitStatePad(worldX: number, worldY: number) {
  const { districts } = useCharacterDistrict.getState();
  for (const d of districts) {
    for (const p of d.statePads) {
      const w = padWorld(d, p);
      if (
        worldX >= w.x &&
        worldY >= w.y &&
        worldX <= w.x + w.w &&
        worldY <= w.y + w.h
      ) {
        return { district: d, pad: p };
      }
    }
  }
  return null;
}

export { zoneWorld, findCompositeLinks, DEFAULT_GRAVITY_RADIUS };
