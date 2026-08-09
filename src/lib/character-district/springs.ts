/**
 * D_Spring — procedural secondary motion (hair/cape/jiggle) without hand-animating every frame.
 * Lightweight Verlet-style chain driven by chassis motion samples.
 */

import { uid } from "@/lib/utils";
import { createBuffer } from "@/lib/pixel/buffer";

export type SpringNode = {
  id: string;
  name: string;
  /** chassis artboard or anchor label */
  anchorId: string;
  /** modular overlay artboard id */
  overlayArtboardId?: string | null;
  /** local offset from chassis center */
  attachX: number;
  attachY: number;
  stiffness: number; // 40–300
  damping: number; // 0.1–0.95
  mass: number; // 0.2–3
  restLength: number;
  color: string;
};

export function createSpring(opts: {
  name?: string;
  anchorId: string;
  overlayArtboardId?: string | null;
  attachX?: number;
  attachY?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  restLength?: number;
}): SpringNode {
  return {
    id: uid("spr"),
    name: opts.name ?? "Secondary spring",
    anchorId: opts.anchorId,
    overlayArtboardId: opts.overlayArtboardId ?? null,
    attachX: opts.attachX ?? 0,
    attachY: opts.attachY ?? -12,
    stiffness: opts.stiffness ?? 120,
    damping: opts.damping ?? 0.8,
    mass: opts.mass ?? 1,
    restLength: opts.restLength ?? 10,
    color: "#c084fc",
  };
}

/**
 * Simulate spring tip offsets over N frames given primary motion deltas.
 * Returns tip offset per frame relative to attach point (for bake / preview).
 */
export function simulateSpringOffsets(
  spring: SpringNode,
  /** primary root positions per frame (world or local) */
  rootPath: { x: number; y: number }[],
  dt = 1 / 12,
): { x: number; y: number }[] {
  if (!rootPath.length) return [];
  let tipX = rootPath[0]!.x + spring.attachX;
  let tipY = rootPath[0]!.y + spring.attachY + spring.restLength;
  let vx = 0;
  let vy = 0;
  const out: { x: number; y: number }[] = [];
  const k = spring.stiffness;
  const damp = spring.damping;
  const m = Math.max(0.05, spring.mass);

  for (let i = 0; i < rootPath.length; i++) {
    const root = rootPath[i]!;
    const ax0 = root.x + spring.attachX;
    const ay0 = root.y + spring.attachY;
    // spring force toward rest length along attach→tip
    const dx = tipX - ax0;
    const dy = tipY - ay0;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const stretch = dist - spring.restLength;
    const fx = (-k * stretch * dx) / dist;
    const fy = (-k * stretch * dy) / dist + 40 * m; // mild gravity
    vx = (vx + (fx / m) * dt) * damp;
    vy = (vy + (fy / m) * dt) * damp;
    tipX += vx * dt * 60;
    tipY += vy * dt * 60;
    out.push({ x: tipX - ax0, y: tipY - ay0 });
  }
  return out;
}

/** Tiny preview strip: draw tip trail into a buffer for plane note */
export function rasterSpringTrail(
  offsets: { x: number; y: number }[],
  w = 64,
  h = 64,
): Uint8ClampedArray {
  const data = createBuffer(w, h);
  const cx = w / 2;
  const cy = h / 3;
  for (let i = 0; i < offsets.length; i++) {
    const o = offsets[i]!;
    const x = Math.round(cx + o.x * 0.5);
    const y = Math.round(cy + o.y * 0.5);
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const t = i / Math.max(1, offsets.length - 1);
    const idx = (y * w + x) * 4;
    data[idx] = Math.round(192 + t * 40);
    data[idx + 1] = Math.round(100 + t * 80);
    data[idx + 2] = 252;
    data[idx + 3] = 220;
  }
  return data;
}
