/**
 * Secondary motion knowledge — offline springs / chains.
 * "Make the tail look right" without diffusion: Verlet rope with gravity + drag
 * driven by attachment point motion across frames.
 */

import type { Point, SilhouetteInfo } from "./silhouette";
import { extractSilhouette } from "./silhouette";
import { createBuffer } from "@/lib/pixel/buffer";

export type SecondaryKind = "tail" | "ear" | "cloak" | "hair" | "cape" | "custom";

export type SecondaryLayerDef = {
  id: string;
  kind: SecondaryKind;
  name: string;
  /** 0–1 normalized attach on first-frame silhouette (back default for tail) */
  attachU: number;
  attachV: number;
  segments: number;
  /** total length in pixels */
  length: number;
  stiffness: number;
  damping: number;
  gravity: number;
  thickness: number;
  color: [number, number, number, number];
  /** rest angle degrees (0 = right, 90 = down) */
  restAngle: number;
};

export type SecondaryBakeResult = {
  /** overlay buffers same size as frames */
  overlays: Uint8ClampedArray[];
  /** composites base+overlay */
  composites: Uint8ClampedArray[];
};

const KIND_DEFAULTS: Record<
  SecondaryKind,
  Partial<SecondaryLayerDef> & { attach: "back" | "head" | "torso" }
> = {
  tail: {
    segments: 6,
    length: 0, // set from frame size
    stiffness: 0.45,
    damping: 0.82,
    gravity: 0.35,
    thickness: 2.2,
    restAngle: 110,
    attach: "back",
    color: [90, 70, 50, 255],
  },
  ear: {
    segments: 3,
    length: 0,
    stiffness: 0.7,
    damping: 0.75,
    gravity: 0.15,
    thickness: 1.6,
    restAngle: -70,
    attach: "head",
    color: [200, 160, 140, 255],
  },
  cloak: {
    segments: 8,
    length: 0,
    stiffness: 0.28,
    damping: 0.88,
    gravity: 0.5,
    thickness: 3,
    restAngle: 90,
    attach: "torso",
    color: [60, 50, 90, 230],
  },
  hair: {
    segments: 5,
    length: 0,
    stiffness: 0.4,
    damping: 0.8,
    gravity: 0.4,
    thickness: 1.8,
    restAngle: 100,
    attach: "head",
    color: [40, 30, 25, 255],
  },
  cape: {
    segments: 7,
    length: 0,
    stiffness: 0.32,
    damping: 0.86,
    gravity: 0.45,
    thickness: 2.8,
    restAngle: 95,
    attach: "back",
    color: [140, 40, 50, 240],
  },
  custom: {
    segments: 5,
    length: 0,
    stiffness: 0.5,
    damping: 0.8,
    gravity: 0.3,
    thickness: 2,
    restAngle: 90,
    attach: "back",
    color: [180, 180, 180, 255],
  },
};

export function defaultSecondary(
  kind: SecondaryKind,
  frameW: number,
  frameH: number,
  id: string,
): SecondaryLayerDef {
  const d = KIND_DEFAULTS[kind];
  const baseLen =
    kind === "ear"
      ? Math.max(6, frameH * 0.18)
      : kind === "tail"
        ? Math.max(10, frameW * 0.45)
        : Math.max(12, frameH * 0.55);
  const attachUV =
    d.attach === "head"
      ? { u: 0.5, v: 0.12 }
      : d.attach === "torso"
        ? { u: 0.5, v: 0.4 }
        : { u: 0.22, v: 0.55 };
  return {
    id,
    kind,
    name: kind.charAt(0).toUpperCase() + kind.slice(1),
    attachU: attachUV.u,
    attachV: attachUV.v,
    segments: d.segments ?? 5,
    length: baseLen,
    stiffness: d.stiffness ?? 0.5,
    damping: d.damping ?? 0.8,
    gravity: d.gravity ?? 0.3,
    thickness: d.thickness ?? 2,
    color: d.color ?? [180, 180, 180, 255],
    restAngle: d.restAngle ?? 90,
  };
}

function attachPoint(sil: SilhouetteInfo, def: SecondaryLayerDef): Point {
  if (sil.pixelCount === 0) {
    return {
      x: def.attachU * sil.w,
      y: def.attachV * sil.h,
    };
  }
  // Prefer semantic anchor, then slide by UV within bounds
  const base =
    def.kind === "ear" || def.kind === "hair"
      ? sil.anchors.head
      : def.kind === "cloak"
        ? sil.anchors.torso
        : sil.anchors.back;
  const bx = sil.minX + def.attachU * Math.max(1, sil.maxX - sil.minX);
  const by = sil.minY + def.attachV * Math.max(1, sil.maxY - sil.minY);
  return {
    x: base.x * 0.55 + bx * 0.45,
    y: base.y * 0.55 + by * 0.45,
  };
}

/**
 * Bake secondary motion for every frame of a base animation.
 */
export function bakeSecondaryLayer(
  frames: Uint8ClampedArray[],
  frameW: number,
  frameH: number,
  def: SecondaryLayerDef,
): SecondaryBakeResult {
  const n = Math.max(2, def.segments);
  const segLen = def.length / n;
  const rad = (def.restAngle * Math.PI) / 180;

  // init chain
  let points: Point[] = [];
  let prev: Point[] = [];

  const sil0 = frames[0]
    ? extractSilhouette(frames[0], frameW, frameH)
    : extractSilhouette(createBuffer(frameW, frameH), frameW, frameH);
  const a0 = attachPoint(sil0, def);
  for (let i = 0; i <= n; i++) {
    const p = {
      x: a0.x + Math.cos(rad) * segLen * i,
      y: a0.y + Math.sin(rad) * segLen * i,
    };
    points.push(p);
    prev.push({ ...p });
  }

  const overlays: Uint8ClampedArray[] = [];
  const composites: Uint8ClampedArray[] = [];

  for (let fi = 0; fi < frames.length; fi++) {
    const base = frames[fi]!;
    const sil = extractSilhouette(base, frameW, frameH);
    const attach = attachPoint(sil, def);

    // pin root
    points[0] = { ...attach };

    // Verlet integrate
    for (let i = 1; i <= n; i++) {
      const p = points[i]!;
      const pr = prev[i]!;
      const vx = (p.x - pr.x) * def.damping;
      const vy = (p.y - pr.y) * def.damping;
      prev[i] = { ...p };
      p.x += vx;
      p.y += vy + def.gravity;
    }
    points[0] = { ...attach };
    prev[0] = { ...attach };

    // distance constraints (multiple iterations = stiffness)
    const iters = 2 + Math.round(def.stiffness * 6);
    for (let it = 0; it < iters; it++) {
      points[0] = { ...attach };
      for (let i = 1; i <= n; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (dist - segLen) / dist;
        const ox = dx * 0.5 * diff;
        const oy = dy * 0.5 * diff;
        if (i - 1 === 0) {
          b.x -= ox * 2;
          b.y -= oy * 2;
        } else {
          a.x += ox;
          a.y += oy;
          b.x -= ox;
          b.y -= oy;
        }
      }
    }

    // soft rest-angle bias on first segment
    {
      const target = {
        x: attach.x + Math.cos(rad) * segLen,
        y: attach.y + Math.sin(rad) * segLen,
      };
      const b = points[1]!;
      b.x = b.x * (1 - def.stiffness * 0.25) + target.x * def.stiffness * 0.25;
      b.y = b.y * (1 - def.stiffness * 0.25) + target.y * def.stiffness * 0.25;
    }

    const overlay = createBuffer(frameW, frameH);
    drawChain(overlay, frameW, frameH, points, def.thickness, def.color);
    overlays.push(overlay);

    const comp = new Uint8ClampedArray(base);
    compositeOver(comp, overlay);
    composites.push(comp);
  }

  return { overlays, composites };
}

function drawChain(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  points: Point[],
  thickness: number,
  color: [number, number, number, number],
) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const t = thickness * (1 - i / points.length * 0.45);
    drawThickLine(data, w, h, a.x, a.y, b.x, b.y, t, color);
  }
  // tip blob
  const tip = points[points.length - 1]!;
  fillCircle(data, w, h, tip.x, tip.y, thickness * 0.9, color);
}

function drawThickLine(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  color: [number, number, number, number],
) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    fillCircle(data, w, h, x, y, thickness, color);
  }
}

function fillCircle(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  r: number,
  color: [number, number, number, number],
) {
  const rr = r * r;
  const x0 = Math.floor(cx - r - 1);
  const y0 = Math.floor(cy - r - 1);
  const x1 = Math.ceil(cx + r + 1);
  const y1 = Math.ceil(cy + r + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rr) {
        const i = (y * w + x) * 4;
        // over
        const sa = color[3] / 255;
        const da = data[i + 3]! / 255;
        const outA = sa + da * (1 - sa);
        if (outA <= 0) continue;
        data[i] = Math.round((color[0] * sa + data[i]! * da * (1 - sa)) / outA);
        data[i + 1] = Math.round(
          (color[1] * sa + data[i + 1]! * da * (1 - sa)) / outA,
        );
        data[i + 2] = Math.round(
          (color[2] * sa + data[i + 2]! * da * (1 - sa)) / outA,
        );
        data[i + 3] = Math.round(outA * 255);
      }
    }
  }
}

function compositeOver(base: Uint8ClampedArray, over: Uint8ClampedArray) {
  for (let i = 0; i < base.length; i += 4) {
    const sa = over[i + 3]! / 255;
    if (sa <= 0) continue;
    const da = base[i + 3]! / 255;
    const outA = sa + da * (1 - sa);
    if (outA <= 0) continue;
    base[i] = Math.round((over[i]! * sa + base[i]! * da * (1 - sa)) / outA);
    base[i + 1] = Math.round(
      (over[i + 1]! * sa + base[i + 1]! * da * (1 - sa)) / outA,
    );
    base[i + 2] = Math.round(
      (over[i + 2]! * sa + base[i + 2]! * da * (1 - sa)) / outA,
    );
    base[i + 3] = Math.round(outA * 255);
  }
}

export function compositeFrames(
  base: Uint8ClampedArray[],
  overlay: Uint8ClampedArray[],
): Uint8ClampedArray[] {
  return base.map((b, i) => {
    const out = new Uint8ClampedArray(b);
    if (overlay[i]) compositeOver(out, overlay[i]!);
    return out;
  });
}
