/**
 * Animation self-audit — offline knowledge rules that score / flag issues
 * a senior pixel animator would catch (no cloud, no LoRA).
 */

import { extractSilhouette, silhouetteOverlap } from "./silhouette";

export type AuditSeverity = "info" | "warn" | "error";

export type AuditFinding = {
  id: string;
  severity: AuditSeverity;
  frame?: number;
  message: string;
  hint: string;
};

export type AuditReport = {
  score: number; // 0–100
  findings: AuditFinding[];
  stats: {
    frames: number;
    emptyFrames: number;
    avgPixels: number;
    maxCentroidJump: number;
    minOverlap: number;
  };
};

export function auditAnimation(
  frames: Uint8ClampedArray[],
  frameW: number,
  frameH: number,
): AuditReport {
  const findings: AuditFinding[] = [];
  let empty = 0;
  let sumPx = 0;
  let maxJump = 0;
  let minOverlap = 1;

  const sils = frames.map((f) => extractSilhouette(f, frameW, frameH));

  sils.forEach((s, i) => {
    sumPx += s.pixelCount;
    if (s.pixelCount < 4) {
      empty++;
      findings.push({
        id: `empty_${i}`,
        severity: "error",
        frame: i,
        message: `Frame ${i + 1} is empty or nearly empty`,
        hint: "Remove it or paint/capture pixels — empty frames pop as flashes.",
      });
    }
  });

  for (let i = 1; i < sils.length; i++) {
    const a = sils[i - 1]!;
    const b = sils[i]!;
    if (a.pixelCount < 4 || b.pixelCount < 4) continue;
    const jump = Math.hypot(
      b.centroid.x - a.centroid.x,
      b.centroid.y - a.centroid.y,
    );
    maxJump = Math.max(maxJump, jump);
    const diag = Math.hypot(frameW, frameH);
    if (jump > diag * 0.28) {
      findings.push({
        id: `teleport_${i}`,
        severity: "warn",
        frame: i,
        message: `Large body jump between frame ${i} and ${i + 1} (${jump.toFixed(1)}px)`,
        hint: "Add an in-between or reduce root motion — reads as a teleport.",
      });
    }
    const ov = silhouetteOverlap(a, b);
    minOverlap = Math.min(minOverlap, ov);
    if (ov < 0.15 && a.pixelCount > 20 && b.pixelCount > 20) {
      findings.push({
        id: `overlap_${i}`,
        severity: "warn",
        frame: i,
        message: `Low silhouette overlap frame ${i}→${i + 1} (${(ov * 100).toFixed(0)}%)`,
        hint: "Shape changes too hard; onion-skin and ease the volume.",
      });
    }
    const areaRatio =
      Math.max(a.pixelCount, b.pixelCount) /
      Math.max(1, Math.min(a.pixelCount, b.pixelCount));
    if (areaRatio > 2.8) {
      findings.push({
        id: `volume_${i}`,
        severity: "warn",
        frame: i,
        message: `Volume pop frame ${i}→${i + 1} (area ×${areaRatio.toFixed(1)})`,
        hint: "Keep mass consistent unless it's a deliberate squash/stretch beat.",
      });
    }
  }

  // Foot plant heuristic: feet anchor Y variance for walk-ish strips
  if (sils.length >= 4) {
    const footYs = sils.filter((s) => s.pixelCount > 10).map((s) => s.anchors.feet.y);
    if (footYs.length >= 4) {
      const mean = footYs.reduce((a, b) => a + b, 0) / footYs.length;
      const varSum =
        footYs.reduce((a, y) => a + (y - mean) * (y - mean), 0) / footYs.length;
      if (varSum > frameH * frameH * 0.04) {
        findings.push({
          id: "foot_slide",
          severity: "info",
          message: "Feet anchor height varies a lot across the strip",
          hint: "For walks, plant contact frames; for jumps, ignore this.",
        });
      }
    }
  }

  if (frames.length < 2) {
    findings.push({
      id: "short",
      severity: "info",
      message: "Only one frame — not a cycle yet",
      hint: "Slice a sheet or add frames before secondary motion shines.",
    });
  }

  // Score
  let score = 100;
  for (const f of findings) {
    if (f.severity === "error") score -= 18;
    else if (f.severity === "warn") score -= 8;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    findings,
    stats: {
      frames: frames.length,
      emptyFrames: empty,
      avgPixels: frames.length ? sumPx / frames.length : 0,
      maxCentroidJump: maxJump,
      minOverlap: minOverlap === 1 && frames.length < 2 ? 1 : minOverlap,
    },
  };
}

export function formatAuditSummary(r: AuditReport): string {
  const nErr = r.findings.filter((f) => f.severity === "error").length;
  const nWarn = r.findings.filter((f) => f.severity === "warn").length;
  return `Anim audit ${r.score}/100 · ${nErr} errors · ${nWarn} warns · ${r.stats.frames} frames`;
}
