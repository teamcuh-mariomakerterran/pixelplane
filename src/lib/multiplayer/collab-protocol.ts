/**
 * PixelPlane shared-plane messages over WebRTC data channels.
 * Co-op only — no competitive authority.
 */

import type { OverlayAnim } from "@/lib/ui/overlay-anim";

export type PeerPresence = {
  peerId: string;
  name: string;
  color: string;
  /** world cursor */
  worldX: number;
  worldY: number;
  /** optional camera bookmark hint */
  camX?: number;
  camY?: number;
  zoom?: number;
  updatedAt: number;
};

export type CollabEnvelope =
  | {
      v: 1;
      t: "hello";
      name: string;
      color: string;
    }
  | {
      v: 1;
      t: "cursor";
      name: string;
      color: string;
      worldX: number;
      worldY: number;
      camX: number;
      camY: number;
      zoom: number;
    }
  | {
      v: 1;
      t: "plane_msg";
      fromName: string;
      color: string;
      title: string;
      body: string;
      anim: OverlayAnim;
      /** optional world pin */
      worldX?: number;
      worldY?: number;
    }
  | {
      v: 1;
      t: "layer_branch";
      fromName: string;
      artboardName: string;
      width: number;
      height: number;
      /** PNG-ish raw RGBA as base64 — keep small */
      dataB64: string;
      placeX: number;
      placeY: number;
    }
  | {
      v: 1;
      t: "ping_social";
      fromName: string;
      color: string;
      emoji: string;
    }
  | {
      /** Look-at-This spatial beacon — camera pull for co-presence */
      v: 1;
      t: "look_at";
      fromName: string;
      color: string;
      label: string;
      worldX: number;
      worldY: number;
      zoom: number;
    }
  | {
      /** D_10x — which spatial chunks this peer's viewport cares about */
      v: 1;
      t: "interest";
      chunks: string[];
      camX: number;
      camY: number;
      zoom: number;
    }
  | {
      /** A3 private mask broadcast (outline only for peers) */
      v: 1;
      t: "mask";
      op: "add" | "remove";
      id: string;
      fromName: string;
      color: string;
      mode: string;
      x: number;
      y: number;
      w: number;
      h: number;
    };

export function isCollab(data: unknown): data is CollabEnvelope {
  return (
    !!data &&
    typeof data === "object" &&
    (data as CollabEnvelope).v === 1 &&
    typeof (data as CollabEnvelope).t === "string"
  );
}

export const PEER_COLORS = [
  "#e8a838",
  "#3ecfcf",
  "#e85d5d",
  "#7c5cff",
  "#4ecb71",
  "#ff5cb0",
  "#38bdf8",
  "#a3e635",
];

export function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PEER_COLORS[Math.abs(h) % PEER_COLORS.length]!;
}

export function randomRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "pp-";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

/** Encode small RGBA buffers for co-op layer share (cap size) */
export function bufferToB64(data: Uint8ClampedArray): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    bin += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function b64ToBuffer(b64: string): Uint8ClampedArray {
  const bin = atob(b64);
  const out = new Uint8ClampedArray(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
