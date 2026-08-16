/**
 * Asset Vault — named catalog, doors, furnished copies, clipboard.
 * Metadata in localStorage. Pixels stay on artboards / sourceUrl.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { removeBackground } from "@/lib/pixel/bg-remove";
import { compositeLayers } from "@/lib/pixel/buffer";
import { stampTimeline } from "@/store/timeline";
import { playJuiceSfx, unlockAudio } from "@/lib/audio/juice";
import type {
  VaultAsset,
  VaultKind,
  DoorRect,
  RoomDef,
  FixtureDef,
  LightDef,
  ClipboardEntry,
  InteractMode,
  AssetPerspective,
} from "@/lib/vault/types";

const LS = "pixelplane_vault_v1";

type DrawMode = "idle" | "door" | "room";

type VaultState = {
  showPanel: boolean;
  tab: "library" | "inspect" | "built" | "clip";
  assets: VaultAsset[];
  selectedId: string | null;
  clip: ClipboardEntry[];
  drawMode: DrawMode;
  inspectFixtureId: string | null;

  setShowPanel: (v: boolean) => void;
  setTab: (t: VaultState["tab"]) => void;
  select: (id: string | null) => void;
  setDrawMode: (m: DrawMode) => void;
  inspectFixture: (id: string | null) => void;

  ingestActive: (kind: VaultKind, name?: string) => string | null;
  ingestPack: () => Promise<number>;
  dropToPlane: (id: string) => void;
  rename: (id: string, name: string) => void;
  setKind: (id: string, kind: VaultKind) => void;
  setPerspective: (id: string, p: AssetPerspective) => void;
  setEnterable: (id: string, v: boolean) => void;
  addDoor: (id: string, door: Omit<DoorRect, "id">) => void;
  removeDoor: (id: string, doorId: string) => void;
  addRoom: (id: string, room: Omit<RoomDef, "id">) => void;
  patchRoom: (id: string, roomId: string, p: Partial<RoomDef>) => void;
  removeRoom: (id: string, roomId: string) => void;
  addFixture: (id: string, f: Omit<FixtureDef, "id">) => string;
  patchFixture: (id: string, fid: string, p: Partial<FixtureDef>) => void;
  removeFixture: (id: string, fid: string) => void;
  addLight: (id: string, l: Omit<LightDef, "id">) => void;
  patchLight: (id: string, lid: string, p: Partial<LightDef>) => void;
  removeLight: (id: string, lid: string) => void;

  duplicateFurnished: (id: string) => string | null;
  openIndoorOnPlane: (id: string) => void;
  saveBuilt: (id: string, name?: string) => void;
  pinClip: (id: string) => void;
  unpinClip: (id: string) => void;
  clearClip: () => void;
  dropClipPlane: () => void;
};

function persist(assets: VaultAsset[], clip: ClipboardEntry[]) {
  try {
    localStorage.setItem(LS, JSON.stringify({ assets, clip }));
  } catch {
    /* */
  }
}

function migrateAsset(a: VaultAsset): VaultAsset {
  return {
    ...a,
    perspective: a.perspective ?? ("threequarter" as AssetPerspective),
    tags: a.tags ?? [],
    rooms: (a.rooms ?? []).map((r) => ({
      ...r,
      floor: typeof r.floor === "number" ? r.floor : r.downstairs ? -1 : 0,
      dark: !!r.dark,
      secret: !!r.secret,
      locked: !!r.locked,
      window: !!r.window,
    })),
    fixtures: (a.fixtures ?? []).map((f) => ({
      ...f,
      solid: f.solid ?? !!f.base,
    })),
    lights: (a.lights ?? []).map((l) => ({
      ...l,
      on: l.on !== false,
    })),
  };
}

function load(): { assets: VaultAsset[]; clip: ClipboardEntry[] } {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const j = JSON.parse(raw) as { assets?: VaultAsset[]; clip?: ClipboardEntry[] };
      if (j.assets?.length) {
        let assets = j.assets.map(migrateAsset);
        const demo = assets.find((a) => a.name === "Shithole House");
        const hasSleep = demo?.fixtures.some((f) => f.saves || f.mode === "sleep" || f.phone);
        const hasBedroom = demo?.rooms.some((r) => r.name === "Bedroom");
        if (demo && (!hasSleep || !hasBedroom)) {
          const seeded = seedAssets();
          const fresh = seeded.find((s) => s.name === "Shithole House")!;
          assets = assets.map((a) => (a.id === demo.id ? { ...fresh, id: demo.id } : a));
          for (const extra of seeded.filter((s) => s.name !== "Shithole House")) {
            if (!assets.some((a) => a.name === extra.name)) assets.push(extra);
          }
        } else {
          for (const extra of seedAssets()) {
            if (extra.name !== "Shithole House" && !assets.some((a) => a.name === extra.name)) {
              assets.push(extra);
            }
          }
        }
        return { assets, clip: j.clip ?? [] };
      }
    }
  } catch {
    /* */
  }
  return { assets: seedAssets(), clip: [] };
}

function seedAssets(): VaultAsset[] {
  const living = uid("room");
  const kitchen = uid("room");
  const basement = uid("room");
  const tv = uid("fix");
  const remote = uid("fix");
  const couch = uid("fix");
  const table = uid("fix");
  const mag = uid("fix");
  const fridge = uid("fix");
  const key = uid("fix");
  const phone = uid("fix");
  const stair = uid("fix");
  const win = uid("fix");
  const switcher = uid("fix");
  const pull = uid("fix");
  const stash = uid("fix");
  const kitLight = uid("lit");
  const baseLight = uid("lit");
  const leftover = uid("fix");
  const bed = uid("fix");
  const closet = uid("fix");
  const lampSw = uid("fix");
  const bedLight = uid("lit");
  const nRoom = uid("room");
  const nRadio = uid("fix");
  const bedroom = uid("room");
  return [
    {
      id: uid("vault"),
      name: "Shithole House",
      kind: "building",
      tags: ["demo", "apartment"],
      perspective: "topdown",
      w: 96,
      h: 80,
      enterable: true,
      doors: [{ id: uid("door"), nx: 0.38, ny: 0.78, nw: 0.24, nh: 0.18, label: "front", kind: "entry" }],
      rooms: [
        {
          id: living, name: "Living room", x: 0, y: 0, w: 168, h: 112,
          floor: 0, window: true, dark: false, ambient: "crt hum",
        },
        {
          id: kitchen, name: "Kitchen", x: 168, y: 0, w: 104, h: 112,
          floor: 0, dark: false, ambient: "fridge tick",
        },
        {
          id: basement, name: "Basement", x: 0, y: 112, w: 168, h: 96,
          downstairs: true, parentId: living, floor: -1, dark: true, locked: true,
          secret: true, keyId: "basement", ambient: "wet concrete",
        },
        {
          id: bedroom, name: "Bedroom", x: 168, y: 112, w: 104, h: 88,
          floor: 0, dark: false, window: true, ambient: "thin curtains",
        },
      ],
      fixtures: [
        {
          id: couch, name: "Sunken couch", roomId: living, x: 18, y: 58, w: 48, h: 22, z: 0,
          base: true, solid: true, interactable: true, mode: "sit", consume: false,
          dialog: "I don't have time to be sitting around.",
          destructible: false, color: "#6b5344", saves: true,
        },
        {
          id: table, name: "Coffee table", roomId: living, x: 28, y: 82, w: 36, h: 16, z: 0,
          base: true, solid: true, interactable: false, mode: "none", consume: false, dialog: "",
          destructible: true, destPreset: "crate", color: "#3f342c", crumbs: true,
        },
        {
          id: mag, name: "Sticky magazine", roomId: living, x: 36, y: 84, w: 14, h: 10, z: 1,
          base: false, interactable: true, mode: "pickup", consume: true,
          dialog: "Hey — something between the cushions.",
          pickupKind: "health", destructible: false, color: "#c45c6a", crumbs: true,
        },
        {
          id: tv, name: "Busted TV", roomId: living, x: 118, y: 18, w: 36, h: 28, z: 0,
          base: false, solid: true, interactable: true, mode: "dialog", consume: false,
          dialog: "oh man... looks like the afternoon news is on.. let's put something good on who watches this boring shit anyway?.. hey the channel isn't changing. ugh, go figure even the t.v. is busted in this shithole of a house. i should probably get back to what i was doing anyway.",
          destructible: true, color: "#1c1e28",
        },
        {
          id: remote, name: "TV remote", roomId: living, x: 44, y: 86, w: 10, h: 6, z: 2,
          base: false, interactable: true, mode: "switch", consume: false, dialog: "",
          linkId: tv, switchAction: "activate", destructible: false, color: "#2a2c36",
        },
        {
          id: phone, name: "Rotary phone", roomId: living, x: 96, y: 64, w: 14, h: 12, z: 1,
          base: false, interactable: true, mode: "dialog", consume: false,
          dialog: "Dead line. Then a click. Then a voice that already knows your name.",
          destructible: false, color: "#3a2a28", phone: true,
        },
        {
          id: win, name: "Street window", roomId: living, x: 72, y: 4, w: 28, h: 10, z: 0,
          base: false, interactable: true, mode: "window", consume: false,
          dialog: "", destructible: false, color: "#7ec8ff",
        },
        {
          id: stair, name: "Basement stairs", roomId: living, x: 6, y: 88, w: 22, h: 18, z: 0,
          base: false, solid: false, interactable: true, mode: "stair", consume: false,
          dialog: "The door sticks. Needs a key.",
          destructible: false, color: "#2a221c", stairTo: basement, locked: true, keyId: "basement",
        },
        {
          id: fridge, name: "Fridge", roomId: kitchen, x: 188, y: 20, w: 22, h: 40, z: 0,
          base: false, solid: true, interactable: true, mode: "switch", consume: false,
          dialog: "Warm beer and a light that died in '09.",
          switchAction: "activate", destructible: false, color: "#8a929c",
        },
        {
          id: leftover, name: "Warm leftover", roomId: kitchen, x: 214, y: 36, w: 10, h: 8, z: 2,
          base: false, interactable: true, mode: "pickup", consume: true,
          dialog: "Still edible if you don't think about it.",
          pickupKind: "health", destructible: false, color: "#c4784a", crumbs: true,
          hiddenUntil: fridge,
        },
        {
          id: uid("fix"), name: "Kitchen sink", roomId: kitchen, x: 232, y: 18, w: 28, h: 16, z: 0,
          base: true, solid: true, interactable: true, mode: "dialog", consume: false,
          dialog: "The tap coughs rust, then a thin thread of water.",
          destructible: false, color: "#6a7278",
        },
        {
          id: key, name: "Sticky key", roomId: kitchen, x: 220, y: 72, w: 10, h: 8, z: 1,
          base: false, interactable: true, mode: "pickup", consume: true,
          dialog: "Greasy. Tag says BASEMENT like that's a warning.",
          pickupKind: "key", isKey: true, keyId: "basement",
          destructible: false, color: "#e8a838",
        },
        {
          id: switcher, name: "Kitchen switch", roomId: kitchen, x: 176, y: 18, w: 8, h: 10, z: 1,
          base: false, interactable: true, mode: "switch", consume: false, dialog: "",
          switchAction: "light", linkId: kitLight, destructible: false, color: "#c4b89a",
        },
        {
          id: pull, name: "Pull-chain", roomId: basement, x: 18, y: 124, w: 8, h: 12, z: 1,
          base: false, interactable: true, mode: "switch", consume: false, dialog: "",
          switchAction: "light", linkId: baseLight, destructible: false, color: "#d8c8a0",
        },
        {
          id: stash, name: "Locked crate", roomId: basement, x: 110, y: 150, w: 28, h: 20, z: 0,
          base: true, solid: true, interactable: true, mode: "dialog", consume: false,
          dialog: "Old Polaroids. You in a house that looks like this one, before it got like this.",
          destructible: true, crumbs: true, color: "#5a4638",
        },
        {
          id: bed, name: "Sunken mattress", roomId: bedroom, x: 176, y: 132, w: 52, h: 32, z: 0,
          base: true, solid: true, interactable: true, mode: "sleep", consume: false,
          dialog: "Sheets that remember someone else.",
          destructible: false, color: "#5a3a44", saves: true,
        },
        {
          id: closet, name: "Closet", roomId: bedroom, x: 236, y: 118, w: 28, h: 18, z: 0,
          base: true, solid: true, interactable: true, mode: "dialog", consume: false,
          dialog: "A coat that isn't yours. Pocket lint and a movie stub from 2004.",
          destructible: false, color: "#3a3028",
        },
        {
          id: lampSw, name: "Bedside lamp", roomId: bedroom, x: 176, y: 118, w: 10, h: 10, z: 1,
          base: false, interactable: true, mode: "switch", consume: false, dialog: "",
          switchAction: "light", linkId: bedLight, destructible: false, color: "#d8c8a0",
        },
        {
          id: uid("fix"), name: "Sash window", roomId: bedroom, x: 200, y: 114, w: 26, h: 8, z: 0,
          base: false, interactable: true, mode: "window", consume: false, dialog: "",
          destructible: false, color: "#7ec8ff",
        },
      ],
      lights: [
        {
          id: uid("lit"), roomId: living, x: 136, y: 32, strength: 0.85, coneDeg: 70,
          heading: 90, feather: 48, flicker: "none", flickerMutate: false, color: "#7ec8ff", on: true,
        },
        {
          id: kitLight, roomId: kitchen, x: 220, y: 16, strength: 0.55, coneDeg: 180,
          heading: 90, feather: 40, flicker: "irregular", flickerMutate: true, color: "#e8c070",
          switchId: switcher, on: true,
        },
        {
          id: baseLight, roomId: basement, x: 40, y: 140, strength: 0.4, coneDeg: 180,
          heading: 90, feather: 36, flicker: "regular", flickerMutate: false, color: "#c8a060",
          switchId: pull, on: false,
        },
        {
          id: bedLight, roomId: bedroom, x: 186, y: 124, strength: 0.5, coneDeg: 160,
          heading: 90, feather: 32, flicker: "none", flickerMutate: false, color: "#e8c090",
          switchId: lampSw, on: true,
        },
      ],
      built: true,
      createdAt: Date.now(),
    },
    {
      id: uid("vault"),
      name: "Neighbor Walkup",
      kind: "building",
      tags: ["demo", "apartment", "neighbor"],
      perspective: "topdown",
      w: 64,
      h: 56,
      enterable: true,
      doors: [{ id: uid("door"), nx: 0.4, ny: 0.78, nw: 0.22, nh: 0.16, label: "stoop", kind: "entry" }],
      rooms: [
        {
          id: nRoom, name: "Walkup", x: 0, y: 0, w: 140, h: 100,
          floor: 0, window: true, dark: false, ambient: "radio leak",
        },
      ],
      fixtures: [
        {
          id: nRadio, name: "Kitchen radio", roomId: nRoom, x: 88, y: 22, w: 22, h: 14, z: 0,
          base: false, solid: true, interactable: true, mode: "dialog", consume: false,
          dialog: "Same song as the window next door. The dial is snapped off.",
          destructible: false, color: "#6a4a38",
        },
        {
          id: uid("fix"), name: "Sash window", roomId: nRoom, x: 16, y: 4, w: 28, h: 10, z: 0,
          base: false, interactable: true, mode: "window", consume: false, dialog: "",
          destructible: false, color: "#7ec8ff",
        },
        {
          id: uid("fix"), name: "Folding chair", roomId: nRoom, x: 24, y: 60, w: 20, h: 18, z: 0,
          base: true, solid: true, interactable: true, mode: "sit", consume: false,
          dialog: "Still warm.",
          destructible: false, color: "#4a4038",
        },
      ],
      lights: [
        {
          id: uid("lit"), roomId: nRoom, x: 70, y: 20, strength: 0.6, coneDeg: 160,
          heading: 90, feather: 40, flicker: "regular", flickerMutate: false, color: "#e8c070", on: true,
        },
      ],
      built: true,
      createdAt: Date.now(),
    },
  ];
}

const boot = load();

function patchAsset(assets: VaultAsset[], id: string, fn: (a: VaultAsset) => VaultAsset) {
  return assets.map((a) => (a.id === id ? fn(a) : a));
}

export const useAssetVault = create<VaultState>((set, get) => ({
  showPanel: false,
  tab: "library",
  assets: boot.assets,
  selectedId: boot.assets[0]?.id ?? null,
  clip: boot.clip,
  drawMode: "idle",
  inspectFixtureId: null,

  setShowPanel: (showPanel) => set({ showPanel }),
  setTab: (tab) => set({ tab, showPanel: true }),
  select: (selectedId) => set({ selectedId, tab: selectedId ? "inspect" : get().tab, inspectFixtureId: null }),
  setDrawMode: (drawMode) => set({ drawMode }),
  inspectFixture: (inspectFixtureId) => set({ inspectFixtureId }),

  ingestActive: (kind, name) => {
    const studio = useStudio.getState();
    const board = studio.getActiveArtboard();
    if (!board) {
      studio.setStatus("Select a board to ingest into the vault");
      return null;
    }
    const src = compositeLayers(board.layers, board.width, board.height);
    const punched = removeBackground(src, board.width, board.height);
    const layer = board.layers.find((l) => l.id === board.activeLayerId) ?? board.layers[0];
    if (layer) {
      layer.data = punched;
      layer.rev++;
      useStudio.setState({ artboards: studio.artboards.map((b) => (b.id === board.id ? { ...board, layers: [...board.layers] } : b)) });
    }
    const asset: VaultAsset = {
      id: uid("vault"),
      name: name?.trim() || board.name,
      kind,
      tags: [],
      perspective: kind === "ui" ? "ui" : "threequarter",
      sourceUrl: board.sourceUrl ?? null,
      artboardId: board.id,
      w: board.width,
      h: board.height,
      enterable: kind === "building",
      doors: [],
      rooms: kind === "building" ? [{ id: uid("room"), name: "Main", x: 0, y: 0, w: 160, h: 112, floor: 0 }] : [],
      fixtures: [],
      lights: [],
      built: false,
      createdAt: Date.now(),
    };
    set((s) => {
      const assets = [...s.assets, asset];
      persist(assets, s.clip);
      return { assets, selectedId: asset.id, tab: "inspect", showPanel: true };
    });
    studio.setStatus(`Vault · ${asset.name} stored (${kind})`);
    stampTimeline("Vault ingest", asset.name);
    try {
      unlockAudio();
      playJuiceSfx("blip", 1.05);
    } catch {
      /* */
    }
    return asset.id;
  },

  ingestPack: async () => {
    let man: {
      items?: Array<{
        id: string;
        name: string;
        kind: VaultKind;
        folder: string;
        perspective: AssetPerspective;
        w: number;
        h: number;
        sourceUrl: string;
      }>;
    };
    try {
      const r = await fetch("/vault/atlus/manifest.json");
      if (!r.ok) {
        useStudio.getState().setStatus("Atlus pack not sliced yet");
        return 0;
      }
      man = (await r.json()) as typeof man;
    } catch {
      useStudio.getState().setStatus("Atlus pack missing");
      return 0;
    }
    const incoming = man.items ?? [];
    if (!incoming.length) {
      useStudio.getState().setStatus("Atlus pack empty");
      return 0;
    }
    const existing = new Set(get().assets.map((a) => a.id));
    const added: VaultAsset[] = [];
    for (const it of incoming) {
      if (existing.has(it.id)) continue;
      const folderTag = it.folder === "props" ? "street" : it.folder === "interiors" ? "interior" : it.folder;
      added.push({
        id: it.id,
        name: it.name,
        kind: it.kind === "other" && it.folder === "ui" ? "ui" : it.kind,
        tags: ["atlus", folderTag, it.perspective],
        perspective: it.perspective,
        sourceUrl: it.sourceUrl,
        artboardId: null,
        w: it.w,
        h: it.h,
        enterable: false,
        doors: [],
        rooms: [],
        fixtures: [],
        lights: [],
        built: false,
        createdAt: Date.now(),
      });
    }
    if (!added.length) {
      useStudio.getState().setStatus("Atlus pack already in vault");
      return 0;
    }
    set((s) => {
      const assets = [...s.assets, ...added];
      persist(assets, s.clip);
      return { assets, showPanel: true, tab: "library" };
    });
    useStudio.getState().setStatus(`Vault · ${added.length} Atlus sprites (sorted by camera)`);
    stampTimeline("Atlus ingest", `${added.length} sprites`);
    try {
      unlockAudio();
      playJuiceSfx("chord", 1.02);
    } catch {
      /* */
    }
    return added.length;
  },

  dropToPlane: (id) => {
    const a = get().assets.find((x) => x.id === id);
    if (!a) return;
    const studio = useStudio.getState();
    const cam = studio.camera;
    const z = cam.zoom || 1;
    const ox = (-cam.x + 48) / z;
    const oy = (-cam.y + 48) / z;
    studio.addArtboard({
      name: a.name,
      x: Math.round(ox),
      y: Math.round(oy),
      width: Math.max(48, a.w),
      height: Math.max(48, a.h),
      sourceUrl: a.sourceUrl ?? undefined,
      kind: a.kind === "building" ? "scene" : a.kind === "ui" ? "hud" : "sheet",
    });
    studio.setStatus(`Dropped ${a.name} on the plane`);
    try {
      playJuiceSfx("blip", 1.1);
    } catch {
      /* */
    }
  },

  rename: (id, name) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({ ...a, name }));
      persist(assets, s.clip);
      return { assets };
    }),
  setKind: (id, kind) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({ ...a, kind }));
      persist(assets, s.clip);
      return { assets };
    }),
  setPerspective: (id, perspective) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        perspective,
        tags: [...new Set([...a.tags.filter((t) => t !== a.perspective), perspective])],
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  setEnterable: (id, enterable) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({ ...a, enterable }));
      persist(assets, s.clip);
      return { assets };
    }),
  addDoor: (id, door) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        doors: [...a.doors, { ...door, id: uid("door") }],
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  removeDoor: (id, doorId) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        doors: a.doors.filter((d) => d.id !== doorId),
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  addRoom: (id, room) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        rooms: [...a.rooms, { ...room, id: uid("room"), floor: room.floor ?? 0 }],
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  patchRoom: (id, roomId, p) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        rooms: a.rooms.map((r) => (r.id === roomId ? { ...r, ...p } : r)),
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  removeRoom: (id, roomId) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        rooms: a.rooms.filter((r) => r.id !== roomId),
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  addFixture: (id, f) => {
    const fid = uid("fix");
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        fixtures: [...a.fixtures, { ...f, id: fid }],
      }));
      persist(assets, s.clip);
      return { assets, inspectFixtureId: fid };
    });
    return fid;
  },
  patchFixture: (id, fid, p) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        fixtures: a.fixtures.map((f) => (f.id === fid ? { ...f, ...p } : f)),
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  removeFixture: (id, fid) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        fixtures: a.fixtures.filter((f) => f.id !== fid),
      }));
      persist(assets, s.clip);
      return { assets, inspectFixtureId: s.inspectFixtureId === fid ? null : s.inspectFixtureId };
    }),
  addLight: (id, l) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        lights: [...a.lights, { ...l, id: uid("lit") }],
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  patchLight: (id, lid, p) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        lights: a.lights.map((l) => (l.id === lid ? { ...l, ...p } : l)),
      }));
      persist(assets, s.clip);
      return { assets };
    }),
  removeLight: (id, lid) =>
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        lights: a.lights.filter((l) => l.id !== lid),
      }));
      persist(assets, s.clip);
      return { assets };
    }),

  duplicateFurnished: (id) => {
    const src = get().assets.find((a) => a.id === id);
    if (!src) return null;
    const copy: VaultAsset = {
      ...src,
      id: uid("vault"),
      name: `${src.name} · furnished`,
      parentId: src.id,
      built: false,
      createdAt: Date.now(),
      doors: src.doors.map((d) => ({ ...d, id: uid("door") })),
      rooms: src.rooms.map((r) => ({ ...r, id: uid("room") })),
      fixtures: [],
      lights: src.lights.map((l) => ({ ...l, id: uid("lit") })),
    };
    const roomMap = new Map(src.rooms.map((r, i) => [r.id, copy.rooms[i]!.id]));
    copy.lights = copy.lights.map((l) => ({ ...l, roomId: roomMap.get(l.roomId) ?? l.roomId }));
    set((s) => {
      const assets = [...s.assets, copy];
      persist(assets, s.clip);
      return { assets, selectedId: copy.id, tab: "inspect" };
    });
    useStudio.getState().setStatus(`Copy · ${copy.name} · original untouched`);
    stampTimeline("Vault copy", copy.name);
    return copy.id;
  },

  openIndoorOnPlane: (id) => {
    const a = get().assets.find((x) => x.id === id);
    if (!a) return;
    const room = a.rooms[0] ?? { w: 160, h: 112, name: "Main" };
    const boardId = useStudio.getState().createIndoorScene({
      w: Math.max(64, Math.round(room.w / 2)),
      h: Math.max(48, Math.round(room.h / 2)),
      name: `${a.name} · indoor`,
    });
    set((s) => {
      const assets = patchAsset(s.assets, id, (x) => ({ ...x, artboardId: boardId }));
      persist(assets, s.clip);
      return { assets };
    });
    useStudio.getState().setStatus(`Indoor plane · ${a.name} · drop items, double-click to wire`);
  },

  saveBuilt: (id, name) => {
    set((s) => {
      const assets = patchAsset(s.assets, id, (a) => ({
        ...a,
        built: true,
        name: name?.trim() || a.name,
      }));
      persist(assets, s.clip);
      return { assets, tab: "built" };
    });
    const a = get().assets.find((x) => x.id === id);
    useStudio.getState().setStatus(`Built · ${a?.name ?? "asset"} filed`);
    stampTimeline("Vault built", a?.name ?? id);
    try {
      playJuiceSfx("chord", 1.08);
    } catch {
      /* */
    }
  },

  pinClip: (id) =>
    set((s) => {
      if (s.clip.some((c) => c.assetId === id)) return s;
      const clip = [...s.clip, { assetId: id, addedAt: Date.now() }];
      persist(s.assets, clip);
      return { clip };
    }),
  unpinClip: (id) =>
    set((s) => {
      const clip = s.clip.filter((c) => c.assetId !== id);
      persist(s.assets, clip);
      return { clip };
    }),
  clearClip: () =>
    set((s) => {
      persist(s.assets, []);
      return { clip: [] };
    }),
  dropClipPlane: () => {
    const s = get();
    const studio = useStudio.getState();
    const cam = studio.camera;
    const z = cam.zoom || 1;
    const ox = (-cam.x + 80) / z;
    const oy = (-cam.y + 80) / z;
    const n = s.clip.length;
    if (!n) {
      studio.setStatus("Clipboard empty");
      return;
    }
    const zoneId = studio.createWireZone(ox - 16, oy - 24, n * 140 + 40, 180, "objects");
    if (zoneId) studio.renameWireZone(zoneId, "Clipboard · working");
    s.clip.forEach((c, i) => {
      const a = s.assets.find((x) => x.id === c.assetId);
      if (!a) return;
      studio.addArtboard({
        name: a.name,
        x: Math.round(ox + i * 136),
        y: Math.round(oy),
        width: 120,
        height: 88,
        sourceUrl: a.sourceUrl ?? undefined,
        kind: a.kind === "building" ? "scene" : "sheet",
      });
    });
    studio.setStatus(`Clipboard · ${n} on a working plane`);
  },
}));

export function defaultFixture(roomId: string, name = "Prop"): Omit<FixtureDef, "id"> {
  return {
    name,
    roomId,
    x: 40,
    y: 40,
    w: 20,
    h: 16,
    z: 0,
    base: false,
    interactable: true,
    mode: "dialog" as InteractMode,
    consume: false,
    dialog: "",
    destructible: false,
    color: "#8b7a6b",
    solid: false,
  };
}

export function selectedVault(): VaultAsset | null {
  const s = useAssetVault.getState();
  return s.assets.find((a) => a.id === s.selectedId) ?? null;
}
