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
  questTrees?: unknown;
  destructibles?: unknown;
  activeQuestTreeId?: string | null;
  activeDestructibleId?: string | null;
  activeWireZoneId?: string | null;
  activeParticleId?: string | null;
  activeParallaxId?: string | null;
}): PersistedSnapshot {
  return {
    version: 2,
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
    questTrees: state.questTrees ?? [],
    destructibles: state.destructibles ?? [],
    activeQuestTreeId: state.activeQuestTreeId ?? null,
    activeDestructibleId: state.activeDestructibleId ?? null,
    activeWireZoneId: state.activeWireZoneId ?? null,
    activeParticleId: state.activeParticleId ?? null,
    activeParallaxId: state.activeParallaxId ?? null,
  };
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
