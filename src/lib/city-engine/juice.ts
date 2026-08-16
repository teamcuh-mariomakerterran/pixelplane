/**
 * Presentation juice — never changes gameplay outcomes.
 * Owned here so sim.ts stays the orchestrator, not a particle dump.
 */

import type { JuiceSfx } from "@/lib/audio/juice";
import { worldPan } from "@/lib/audio/juice";
import type { EngineState } from "./sim";

export type RibbonPt = {
  x: number;
  y: number;
  t: number;
};

export type ProcBurst = {
  x: number;
  y: number;
  kind: "explosion" | "spark" | "debris";
  seed: number;
  hue: number;
  intensity: number;
  age: number;
  life: number;
};

export type JuicePop = {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  vy: number;
  color: string;
};

export type JuiceRing = {
  x: number;
  y: number;
  life: number;
  max: number;
  color: string;
};

export type JuiceShard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  life: number;
  w: number;
  h: number;
  color: string;
};

export type JuiceMote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
};

export type JuiceGhost = {
  x: number;
  y: number;
  rot: number;
  life: number;
  max: number;
};

export type JuiceSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

export function addPop(
  s: EngineState,
  x: number,
  y: number,
  text: string,
  color: string,
) {
  s.pops.push({
    x,
    y,
    text,
    life: 0.9,
    max: 0.9,
    vy: -48,
    color,
  });
  if (s.pops.length > 18) s.pops.splice(0, s.pops.length - 18);
}

export function burstDust(s: EngineState, x: number, y: number, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 20 + Math.random() * 50;
    s.dust.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      life: 0.35 + Math.random() * 0.4,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
    });
  }
  if (s.dust.length > 120) s.dust.splice(0, s.dust.length - 120);
}

export function burstRing(
  s: EngineState,
  x: number,
  y: number,
  color: string,
  max = 0.45,
) {
  if (!s.rings) s.rings = [];
  s.rings.push({ x, y, life: max, max, color });
  if (s.rings.length > 16) s.rings.splice(0, s.rings.length - 16);
}

export function burstShards(
  s: EngineState,
  x: number,
  y: number,
  n: number,
  color: string,
) {
  if (!s.shards) s.shards = [];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 110;
    s.shards.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 20,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 14,
      life: 0.35 + Math.random() * 0.45,
      w: 2 + Math.random() * 4,
      h: 2 + Math.random() * 3,
      color,
    });
  }
  if (s.shards.length > 90) s.shards.splice(0, s.shards.length - 90);
}

export function spawnGhost(s: EngineState, x: number, y: number, rot: number) {
  if (!s.ghosts) s.ghosts = [];
  s.ghosts.push({ x, y, rot, life: 0.22, max: 0.22 });
  if (s.ghosts.length > 18) s.ghosts.splice(0, s.ghosts.length - 18);
}

export function burstSparks(s: EngineState, x: number, y: number, n: number) {
  if (!s.sparks) s.sparks = [];
  const pal = ["#fff7d6", "#fb923c", "#3ecfcf", "#f472b6", "#e8a838"];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 70 + Math.random() * 180;
    s.sparks.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      life: 0.28 + Math.random() * 0.35,
      color: pal[i % pal.length]!,
    });
  }
  if (s.sparks.length > 80) s.sparks.splice(0, s.sparks.length - 80);
}

export function hopJuice(s: EngineState, label: string) {
  s.punch = Math.min(1, s.punch + 0.55);
  s.squash = Math.min(1, s.squash + 0.55);
  s.trauma = Math.min(1, s.trauma + 0.18);
  burstDust(s, s.player.x, s.player.y, 10);
  burstRing(s, s.player.x, s.player.y, "#3ecfcf", 0.35);
  addPop(s, s.player.x, s.player.y - 16, label, "#3ecfcf");
  s.letterbox = Math.min(1, (s.letterbox || 0) + 0.55);
  s.flash = Math.max(s.flash || 0, 0.35);
  spawnGhost(s, s.player.x, s.player.y, s.player.rot);
}

export function playJuice(
  s: EngineState,
  kind: JuiceSfx,
  pitch = 1,
  worldX?: number,
) {
  const pan = worldPan(worldX ?? s.player.x, s.camX);
  s.host.playSfx(kind, pitch, pan);
}

export function sampleRibbon(
  s: EngineState,
  x: number,
  y: number,
  force = false,
) {
  if (!s.ribbon) s.ribbon = [];
  const last = s.ribbon[s.ribbon.length - 1];
  if (!force && last && Math.hypot(last.x - x, last.y - y) < 3.5) return;
  s.ribbon.push({ x, y, t: s.t });
  if (s.ribbon.length > 36) s.ribbon.splice(0, s.ribbon.length - 36);
}

export function juiceImpact(
  s: EngineState,
  x: number,
  y: number,
  destroyed: boolean,
) {
  s.combo += 1;
  s.comboTimer = 1.7;
  const add = destroyed ? 0.72 : 0.36;
  s.trauma = Math.min(1, s.trauma + add);
  s.shake = s.trauma;
  s.hitstop = Math.max(s.hitstop, destroyed ? 0.08 : 0.04);
  s.punch = Math.min(1, s.punch + (destroyed ? 0.7 : 0.32));
  s.squash = Math.min(1, s.squash + (destroyed ? 0.85 : 0.45));
  const dx = s.camX - x;
  const dy = s.camY - y;
  const len = Math.hypot(dx, dy) || 1;
  s.kickX = (dx / len) * (destroyed ? 10 : 5);
  s.kickY = (dy / len) * (destroyed ? 10 : 5);
  if (destroyed) {
    playJuice(s, "smash", 0.92 + Math.random() * 0.16 + s.combo * 0.03, x);
    if (s.combo >= 5) playJuice(s, "blip", 1.2 + s.combo * 0.04, x);
  } else {
    playJuice(s, "hit", 0.9 + Math.random() * 0.2, x);
  }
  if (destroyed) {
    addPop(
      s,
      x,
      y - 12,
      s.combo > 1 ? `${s.combo}× SMASH` : "SMASH",
      s.combo >= 5 ? "#f472b6" : "#fb923c",
    );
    burstDust(s, x, y, 14);
    burstRing(s, x, y, s.combo >= 5 ? "#f472b6" : "#fb923c", 0.5);
    burstShards(s, x, y, 10 + Math.min(8, s.combo), "#e8a838");
    burstSparks(s, x, y, 10 + Math.min(10, s.combo));
    s.chroma = Math.min(1, s.chroma + 0.55);
    s.flash = 1;
    spawnGhost(s, x, y, s.player.rot);
    if (s.combo >= 5) {
      s.letterbox = 1;
      spawnGhost(s, x - 8, y, s.player.rot);
      spawnGhost(s, x + 8, y, s.player.rot);
    }
    if (s.combo >= 8) {
      s.hitstop = Math.max(s.hitstop, 0.14);
      s.punch = 1;
      addPop(s, x, y - 28, "OVERDRIVE", "#f472b6");
      playJuice(s, "chord", 1.15 + s.combo * 0.02, x);
    }
  } else {
    addPop(s, x, y - 8, "HIT", "#e8a838");
    burstDust(s, x, y, 6);
    burstRing(s, x, y, "#e8a838", 0.28);
    burstShards(s, x, y, 4, "#c4a35a");
    s.chroma = Math.min(1, s.chroma + 0.22);
  }
  sampleRibbon(s, x, y, true);
  const spec = s.host.procBurst(destroyed, s.smashCount);
  if (spec) {
    if (!s.procBursts) s.procBursts = [];
    s.procBursts.push({
      x,
      y,
      kind: spec.kind,
      seed: spec.seed,
      hue: spec.hue,
      intensity: spec.intensity,
      age: 0,
      life: spec.life,
    });
    if (s.procBursts.length > 10) s.procBursts.splice(0, s.procBursts.length - 10);
  }
}

export function tickJuice(s: EngineState, dt: number) {
  s.pops = s.pops
    .map((p) => ({
      ...p,
      life: p.life - dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 18 * dt,
    }))
    .filter((p) => p.life > 0);
  s.skids = s.skids
    .map((k) => ({ ...k, life: k.life - dt }))
    .filter((k) => k.life > 0);
  s.boostTrail = s.boostTrail
    .map((k) => ({ ...k, life: k.life - dt }))
    .filter((k) => k.life > 0);
  s.rings = (s.rings ?? [])
    .map((r) => ({ ...r, life: r.life - dt }))
    .filter((r) => r.life > 0);
  s.shards = (s.shards ?? [])
    .map((sh) => ({
      ...sh,
      life: sh.life - dt,
      x: sh.x + sh.vx * dt,
      y: sh.y + sh.vy * dt,
      vy: sh.vy + 140 * dt,
      rot: sh.rot + sh.spin * dt,
    }))
    .filter((sh) => sh.life > 0);
  s.ghosts = (s.ghosts ?? [])
    .map((g) => ({ ...g, life: g.life - dt }))
    .filter((g) => g.life > 0);
  s.sparks = (s.sparks ?? [])
    .map((sp) => ({
      ...sp,
      life: sp.life - dt,
      x: sp.x + sp.vx * dt,
      y: sp.y + sp.vy * dt,
      vy: sp.vy + 220 * dt,
    }))
    .filter((sp) => sp.life > 0);
  s.motes = (s.motes ?? [])
    .map((m) => ({
      ...m,
      life: m.life - dt,
      x: m.x + m.vx * dt,
      y: m.y + m.vy * dt,
    }))
    .filter((m) => m.life > 0);
  const cut = s.t - 0.26;
  s.ribbon = (s.ribbon ?? []).filter((p) => p.t >= cut);
  s.procBursts = (s.procBursts ?? [])
    .map((b) => ({ ...b, age: b.age + dt }))
    .filter((b) => b.age < b.life);

  if (s.hitstop > 0) return;

  s.trauma = Math.max(0, s.trauma - dt * 1.85);
  s.shake = s.trauma;
  s.punch = Math.max(0, s.punch - dt * 4.2);
  s.squash = Math.max(0, s.squash - dt * 5.5);
  s.kickX *= Math.max(0, 1 - dt * 8);
  s.kickY *= Math.max(0, 1 - dt * 8);
  s.chroma = Math.max(0, s.chroma - dt * 2.4);
  s.flash = Math.max(0, (s.flash || 0) - dt * 4.8);
  s.letterbox = Math.max(0, (s.letterbox || 0) - dt * 1.6);
  s.bank *= Math.max(0, 1 - dt * 5);
  if (Math.abs(s.bank) < 0.02) s.bank = 0;
  s.ghostCd = Math.max(0, (s.ghostCd || 0) - dt);
  if (Math.abs(s.kickX) < 0.15) s.kickX = 0;
  if (Math.abs(s.kickY) < 0.15) s.kickY = 0;
  s.comboTimer = Math.max(0, s.comboTimer - dt);
  if (s.comboTimer <= 0) s.combo = 0;
  if (s.dialog) {
    s.dialog.t -= dt;
    if (s.dialog.t <= 0) s.dialog = null;
  }
}
