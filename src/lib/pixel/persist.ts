/**
 * IndexedDB project persistence for PixelPlane.
 * Stores serializable studio snapshot (pixels via structured clone).
 *
 * v2: also persists quest trees + destructibles (smash alley) + active ids.
 * v1 saves still load; missing fields are repaired on boot.
 */

const DB_NAME = "pixelplane_v1";
const STORE = "projects";
const KEY = "autosave";

export type PersistedSnapshot = {
  version: 1 | 2;
  savedAt: number;
  meta: unknown;
  camera: unknown;
  artboards: unknown;
  animRegions: unknown;
  particles: unknown;
  actors: unknown;
  parallaxStacks: unknown;
  wireZones: unknown;
  engineProject: unknown;
  activeArtboardId: string | null;
  activeAnimId: string | null;
  color: string;
  brushSize: number;
  tool: string;
  pixelMode?: string;
  /** v2 — smashables alley + quest graph (were silently dropped in v1) */
  questTrees?: unknown;
  destructibles?: unknown;
  activeQuestTreeId?: string | null;
  activeDestructibleId?: string | null;
  activeWireZoneId?: string | null;
  activeParticleId?: string | null;
  activeParallaxId?: string | null;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSnapshot(snap: PersistedSnapshot): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(snap, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadSnapshot(): Promise<PersistedSnapshot | null> {
  try {
    const db = await openDb();
    const snap = await new Promise<PersistedSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as PersistedSnapshot) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return snap;
  } catch {
    return null;
  }
}

export async function clearSnapshot(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Build snapshot from studio getState() plain fields.
 *  Large starter-pack bitmaps are NOT stored — only sourceUrl + geometry.
 *  Pixels rehydrate on boot via rehydrateStarterArt (fixes hollow Neon Alley etc).
 */
export function pickSnapshot(state: {
  meta: unknown;
  camera: unknown;
  artboards: unknown;
  animRegions: unknown;
  particles: unknown;
  actors: unknown;
  parallaxStacks: unknown;
  wireZones: unknown;
  engineProject: unknown;
  activeArtboardId: string | null;
  activeAnimId: string | null;
  color: string;
  brushSize: number;
  tool: string;
  questTrees?: unknown;
  destructibles?: unknown;
  activeQuestTreeId?: string | null;
  activeDestructibleId?: string | null;
  activeWireZoneId?: string | null;
  activeParticleId?: string | null;
  activeParallaxId?: string | null;
}): PersistedSnapshot {
  const artboards = slimArtboards(state.artboards);
  const parallaxStacks = slimParallax(state.parallaxStacks);
  const animRegions = slimAnims(state.animRegions);
  return {
    version: 2,
    savedAt: Date.now(),
    meta: state.meta,
    camera: state.camera,
    artboards,
    animRegions,
    particles: state.particles,
    actors: state.actors,
    parallaxStacks,
    wireZones: state.wireZones,
    engineProject: state.engineProject,
    activeArtboardId: state.activeArtboardId,
    activeAnimId: state.activeAnimId,
    color: state.color,
    brushSize: state.brushSize,
    tool: state.tool,
    questTrees: state.questTrees ?? [],
    destructibles: state.destructibles ?? [],
    activeQuestTreeId: state.activeQuestTreeId ?? null,
    activeDestructibleId: state.activeDestructibleId ?? null,
    activeWireZoneId: state.activeWireZoneId ?? null,
    activeParticleId: state.activeParticleId ?? null,
    activeParallaxId: state.activeParallaxId ?? null,
  };
}

function layerHasPixels(data: unknown, w: number, h: number): boolean {
  if (!data) return false;
  const need = (w | 0) * (h | 0) * 4;
  if (need <= 0) return false;
  const len =
    typeof (data as { length?: number }).length === "number"
      ? (data as { length: number }).length
      : typeof (data as { byteLength?: number }).byteLength === "number"
        ? (data as { byteLength: number }).byteLength
        : 0;
  if (len < Math.min(need, 64)) return false;
  // sample alpha channel
  try {
    const arr =
      data instanceof Uint8ClampedArray
        ? data
        : data instanceof Uint8Array
          ? data
          : null;
    if (!arr) return len >= need;
    let opaque = 0;
    const step = Math.max(4, ((arr.length / 4 / 2000) | 0) * 4);
    for (let i = 3; i < arr.length; i += step) {
      if (arr[i]! > 8) {
        opaque++;
        if (opaque > 8) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function slimArtboards(raw: unknown): unknown {
  if (!Array.isArray(raw)) return [];
  // Keep real pixels in IDB so refresh never depends on re-fetch.
  // Only strip truly empty / enormous buffers. Starter boards are <1MB each.
  const MAX_BYTES = 3_000_000;
  return raw.map((b: any) => {
    const w = b.width | 0;
    const h = b.height | 0;
    const layers = (b.layers || []).map((l: any) => {
      const data = l.data;
      const len =
        data && typeof data.length === "number"
          ? data.length
          : data && typeof data.byteLength === "number"
            ? data.byteLength
            : 0;
      if (len > 0 && len <= MAX_BYTES && layerHasPixels(data, w, h)) {
        // persist a dense copy so IDB structured-clone stays solid
        const copy =
          data instanceof Uint8ClampedArray
            ? new Uint8ClampedArray(data)
            : new Uint8ClampedArray(data as ArrayLike<number>);
        return { ...l, data: copy };
      }
      // hollow — keep geometry + sourceUrl for rehydrate
      return { ...l, data: new Uint8ClampedArray(0) };
    });
    return { ...b, layers };
  });
}

function slimParallax(raw: unknown): unknown {
  if (!Array.isArray(raw)) return [];
  const MAX_BYTES = 3_000_000;
  return raw.map((p: any) => ({
    ...p,
    layers: (p.layers || []).map((L: any) => {
      const data = L.data;
      const w = L.w | 0;
      const h = L.h | 0;
      const len = data && typeof data.length === "number" ? data.length : 0;
      if (len > 0 && len <= MAX_BYTES && layerHasPixels(data, w, h)) {
        const copy =
          data instanceof Uint8ClampedArray
            ? new Uint8ClampedArray(data)
            : new Uint8ClampedArray(data as ArrayLike<number>);
        return { ...L, data: copy };
      }
      const { data: _d, ...rest } = L;
      return { ...rest, data: undefined };
    }),
  }));
}

function slimAnims(raw: unknown): unknown {
  if (!Array.isArray(raw)) return [];
  // keep anim structure; frames can be rebuilt from boards if hollow
  return raw.map((a: any) => ({
    ...a,
    frames: (a.frames || []).map((f: any) => ({
      ...f,
      // keep small frames; strip if huge
      data:
        f.data && f.data.length && f.data.length <= 96 * 96 * 4
          ? f.data
          : new Uint8ClampedArray(0),
    })),
  }));
}

/** True when a restored v1/partial save lost smash alley / quest foundations */
export function snapshotMissingFoundations(snap: PersistedSnapshot | null | undefined): boolean {
  if (!snap) return true;
  const dests = snap.destructibles;
  const quests = snap.questTrees;
  const noDests = !Array.isArray(dests) || dests.length === 0;
  const noQuests = !Array.isArray(quests) || quests.length === 0;
  return noDests || noQuests;
}
