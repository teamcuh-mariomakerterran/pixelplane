/**
 * IndexedDB project persistence for PixelPlane.
 * Stores serializable studio snapshot (pixels via structured clone).
 */

const DB_NAME = "pixelplane_v1";
const STORE = "projects";
const KEY = "autosave";

export type PersistedSnapshot = {
  version: 1;
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

/** Build snapshot from studio getState() plain fields */
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
}): PersistedSnapshot {
  return {
    version: 1,
    savedAt: Date.now(),
    meta: state.meta,
    camera: state.camera,
    artboards: state.artboards,
    animRegions: state.animRegions,
    particles: state.particles,
    actors: state.actors,
    parallaxStacks: state.parallaxStacks,
    wireZones: state.wireZones,
    engineProject: state.engineProject,
    activeArtboardId: state.activeArtboardId,
    activeAnimId: state.activeAnimId,
    color: state.color,
    brushSize: state.brushSize,
    tool: state.tool,
  };
}
