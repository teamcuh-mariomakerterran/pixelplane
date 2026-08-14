/**
 * City ambient beds — continuous rumble / neon / wind / room,
 * plus traffic pass-bys and distant horns. Presentation only.
 */

import { getMixer, spawnGrainCloud, type Mixer } from "@/lib/audio/juice";

export type AmbienceInput = {
  listenerX: number;
  wanted: number;
  driving: boolean;
  indoor: boolean;
  dayPhase: number;
  speed: number;
};

type Bed = {
  gain: GainNode;
  filter?: BiquadFilterNode;
  stop: () => void;
};

let beds: {
  rumble?: Bed;
  neon?: Bed;
  neon2?: Bed;
  room?: Bed;
  wind?: Bed;
} = {};
let started = false;
let nextPass = 0;
let nextHorn = 0;
let nextTick = 0;
let lastGrain = 0;

function ramp(g: AudioParam, v: number, now: number, t = 0.12) {
  g.setTargetAtTime(Math.max(0.0001, v), now, t);
}

function makeNoiseBed(
  m: Mixer,
  lp: number,
  rate = 0.65,
  hp = 40,
): Bed {
  const src = m.c.createBufferSource();
  src.buffer = m.noiseBuf;
  src.loop = true;
  src.playbackRate.value = rate;
  const hi = m.c.createBiquadFilter();
  hi.type = "highpass";
  hi.frequency.value = hp;
  const lo = m.c.createBiquadFilter();
  lo.type = "lowpass";
  lo.frequency.value = lp;
  const g = m.c.createGain();
  g.gain.value = 0.0001;
  src.connect(hi);
  hi.connect(lo);
  lo.connect(g);
  g.connect(m.ambBus);
  src.start();
  return {
    gain: g,
    filter: lo,
    stop: () => {
      try {
        src.stop();
        src.disconnect();
        hi.disconnect();
        lo.disconnect();
        g.disconnect();
      } catch {
        /* */
      }
    },
  };
}

function makeHum(m: Mixer, freq: number): Bed {
  const o = m.c.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  const lo = m.c.createBiquadFilter();
  lo.type = "lowpass";
  lo.frequency.value = 520;
  const g = m.c.createGain();
  g.gain.value = 0.0001;
  o.connect(lo);
  lo.connect(g);
  g.connect(m.ambBus);
  o.start();
  return {
    gain: g,
    filter: lo,
    stop: () => {
      try {
        o.stop();
        o.disconnect();
        lo.disconnect();
        g.disconnect();
      } catch {
        /* */
      }
    },
  };
}

function startBeds(m: Mixer) {
  if (started) return;
  if (!m.noiseBuf || m.c.state !== "running") return;
  beds.rumble = makeNoiseBed(m, 180, 0.55, 30);
  beds.wind = makeNoiseBed(m, 1600, 0.9, 280);
  beds.room = makeNoiseBed(m, 700, 0.45, 80);
  beds.neon = makeHum(m, 78);
  beds.neon2 = makeHum(m, 156);
  started = true;
  const now = m.c.currentTime;
  nextPass = now + 2.2;
  nextHorn = now + 8;
  nextTick = now + 1.4;
}

export function stopCityAmbience() {
  const m = getMixer();
  const now = m?.c.currentTime ?? 0;
  for (const b of Object.values(beds)) {
    if (!b) continue;
    try {
      b.gain.gain.setTargetAtTime(0.0001, now, 0.04);
    } catch {
      /* */
    }
    window.setTimeout(() => b.stop(), 220);
  }
  beds = {};
  started = false;
}

/** 0 dawn · 0.25 day · 0.5 dusk · 0.75 night */
function nightAmt(phase: number) {
  if (phase > 0.58 && phase < 0.92) {
    return phase < 0.75 ? (phase - 0.58) / 0.17 : (0.92 - phase) / 0.17;
  }
  return 0;
}
function duskAmt(phase: number) {
  if (phase > 0.4 && phase < 0.58) return (phase - 0.4) / 0.18;
  if (phase > 0.58 && phase < 0.7) return 1 - (phase - 0.58) / 0.12;
  return 0;
}
function dawnAmt(phase: number) {
  if (phase < 0.12) return 1 - phase / 0.12;
  if (phase > 0.92) return (phase - 0.92) / 0.08;
  return 0;
}

function trafficPass(m: Mixer, now: number) {
  if (!m.noiseBuf) return;
  const src = m.c.createBufferSource();
  src.buffer = m.noiseBuf;
  src.loop = true;
  src.playbackRate.setValueAtTime(1.18, now);
  src.playbackRate.linearRampToValueAtTime(0.72, now + 1.35);
  const lo = m.c.createBiquadFilter();
  lo.type = "lowpass";
  lo.frequency.setValueAtTime(900, now);
  lo.frequency.linearRampToValueAtTime(1400, now + 0.55);
  lo.frequency.linearRampToValueAtTime(700, now + 1.35);
  const g = m.c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.045, now + 0.28);
  g.gain.linearRampToValueAtTime(0.0001, now + 1.4);
  const pan = m.c.createStereoPanner();
  const dir = Math.random() > 0.5 ? 1 : -1;
  pan.pan.setValueAtTime(-0.92 * dir, now);
  pan.pan.linearRampToValueAtTime(0.92 * dir, now + 1.4);
  src.connect(lo);
  lo.connect(g);
  g.connect(pan);
  pan.connect(m.ambBus);
  src.start(now);
  src.stop(now + 1.45);
  src.onended = () => {
    try {
      src.disconnect();
      lo.disconnect();
      g.disconnect();
      pan.disconnect();
    } catch {
      /* */
    }
  };
}

function distantHorn(m: Mixer, now: number, pan: number) {
  const p = m.c.createStereoPanner();
  p.pan.setValueAtTime(pan, now);
  p.connect(m.ambBus);
  for (const [f, peak] of [
    [196, 0.028],
    [247, 0.018],
  ] as const) {
    const o = m.c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, now);
    const g = m.c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    o.connect(g);
    g.connect(p);
    o.start(now);
    o.stop(now + 0.9);
    o.onended = () => {
      try {
        o.disconnect();
        g.disconnect();
      } catch {
        /* */
      }
    };
  }
}

export function tickCityAmbience(a: AmbienceInput) {
  const m = getMixer();
  if (!m || m.c.state !== "running") return;
  startBeds(m);
  if (!started || !beds.rumble || !beds.wind || !beds.room || !beds.neon || !beds.neon2) {
    return;
  }
  const now = m.c.currentTime;
  const night = nightAmt(a.dayPhase);
  const dusk = duskAmt(a.dayPhase);
  const dawn = dawnAmt(a.dayPhase);
  const heat = Math.min(1, a.wanted / 5);
  const spd = Math.min(1, Math.abs(a.speed) / 140);
  const inside = a.indoor ? 1 : 0;

  ramp(beds.rumble.gain.gain, inside ? 0.012 : 0.032 + heat * 0.018 + (a.driving ? 0.01 : 0), now);
  if (beds.rumble.filter) {
    ramp(beds.rumble.filter.frequency, inside ? 140 : 200 + heat * 40, now, 0.2);
  }
  ramp(
    beds.neon.gain.gain,
    inside ? 0.006 : (night * 0.028 + dusk * 0.016) * (1 + heat * 0.3),
    now,
  );
  ramp(beds.neon2.gain.gain, inside ? 0.003 : night * 0.014 + dusk * 0.008, now);
  ramp(beds.room.gain.gain, inside ? 0.038 : 0.004, now);
  ramp(
    beds.wind.gain.gain,
    inside ? 0.004 : (a.driving ? 0.018 + spd * 0.04 : 0.008 + night * 0.01),
    now,
  );

  if (now - lastGrain > 0.42) {
    lastGrain = now;
    spawnGrainCloud(m.c, m.ambBus, now, {
      count: inside ? 2 : 4 + Math.round(night * 3) + Math.round(dawn * 2),
      span: 0.38,
      grain: dawn > 0.3 ? [0.03, 0.07] : [0.045, 0.12],
      rate: dawn > 0.3 ? [0.9, 1.6] : [0.35, 0.85],
      peak: inside ? 0.01 : 0.014 + night * 0.01 + heat * 0.008,
      pan: 0,
      spread: 0.88,
      hp: inside ? 200 : dawn > 0.3 ? 600 : 70,
      lp: inside ? 800 : dawn > 0.3 ? 3200 : 1200 + night * 600,
      crackle: heat > 0.45,
    });
  }

  if (!inside && now >= nextPass) {
    trafficPass(m, now);
    nextPass = now + 4.5 + Math.random() * 6 - heat * 1.2;
  }
  if (!inside && now >= nextHorn) {
    distantHorn(m, now, (Math.random() * 2 - 1) * 0.8);
    nextHorn = now + 11 + Math.random() * 10;
  }
  if (!inside && night > 0.35 && now >= nextTick) {
    spawnGrainCloud(m.c, m.ambBus, now, {
      count: 3,
      span: 0.05,
      grain: [0.02, 0.04],
      rate: [1.2, 2.1],
      peak: 0.016,
      pan: (Math.random() * 2 - 1) * 0.7,
      spread: 0.15,
      hp: 900,
      lp: 3800,
      crackle: true,
    });
    nextTick = now + 1.6 + Math.random() * 2.4;
  }
}

export function ambienceLabel(phase: number, indoor: boolean) {
  if (indoor) return "room tone";
  if (nightAmt(phase) > 0.45) return "night · neon";
  if (duskAmt(phase) > 0.4) return "dusk · hum";
  if (dawnAmt(phase) > 0.4) return "dawn";
  return "day · street";
}
