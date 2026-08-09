import { create } from "zustand";
import type { PeerInfo } from "@/lib/multiplayer";
import {
  type PeerPresence,
  type CollabEnvelope,
  colorForId,
  randomRoomCode,
  bufferToB64,
  b64ToBuffer,
  isCollab,
} from "@/lib/multiplayer/collab-protocol";
import { emptyArtboardFromBuffer } from "@/store/collab-import";
import { useHotkeys } from "@/store/hotkeys";
import { useStudio } from "@/store/studio";
import type { OverlayAnim } from "@/lib/ui/overlay-anim";
import { usePlaneSystems } from "@/store/plane-systems";
import {
  loadOverlayAnim,
  saveOverlayAnim,
  loadCustomAnimCss,
  saveCustomAnimCss,
} from "@/lib/ui/overlay-anim";

type CollabState = {
  enabled: boolean;
  showPanel: boolean;
  roomCode: string;
  displayName: string;
  selfColor: string;
  selfId: string | null;
  joined: boolean;
  peers: PeerInfo[];
  presence: Record<string, PeerPresence>;
  status: string;
  overlayAnim: OverlayAnim;
  customAnimCss: string;
  sendReliable: ((data: unknown, peerId?: string) => void) | null;
  broadcastState: ((data: unknown) => void) | null;

  setShowPanel: (v: boolean) => void;
  setRoomCode: (c: string) => void;
  setDisplayName: (n: string) => void;
  setOverlayAnim: (a: OverlayAnim) => void;
  setCustomAnimCss: (c: string) => void;
  newRoomCode: () => void;
  setTransport: (
    t: {
      selfId: string;
      joined: boolean;
      peers: PeerInfo[];
      send: (data: unknown, peerId?: string) => void;
      broadcast: (data: unknown) => void;
    } | null,
  ) => void;
  setEnabled: (v: boolean) => void;
  upsertPresence: (p: PeerPresence) => void;
  removePresence: (peerId: string) => void;
  handleMessage: (from: string, data: unknown, channel: "state" | "reliable") => void;
  sendPlaneMessage: (title: string, body: string) => void;
  sendCursor: (
    worldX: number,
    worldY: number,
    cam: { x: number; y: number; zoom: number },
  ) => void;
  shareActiveLayerBranch: () => void;
  sendSocialPing: (emoji: string) => void;
};

function initialRoom() {
  if (typeof window === "undefined") return randomRoomCode();
  return sessionStorage.getItem("pp_room") || randomRoomCode();
}

function initialName() {
  if (typeof window === "undefined") return "Creator";
  return localStorage.getItem("pp_collab_name") || "Creator";
}

export const useCollab = create<CollabState>((set, get) => ({
  enabled: false,
  showPanel: false,
  roomCode: initialRoom(),
  displayName: initialName(),
  selfColor: "#e8a838",
  selfId: null,
  joined: false,
  peers: [],
  presence: {},
  status: "Not on a shared plane",
  overlayAnim: loadOverlayAnim(),
  customAnimCss: loadCustomAnimCss(),
  sendReliable: null,
  broadcastState: null,

  setShowPanel: (showPanel) => set({ showPanel }),
  setRoomCode: (roomCode) => {
    try {
      sessionStorage.setItem("pp_room", roomCode);
    } catch {
      /* ignore */
    }
    set({ roomCode });
  },
  setDisplayName: (displayName) => {
    try {
      localStorage.setItem("pp_collab_name", displayName);
    } catch {
      /* ignore */
    }
    set({ displayName });
  },
  setOverlayAnim: (overlayAnim) => {
    saveOverlayAnim(overlayAnim);
    set({ overlayAnim });
  },
  setCustomAnimCss: (customAnimCss) => {
    saveCustomAnimCss(customAnimCss);
    set({ customAnimCss });
  },
  newRoomCode: () => {
    const roomCode = randomRoomCode();
    try {
      sessionStorage.setItem("pp_room", roomCode);
    } catch {
      /* ignore */
    }
    set({ roomCode, status: `New room ${roomCode} — rejoin to apply` });
  },
  setEnabled: (enabled) =>
    set({
      enabled,
      status: enabled ? "Connecting to shared plane…" : "Left shared plane",
      presence: enabled ? get().presence : {},
    }),
  setTransport: (t) => {
    if (!t) {
      set({
        selfId: null,
        joined: false,
        peers: [],
        sendReliable: null,
        broadcastState: null,
      });
      return;
    }
    set({
      selfId: t.selfId,
      joined: t.joined,
      peers: t.peers,
      sendReliable: t.send,
      broadcastState: t.broadcast,
      selfColor: colorForId(t.selfId),
      status: t.joined
        ? t.peers.length
          ? `Shared plane · ${t.peers.length + 1} people`
          : "On plane · waiting for friends…"
        : "Connecting…",
    });
  },
  upsertPresence: (p) => set((s) => ({ presence: { ...s.presence, [p.peerId]: p } })),
  removePresence: (peerId) =>
    set((s) => {
      const presence = { ...s.presence };
      delete presence[peerId];
      return { presence };
    }),

  handleMessage: (from, data) => {
    if (!isCollab(data)) return;
    const anim = get().overlayAnim;

    if (data.t === "hello" || data.t === "cursor") {
      get().upsertPresence({
        peerId: from,
        name: data.name,
        color: data.color,
        worldX: data.t === "cursor" ? data.worldX : 0,
        worldY: data.t === "cursor" ? data.worldY : 0,
        camX: data.t === "cursor" ? data.camX : undefined,
        camY: data.t === "cursor" ? data.camY : undefined,
        zoom: data.t === "cursor" ? data.zoom : undefined,
        updatedAt: Date.now(),
      });
      return;
    }

    if (data.t === "plane_msg") {
      useHotkeys.getState().pushOverlayMessage({
        title: `${data.fromName}: ${data.title}`,
        body: data.body,
        x: 80,
        y: 90,
        anim: data.anim || anim,
        kind: "collab",
        color: data.color,
      });
      return;
    }

    if (data.t === "ping_social") {
      useHotkeys.getState().pushOverlayMessage({
        title: `${data.emoji} ${data.fromName}`,
        body: "waved across the plane",
        x: 100,
        y: 80,
        anim,
        kind: "collab",
        color: data.color,
      });
      return;
    }

    if (data.t === "look_at") {
      // Spatial beacon pull — co-presence camera physics
      void import("@/store/spatial-nav").then(({ useSpatialNav }) => {
        useSpatialNav.getState().dropBeacon({
          label: data.label || "Look at this",
          color: data.color,
          fromName: data.fromName,
          worldX: data.worldX,
          worldY: data.worldY,
          zoom: data.zoom,
          jump: true,
        });
      });
      useHotkeys.getState().pushOverlayMessage({
        title: `${data.fromName} pinned a view`,
        body: data.label || "Look at this — camera pulled",
        x: 90,
        y: 70,
        anim,
        kind: "collab",
        color: data.color,
      });
      return;
    }

    if (data.t === "interest") {
      usePlaneSystems.getState().setPeerInterest(from, data.chunks);
      return;
    }

    if (data.t === "mask" && data.op === "add") {
      usePlaneSystems.setState((s) => ({
        masks: [
          ...s.masks.filter((m) => m.id !== data.id),
          {
            id: data.id,
            name: `${data.fromName}'s bubble`,
            x: data.x,
            y: data.y,
            w: data.w,
            h: data.h,
            mode: (data.mode as "private" | "witness" | "focus") || "private",
            ownerId: from,
            ownerName: data.fromName,
            color: data.color,
            createdAt: Date.now(),
            expiresAt: null,
          },
        ],
      }));
      return;
    }
    if (data.t === "mask" && data.op === "remove") {
      usePlaneSystems.getState().removeMask(data.id);
      return;
    }

    if (data.t === "layer_branch") {
      try {
        const buf = b64ToBuffer(data.dataB64);
        if (buf.length !== data.width * data.height * 4) return;
        emptyArtboardFromBuffer({
          name: `${data.artboardName} · from ${data.fromName}`,
          w: data.width,
          h: data.height,
          x: data.placeX,
          y: data.placeY,
          data: buf,
        });
        useHotkeys.getState().pushOverlayMessage({
          title: "Layer branch received",
          body: `${data.fromName} shared “${data.artboardName}” — your copy sits on the plane`,
          x: 80,
          y: 100,
          anim,
          kind: "collab",
        });
      } catch {
        /* ignore */
      }
    }
  },

  sendPlaneMessage: (title, body) => {
    const s = get();
    if (!s.sendReliable) {
      set({ status: "Join a shared plane first" });
      return;
    }
    const msg: CollabEnvelope = {
      v: 1,
      t: "plane_msg",
      fromName: s.displayName,
      color: s.selfColor,
      title,
      body,
      anim: s.overlayAnim,
    };
    s.sendReliable(msg);
    useHotkeys.getState().pushOverlayMessage({
      title: `You: ${title}`,
      body,
      x: 80,
      y: 90,
      anim: s.overlayAnim,
      kind: "collab",
      color: s.selfColor,
    });
  },

  sendCursor: (worldX, worldY, cam) => {
    const s = get();
    if (!s.broadcastState || !s.joined) return;
    // D_10x: refresh local interest + fan out chunk keys
    const sw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const sh = typeof window !== "undefined" ? window.innerHeight : 800;
    usePlaneSystems.getState().updateLocalInterest(cam, sw, sh);
    const chunks = usePlaneSystems.getState().localInterest;
    const msg: CollabEnvelope = {
      v: 1,
      t: "cursor",
      name: s.displayName,
      color: s.selfColor,
      worldX,
      worldY,
      camX: cam.x,
      camY: cam.y,
      zoom: cam.zoom,
    };
    s.broadcastState(msg);
    if (chunks.length) {
      s.broadcastState({
        v: 1,
        t: "interest",
        chunks,
        camX: cam.x,
        camY: cam.y,
        zoom: cam.zoom,
      });
    }
  },

  shareActiveLayerBranch: () => {
    const s = get();
    if (!s.sendReliable) {
      set({ status: "Join a shared plane first" });
      return;
    }
    const st = useStudio.getState();
    const board = st.getActiveArtboard();
    if (!board) {
      set({ status: "Select an artboard to branch-share" });
      return;
    }
    const layer = board.layers.find((l) => l.id === board.activeLayerId) ?? board.layers[0];
    if (!layer) return;
    let w = board.width;
    let h = board.height;
    let data = layer.data;
    const maxSide = 96;
    if (w > maxSide || h > maxSide) {
      const scale = Math.min(maxSide / w, maxSide / h);
      const nw = Math.max(1, Math.round(w * scale));
      const nh = Math.max(1, Math.round(h * scale));
      const out = new Uint8ClampedArray(nw * nh * 4);
      for (let y = 0; y < nh; y++) {
        for (let x = 0; x < nw; x++) {
          const sx = Math.min(w - 1, Math.floor((x * w) / nw));
          const sy = Math.min(h - 1, Math.floor((y * h) / nh));
          const si = (sy * w + sx) * 4;
          const di = (y * nw + x) * 4;
          out[di] = data[si]!;
          out[di + 1] = data[si + 1]!;
          out[di + 2] = data[si + 2]!;
          out[di + 3] = data[si + 3]!;
        }
      }
      w = nw;
      h = nh;
      data = out;
    }
    if (data.length > 120_000) {
      set({
        status: "Layer too large to share peer-to-peer — crop or use smaller board",
      });
      return;
    }
    const msg: CollabEnvelope = {
      v: 1,
      t: "layer_branch",
      fromName: s.displayName,
      artboardName: board.name,
      width: w,
      height: h,
      dataB64: bufferToB64(data),
      placeX: board.x + board.width + 40,
      placeY: board.y,
    };
    s.sendReliable(msg);
    set({ status: `Shared layer branch “${board.name}” with plane` });
  },

  sendSocialPing: (emoji) => {
    const s = get();
    if (!s.sendReliable) return;
    const msg: CollabEnvelope = {
      v: 1,
      t: "ping_social",
      fromName: s.displayName,
      color: s.selfColor,
      emoji,
    };
    s.sendReliable(msg);
  },
}));
