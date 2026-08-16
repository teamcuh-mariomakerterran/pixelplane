/**
 * D_Debug — live runtime state → canvas ghost pulse.
 * City Engine reports active state; Studio state pads glow.
 */

export type RuntimePulse = {
  /** e.g. idle | walk | run | attack */
  state: string;
  /** optional clip / anim name */
  clip?: string;
  /** 0–1 intensity for halo */
  intensity: number;
  /** engine time */
  t: number;
  /** source */
  source: "city_engine" | "preview" | "external";
};

export type PulseBus = {
  pulse: RuntimePulse | null;
  history: RuntimePulse[];
};

export function createPulseBus(): PulseBus {
  return { pulse: null, history: [] };
}

export function pushPulse(bus: PulseBus, p: RuntimePulse, maxHist = 40): PulseBus {
  return {
    pulse: p,
    history: [...bus.history, p].slice(-maxHist),
  };
}

/** Infer coarse locomotion state from engine player */
export function inferStateFromEngine(opts: {
  mode: "foot" | "drive";
  speed: number;
  smashing?: boolean;
  indoor?: boolean;
}): string {
  if (opts.smashing) return "attack";
  if (opts.mode === "drive") return "run";
  if (opts.speed > 40) return "run";
  if (opts.speed > 8) return "walk";
  return "idle";
}

/** Halo alpha pulse curve */
export function haloAlpha(intensity: number, nowMs: number, seed = 0): number {
  const wave = 0.55 + 0.45 * Math.sin(nowMs / 180 + seed);
  return Math.min(1, intensity * wave);
}
