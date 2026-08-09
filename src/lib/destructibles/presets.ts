import { uid } from "@/lib/utils";
import type { DestructibleProp } from "@/lib/pixel/types";

export function createDestructibleProp(opts: {
  name?: string;
  x: number;
  y: number;
  kind?: "crate" | "barrel" | "pot" | "sign" | "custom";
}): DestructibleProp {
  const kind = opts.kind ?? "crate";
  const names: Record<string, string> = {
    crate: "Wood crate",
    barrel: "Oil barrel",
    pot: "Clay pot",
    sign: "Street sign",
    custom: "Destructible",
  };
  const colors: Record<string, string> = {
    crate: "#c4a574",
    barrel: "#e85d5d",
    pot: "#d4a574",
    sign: "#94a3b8",
    custom: "#f97316",
  };
  const hp = kind === "barrel" ? 40 : kind === "sign" ? 25 : kind === "pot" ? 12 : 30;
  return {
    id: uid("dest"),
    name: opts.name ?? names[kind]!,
    x: opts.x,
    y: opts.y,
    w: kind === "sign" ? 28 : 36,
    h: kind === "sign" ? 48 : 36,
    maxHp: hp,
    hp,
    stages: [
      { id: uid("st"), hpMax: 1, label: "Pristine" },
      { id: uid("st"), hpMax: 0.5, label: "Damaged" },
      { id: uid("st"), hpMax: 0.15, label: "Critical" },
      { id: uid("st"), hpMax: 0, label: "Debris" },
    ],
    drops: kind === "crate" ? ["scrap", "coin"] : kind === "pot" ? ["coin"] : ["scrap"],
    debrisParticleId: null,
    folderId: null,
    folderPath: null,
    color: colors[kind]!,
    engineBreakable: true,
  };
}

export function currentStage(d: DestructibleProp) {
  const ratio = d.hp / Math.max(1, d.maxHp);
  // stages sorted by hpMax desc
  const sorted = [...d.stages].sort((a, b) => b.hpMax - a.hpMax);
  for (const s of sorted) {
    if (ratio >= s.hpMax - 0.001 || s.hpMax === 0) {
      // pick first stage where ratio is still in band
      if (ratio >= s.hpMax || s === sorted[sorted.length - 1]) {
        // better: find lowest stage where ratio <= previous and >= this
      }
    }
  }
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    const next = sorted[i + 1];
    const upper = s.hpMax;
    const lower = next ? next.hpMax : -1;
    if (ratio <= upper + 0.001 && ratio > lower) return s;
  }
  return sorted[sorted.length - 1]!;
}

export function applyDamage(d: DestructibleProp, amount: number): DestructibleProp {
  const hp = Math.max(0, d.hp - amount);
  return { ...d, hp };
}

export function isDestroyed(d: DestructibleProp) {
  return d.hp <= 0;
}
