/**
 * Sound-as-sprite — chips on the plane that play Web Audio patterns.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";

export type SoundKind = "blip" | "bass" | "noise" | "chord" | "siren";

export type SoundSprite = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: SoundKind;
  pitch: number; // 0.5–2
};

type SoundState = {
  chips: SoundSprite[];
  activeId: string | null;
  show: boolean;

  setShow: (v: boolean) => void;
  place: (x: number, y: number, kind?: SoundKind) => string;
  select: (id: string | null) => void;
  move: (id: string, x: number, y: number) => void;
  remove: (id: string) => void;
  play: (id: string) => void;
  playKind: (kind: SoundKind, pitch?: number) => void;
};

let audioCtx: AudioContext | null = null;
function ctx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function tone(
  ac: AudioContext,
  freq: number,
  type: OscillatorType,
  start: number,
  dur: number,
  gain = 0.12,
) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g);
  g.connect(ac.destination);
  o.start(start);
  o.stop(start + dur);
}

export function playPattern(kind: SoundKind, pitch = 1) {
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const t0 = ac.currentTime + 0.02;
  const p = pitch;
  if (kind === "blip") {
    tone(ac, 520 * p, "square", t0, 0.08, 0.1);
    tone(ac, 780 * p, "square", t0 + 0.07, 0.1, 0.08);
  } else if (kind === "bass") {
    tone(ac, 80 * p, "sawtooth", t0, 0.25, 0.14);
    tone(ac, 120 * p, "triangle", t0 + 0.05, 0.2, 0.08);
  } else if (kind === "noise") {
    // filtered noise via many short square blips
    for (let i = 0; i < 12; i++) {
      tone(ac, 200 + Math.random() * 1200, "square", t0 + i * 0.015, 0.02, 0.04);
    }
  } else if (kind === "chord") {
    tone(ac, 261 * p, "triangle", t0, 0.35, 0.07);
    tone(ac, 329 * p, "triangle", t0, 0.35, 0.07);
    tone(ac, 392 * p, "triangle", t0, 0.35, 0.07);
  } else if (kind === "siren") {
    tone(ac, 440 * p, "sawtooth", t0, 0.15, 0.09);
    tone(ac, 660 * p, "sawtooth", t0 + 0.12, 0.15, 0.09);
    tone(ac, 440 * p, "sawtooth", t0 + 0.24, 0.15, 0.09);
  }
}

const KINDS: SoundKind[] = ["blip", "bass", "noise", "chord", "siren"];

export const useSoundSprites = create<SoundState>((set, get) => ({
  chips: [],
  activeId: null,
  show: true,

  setShow: (show) => set({ show }),

  place: (x, y, kind) => {
    const id = uid("sfx");
    const k = kind ?? KINDS[get().chips.length % KINDS.length]!;
    const chip: SoundSprite = {
      id,
      name: `SFX · ${k}`,
      x,
      y,
      kind: k,
      pitch: 1,
    };
    set((s) => ({ chips: [...s.chips, chip], activeId: id }));
    playPattern(k, 1);
    return id;
  },

  select: (activeId) => set({ activeId }),
  move: (id, x, y) =>
    set((s) => ({
      chips: s.chips.map((c) => (c.id === id ? { ...c, x, y } : c)),
    })),
  remove: (id) =>
    set((s) => ({
      chips: s.chips.filter((c) => c.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    })),
  play: (id) => {
    const c = get().chips.find((x) => x.id === id);
    if (c) playPattern(c.kind, c.pitch);
  },
  playKind: (kind, pitch = 1) => playPattern(kind, pitch),
}));
