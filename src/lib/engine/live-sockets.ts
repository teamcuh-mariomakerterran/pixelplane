/**
 * Live Asset Sockets — Studio artboards / anims bind to engine slots.
 * When layer.rev or anim frames change, engine consumers hot-reload.
 */

export type SocketKind =
  | "sprite"
  | "tiles"
  | "vehicle"
  | "prop"
  | "portrait"
  | "indoor"
  | "fx"
  | "hud";

export type LiveSocket = {
  id: string;
  name: string;
  kind: SocketKind;
  /** studio source */
  artboardId?: string | null;
  animId?: string | null;
  wireZoneId?: string | null;
  /** last known revision fingerprint */
  rev: number;
  /** engine-side key e.g. "npc.vex.idle" */
  engineKey: string;
  /** last push timestamp */
  updatedAt: number;
  enabled: boolean;
};

export type SocketPayload = {
  socketId: string;
  engineKey: string;
  kind: SocketKind;
  width: number;
  height: number;
  /** RGBA copy for engine to upload */
  pixels: Uint8ClampedArray;
  rev: number;
};

export function createSocket(opts: {
  name: string;
  kind: SocketKind;
  engineKey: string;
  artboardId?: string | null;
  animId?: string | null;
  wireZoneId?: string | null;
}): LiveSocket {
  return {
    id: `sock_${Math.random().toString(36).slice(2, 9)}`,
    name: opts.name,
    kind: opts.kind,
    artboardId: opts.artboardId ?? null,
    animId: opts.animId ?? null,
    wireZoneId: opts.wireZoneId ?? null,
    rev: 0,
    engineKey: opts.engineKey,
    updatedAt: Date.now(),
    enabled: true,
  };
}

export function fingerprintArtboard(layers: { rev: number; visible: boolean }[]): number {
  let h = 0;
  for (const L of layers) {
    if (!L.visible) continue;
    h = (h * 33 + L.rev) | 0;
  }
  return h >>> 0;
}

export function fingerprintAnim(frames: { data: Uint8ClampedArray }[]): number {
  let h = frames.length * 10007;
  for (const f of frames) {
    // sample a few bytes for speed
    const d = f.data;
    h = (h * 31 + d.length) | 0;
    if (d.length > 0) h = (h * 31 + d[0]! + d[d.length - 1]!) | 0;
  }
  return h >>> 0;
}

export type SocketSource = {
  artboards: {
    id: string;
    name: string;
    width: number;
    height: number;
    layers: { rev: number; visible: boolean; data: Uint8ClampedArray }[];
  }[];
  anims: {
    id: string;
    name: string;
    frameW: number;
    frameH: number;
    frames: { data: Uint8ClampedArray }[];
  }[];
  composite: (
    layers: { rev: number; visible: boolean; data: Uint8ClampedArray; opacity?: number }[],
    w: number,
    h: number,
  ) => Uint8ClampedArray;
};

/** Returns payloads for sockets whose source rev changed */
export function pollSocketUpdates(
  sockets: LiveSocket[],
  source: SocketSource,
): { sockets: LiveSocket[]; payloads: SocketPayload[] } {
  const payloads: SocketPayload[] = [];
  const next = sockets.map((s) => {
    if (!s.enabled) return s;
    if (s.artboardId) {
      const b = source.artboards.find((a) => a.id === s.artboardId);
      if (!b) return s;
      const rev = fingerprintArtboard(b.layers);
      if (rev === s.rev) return s;
      const pixels = source.composite(b.layers, b.width, b.height);
      payloads.push({
        socketId: s.id,
        engineKey: s.engineKey,
        kind: s.kind,
        width: b.width,
        height: b.height,
        pixels,
        rev,
      });
      return { ...s, rev, updatedAt: Date.now() };
    }
    if (s.animId) {
      const a = source.anims.find((x) => x.id === s.animId);
      if (!a || !a.frames[0]) return s;
      const rev = fingerprintAnim(a.frames);
      if (rev === s.rev) return s;
      payloads.push({
        socketId: s.id,
        engineKey: s.engineKey,
        kind: s.kind,
        width: a.frameW,
        height: a.frameH,
        pixels: new Uint8ClampedArray(a.frames[0].data),
        rev,
      });
      return { ...s, rev, updatedAt: Date.now() };
    }
    return s;
  });
  return { sockets: next, payloads };
}

/** Auto-wire sockets from feed planes that have a single primary board center-owned */
export function suggestSocketsFromWires(
  zones: { id: string; name: string; category: string; folderPath?: string | null }[],
  artboards: { id: string; name: string; x: number; y: number }[],
): LiveSocket[] {
  const out: LiveSocket[] = [];
  for (const z of zones) {
    if (!z.folderPath) continue;
    const kind: LiveSocket["kind"] =
      z.category === "characters" || z.category === "animations"
        ? "sprite"
        : z.category === "destructibles" || z.category === "objects"
          ? "prop"
          : z.category === "environments"
            ? "tiles"
            : z.category === "hud" || z.category === "ui"
              ? "hud"
              : z.category === "effects"
                ? "fx"
                : "sprite";
    // pick nearest artboard name match or first
    const board = artboards.find((b) =>
      b.name.toLowerCase().includes(z.name.toLowerCase().slice(0, 4)),
    ) ?? artboards[0];
    if (!board) continue;
    out.push(
      createSocket({
        name: `${z.name} → live`,
        kind,
        engineKey: `${z.category}.${board.name.replace(/\s+/g, "_").toLowerCase()}`,
        artboardId: board.id,
        wireZoneId: z.id,
      }),
    );
  }
  return out.slice(0, 24);
}
