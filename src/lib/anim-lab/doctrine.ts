/**
 * Animation doctrine from game-animation-frames — runtime helpers.
 * Flip-test, loop closure, fps suggestions for Anim regions / sheets.
 */

export type FrameProbe = {
  /** optional average color hash / occupancy for cheap continuity */
  occupancy: number;
  centroidX: number;
  centroidY: number;
};

export type LoopAudit = {
  ok: boolean;
  score: number; // 0–1
  issues: string[];
  tips: string[];
  suggestedFps: number;
};

/** Sample ImageData-ish buffer for occupancy + centroid (alpha > 16) */
export function probeFrame(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): FrameProbe {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]!;
      if (a > 16) {
        n++;
        sx += x;
        sy += y;
      }
    }
  }
  return {
    occupancy: n / Math.max(1, w * h),
    centroidX: n ? sx / n : w / 2,
    centroidY: n ? sy / n : h / 2,
  };
}

/**
 * Flip-test lite: last→first continuity + mid-cycle motion energy.
 * Does not replace visual flip-test; flags structural loop risks.
 */
export function auditLoop(probes: FrameProbe[], opts?: { preferFps?: number }): LoopAudit {
  const issues: string[] = [];
  const tips: string[] = [];
  if (probes.length < 2) {
    return {
      ok: false,
      score: 0,
      issues: ["Need at least 2 frames for a cycle"],
      tips: ["Slice a sheet or paint multi-frame anim region"],
      suggestedFps: 8,
    };
  }

  const first = probes[0]!;
  const last = probes[probes.length - 1]!;
  const occJump = Math.abs(last.occupancy - first.occupancy);
  const cJump = Math.hypot(last.centroidX - first.centroidX, last.centroidY - first.centroidY);

  if (occJump > 0.12) {
    issues.push("Occupancy jumps between last and first frame (loop pop risk)");
  }
  if (cJump > Math.max(first.centroidX, 8) * 0.35) {
    issues.push("Silhouette center jumps last→first (foot plant / hop discontinuity)");
  }

  // energy: average adjacent centroid deltas
  let energy = 0;
  for (let i = 1; i < probes.length; i++) {
    const a = probes[i - 1]!;
    const b = probes[i]!;
    energy += Math.hypot(b.centroidX - a.centroidX, b.centroidY - a.centroidY);
  }
  energy /= probes.length - 1;
  if (energy < 0.4) {
    tips.push("Very low motion energy — fine for idle; amplify for walk/run");
  }
  if (energy > 12) {
    tips.push("High inter-frame jumps — check continuity / teleporting limbs");
  }

  tips.push("Visual flip-test: play last→first and narrate the motion");
  tips.push("Cycles: alternating gaits spend ~half period mirrored");
  tips.push("Prefer video-first harvest (video2dsprite) for locomotion");

  let score = 1;
  score -= Math.min(0.5, occJump * 3);
  score -= Math.min(0.4, cJump / 40);
  score = Math.max(0, Math.min(1, score));

  const n = probes.length;
  const suggestedFps =
    opts?.preferFps ??
    (n <= 4 ? 6 : n <= 6 ? 8 : n <= 10 ? 10 : 12);

  return {
    ok: issues.length === 0 && score >= 0.55,
    score,
    issues,
    tips,
    suggestedFps,
  };
}

export const ANIM_LIBRARY_PRESETS = [
  { id: "idle", name: "Idle", frames: 4, fps: 6, tags: ["loop", "subtle"] },
  { id: "walk", name: "Walk", frames: 8, fps: 10, tags: ["loop", "locomotion"] },
  { id: "run", name: "Run", frames: 8, fps: 12, tags: ["loop", "locomotion"] },
  { id: "attack", name: "Attack", frames: 6, fps: 12, tags: ["oneshot"] },
  { id: "hit", name: "Hit", frames: 3, fps: 10, tags: ["oneshot"] },
  { id: "death", name: "Death", frames: 6, fps: 8, tags: ["oneshot"] },
  { id: "fx_burst", name: "FX burst", frames: 8, fps: 14, tags: ["fx"] },
] as const;
