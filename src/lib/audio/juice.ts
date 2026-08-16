/**
 * Juice mixer — layered SFX + granular clouds + stereo pan.
 * Unlock on first gesture. Buses: sfx → master. Never touches gameplay.
 */

export type JuiceSfx =
  | "blip"
  | "bass"
  | "noise"
  | "chord"
  | "siren"
  | "hit"
  | "smash"
  | "hop_in"
  | "hop_out"
  | "boost"
  | "foot"
  | "skid"
  | "sizzle";

type Osc = OscillatorType;

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let ambBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let crackleBuf: AudioBuffer | null = null;
let voices = 0;
const MAX_VOICES = 48;
let unlocked = false;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ac) {
    ac = new AC({ latencyHint: "interactive" });
    master = ac.createGain();
    master.gain.value = 0.82;
    sfxBus = ac.createGain();
    sfxBus.gain.value = 0.95;
    sfxBus.connect(master);
    ambBus = ac.createGain();
    ambBus.gain.value = 0.9;
    ambBus.connect(master);
    master.connect(ac.destination);
    bakeBuffers(ac);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void resume();
    });
  }
  return ac;
}

function bakeBuffers(c: AudioContext) {
  const sr = c.sampleRate;
  const n = Math.floor(sr * 1.6);
  noiseBuf = c.createBuffer(1, n, sr);
  const nd = noiseBuf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    b = b * 0.97 + white * 0.03;
    nd[i] = white * 0.55 + b * 0.9;
  }
  crackleBuf = c.createBuffer(1, n, sr);
  const cd = crackleBuf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    cd[i] = nd[i] * 0.35;
    if (Math.random() < 0.008) {
      const click = (Math.random() * 2 - 1) * 0.9;
      const len = 8 + ((i * 13) % 24);
      for (let k = 0; k < len && i + k < n; k++) {
        cd[i + k] += click * (1 - k / len);
      }
    }
  }
}

export function resume() {
  const c = ensure();
  if (c && c.state === "suspended") void c.resume();
}

/** Call synchronously from the first click / key. */
export function unlockAudio() {
  const c = ensure();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  unlocked = true;
}

export function isAudioUnlocked() {
  return unlocked && ac?.state === "running";
}

export type Mixer = {
  c: AudioContext;
  master: GainNode;
  sfxBus: GainNode;
  ambBus: GainNode;
  noiseBuf: AudioBuffer | null;
  crackleBuf: AudioBuffer | null;
};

export function getMixer(): Mixer | null {
  const c = ensure();
  if (!c || !master || !sfxBus || !ambBus) return null;
  return { c, master, sfxBus, ambBus, noiseBuf, crackleBuf };
}

/** World X → stereo pan. half ≈ how many world units = hard L/R. */
export function worldPan(worldX: number, listenerX: number, half = 240) {
  const p = (worldX - listenerX) / half;
  return Math.max(-1, Math.min(1, p));
}

function takeVoice() {
  if (voices >= MAX_VOICES) return false;
  voices++;
  return true;
}
function dropVoice() {
  voices = Math.max(0, voices - 1);
}

function jitter(base: number, amt = 0.08) {
  return base * (1 + (Math.random() * 2 - 1) * amt);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function panner(c: AudioContext, dest: AudioNode, pan: number) {
  const p = c.createStereoPanner();
  p.pan.setValueAtTime(clamp(pan, -1, 1), c.currentTime);
  p.connect(dest);
  return p;
}

function env(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  dur: number,
  peak: number,
  attack = 0.006,
) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g.connect(dest);
  return g;
}

function osc(
  c: AudioContext,
  dest: AudioNode,
  type: Osc,
  freq: number,
  t0: number,
  dur: number,
  peak: number,
  pan = 0,
) {
  if (!takeVoice()) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  const bus = panner(c, dest, pan);
  const g = env(c, bus, t0, dur, peak);
  o.connect(g);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  o.onended = () => {
    try {
      o.disconnect();
      g.disconnect();
      bus.disconnect();
    } catch {
      /* */
    }
    dropVoice();
  };
}

function noise(
  c: AudioContext,
  dest: AudioNode,
  t0: number,
  dur: number,
  peak: number,
  hp = 200,
  lp = 2400,
  pan = 0,
) {
  if (!noiseBuf || !takeVoice()) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const hi = c.createBiquadFilter();
  hi.type = "highpass";
  hi.frequency.value = hp;
  const lo = c.createBiquadFilter();
  lo.type = "lowpass";
  lo.frequency.value = lp;
  const bus = panner(c, dest, pan);
  const g = env(c, bus, t0, dur, peak, 0.004);
  src.connect(hi);
  hi.connect(lo);
  lo.connect(g);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  src.onended = () => {
    try {
      src.disconnect();
      hi.disconnect();
      lo.disconnect();
      g.disconnect();
      bus.disconnect();
    } catch {
      /* */
    }
    dropVoice();
  };
}

export type GrainCloud = {
  count: number;
  span: number;
  grain: [number, number];
  rate: [number, number];
  peak: number;
  pan: number;
  spread: number;
  hp: number;
  lp: number;
  crackle?: boolean;
};

/** Async grains: tiny Hann windows, random buffer offset + rate + micro-pan. */
export function spawnGrainCloud(c: AudioContext, dest: AudioNode, t0: number, spec: GrainCloud) {
  const buf = spec.crackle && crackleBuf ? crackleBuf : noiseBuf;
  if (!buf) return;
  const n = Math.min(spec.count, MAX_VOICES - voices);
  for (let i = 0; i < n; i++) {
    if (!takeVoice()) break;
    const when = t0 + Math.random() * spec.span;
    const dur = spec.grain[0] + Math.random() * (spec.grain[1] - spec.grain[0]);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.setValueAtTime(
      spec.rate[0] + Math.random() * (spec.rate[1] - spec.rate[0]),
      when,
    );
    const offset = Math.random() * Math.max(0.01, buf.duration - dur);
    const hi = c.createBiquadFilter();
    hi.type = "highpass";
    hi.frequency.value = spec.hp;
    const lo = c.createBiquadFilter();
    lo.type = "lowpass";
    lo.frequency.value = spec.lp;
    const pan = panner(
      c,
      dest,
      spec.pan + (Math.random() * 2 - 1) * spec.spread,
    );
    const g = c.createGain();
    const peak = spec.peak * (0.7 + Math.random() * 0.5);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + dur * 0.42);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    src.connect(hi);
    hi.connect(lo);
    lo.connect(g);
    g.connect(pan);
    src.start(when, offset);
    src.stop(when + dur + 0.012);
    src.onended = () => {
      try {
        src.disconnect();
        hi.disconnect();
        lo.disconnect();
        g.disconnect();
        pan.disconnect();
      } catch {
        /* */
      }
      dropVoice();
    };
  }
}

function duck(c: AudioContext, t0: number, depth = 0.35, rec = 0.18) {
  if (!sfxBus) return;
  const now = Math.max(t0, c.currentTime);
  sfxBus.gain.cancelScheduledValues(now);
  sfxBus.gain.setTargetAtTime(1 - depth, now, 0.02);
  sfxBus.gain.setTargetAtTime(1, now + rec, 0.06);
}

/** Layered one-shots. pan −1..1 (world left/right of camera). */
export function playJuiceSfx(kind: JuiceSfx, pitch = 1, pan = 0) {
  const c = ensure();
  if (!c || !sfxBus) return;
  if (c.state === "suspended") void c.resume();
  const t0 = c.currentTime + 0.008;
  const p = jitter(pitch, 0.06);
  const v = jitter(1, 0.1);
  const L = clamp(pan, -1, 1);

  switch (kind) {
    case "hit":
      osc(c, sfxBus, "square", 1480 * p, t0, 0.035, 0.055 * v, L);
      spawnGrainCloud(c, sfxBus, t0, {
        count: 6,
        span: 0.04,
        grain: [0.012, 0.028],
        rate: [0.8, 1.6],
        peak: 0.045 * v,
        pan: L,
        spread: 0.18,
        hp: 500,
        lp: 4200,
        crackle: true,
      });
      break;
    case "smash":
      duck(c, t0, 0.28, 0.16);
      osc(c, sfxBus, "sawtooth", 68 * p, t0, 0.2, 0.15 * v, L);
      osc(c, sfxBus, "triangle", 110 * p, t0 + 0.02, 0.16, 0.07 * v, L);
      osc(c, sfxBus, "square", 920 * p, t0 + 0.03, 0.05, 0.045 * v, L);
      spawnGrainCloud(c, sfxBus, t0, {
        count: 14,
        span: 0.11,
        grain: [0.014, 0.045],
        rate: [0.55, 1.9],
        peak: 0.055 * v,
        pan: L,
        spread: 0.35,
        hp: 180,
        lp: 3600,
        crackle: true,
      });
      break;
    case "hop_in":
      osc(c, sfxBus, "triangle", 130 * p, t0, 0.12, 0.1 * v, L);
      osc(c, sfxBus, "square", 520 * p, t0 + 0.04, 0.06, 0.05 * v, L);
      spawnGrainCloud(c, sfxBus, t0, {
        count: 5,
        span: 0.05,
        grain: [0.018, 0.04],
        rate: [0.6, 1.1],
        peak: 0.03 * v,
        pan: L,
        spread: 0.12,
        hp: 140,
        lp: 1400,
      });
      break;
    case "hop_out":
      osc(c, sfxBus, "square", 420 * p, t0, 0.05, 0.06 * v, L);
      osc(c, sfxBus, "triangle", 180 * p, t0 + 0.03, 0.08, 0.05 * v, L);
      break;
    case "boost":
      osc(c, sfxBus, "sawtooth", 90 * p, t0, 0.12, 0.05 * v, L);
      osc(c, sfxBus, "square", 880 * p, t0 + 0.02, 0.04, 0.035 * v, L);
      spawnGrainCloud(c, sfxBus, t0, {
        count: 10,
        span: 0.14,
        grain: [0.03, 0.07],
        rate: [0.7, 1.4],
        peak: 0.032 * v,
        pan: L,
        spread: 0.45,
        hp: 280,
        lp: 2000,
      });
      break;
    case "foot":
      osc(c, sfxBus, "triangle", 90 * p, t0, 0.03, 0.022 * v, L);
      spawnGrainCloud(c, sfxBus, t0, {
        count: 3,
        span: 0.02,
        grain: [0.012, 0.024],
        rate: [0.5, 0.9],
        peak: 0.028 * v,
        pan: L,
        spread: 0.08,
        hp: 90,
        lp: 900,
      });
      break;
    case "skid":
      spawnGrainCloud(c, sfxBus, t0, {
        count: 12,
        span: 0.1,
        grain: [0.02, 0.055],
        rate: [0.9, 1.8],
        peak: 0.038 * v,
        pan: L,
        spread: 0.28,
        hp: 700,
        lp: 2800,
        crackle: true,
      });
      break;
    case "blip":
      osc(c, sfxBus, "square", 520 * p, t0, 0.07, 0.08 * v, L);
      osc(c, sfxBus, "square", 780 * p, t0 + 0.06, 0.08, 0.06 * v, L);
      break;
    case "bass":
      osc(c, sfxBus, "sawtooth", 80 * p, t0, 0.22, 0.13 * v, L);
      osc(c, sfxBus, "triangle", 120 * p, t0 + 0.04, 0.18, 0.07 * v, L);
      break;
    case "noise":
      spawnGrainCloud(c, sfxBus, t0, {
        count: 8,
        span: 0.08,
        grain: [0.016, 0.04],
        rate: [0.7, 1.5],
        peak: 0.05 * v,
        pan: L,
        spread: 0.3,
        hp: 250,
        lp: 3000,
      });
      break;
    case "chord":
      osc(c, sfxBus, "triangle", 261 * p, t0, 0.32, 0.06 * v, L * 0.4);
      osc(c, sfxBus, "triangle", 329 * p, t0, 0.32, 0.06 * v, 0);
      osc(c, sfxBus, "triangle", 392 * p, t0, 0.32, 0.06 * v, L * -0.4);
      break;
    case "siren":
      osc(c, sfxBus, "sawtooth", 440 * p, t0, 0.14, 0.08 * v, L);
      osc(c, sfxBus, "sawtooth", 660 * p, t0 + 0.12, 0.14, 0.08 * v, L);
      osc(c, sfxBus, "sawtooth", 440 * p, t0 + 0.24, 0.14, 0.08 * v, L);
      break;
    case "sizzle":
      spawnGrainCloud(c, sfxBus, t0, {
        count: 6,
        span: 0.08,
        grain: [0.018, 0.045],
        rate: [1.1, 2.2],
        peak: 0.028 * v,
        pan: L,
        spread: 0.55,
        hp: 900,
        lp: 4200,
        crackle: true,
      });
      osc(c, sfxBus, "triangle", 2100 * p, t0, 0.04, 0.018 * v, L);
      break;
  }
}

let lastSizzle = 0;

/** Soft edge-sizzle while boil is live. */
export function tickBoilSizzle(on: boolean, intensity: number) {
  if (!on) return;
  const c = ensure();
  if (!c || !sfxBus || c.state !== "running") return;
  const now = c.currentTime;
  const gap = 0.16 - Math.min(0.08, intensity * 0.007);
  if (now - lastSizzle < gap) return;
  lastSizzle = now;
  spawnGrainCloud(c, sfxBus, now, {
    count: 2 + Math.round(intensity / 4),
    span: 0.12,
    grain: [0.02, 0.05],
    rate: [0.9, 1.8],
    peak: 0.012 + intensity * 0.0022,
    pan: (Math.random() * 2 - 1) * 0.4,
    spread: 0.5,
    hp: 700,
    lp: 3800,
    crackle: true,
  });
}
