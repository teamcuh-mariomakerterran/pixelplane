/**
 * Sound-as-sprite — chips on the plane that play layered juice SFX.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { playJuiceSfx, unlockAudio, type JuiceSfx } from "@/lib/audio/juice";

export type SoundKind = "blip" | "bass" | "noise" | "chord" | "siren";

export type SoundSprite = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: SoundKind;
  pitch: number;
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
  playKind: (kind: JuiceSfx, pitch?: number, pan?: number) => void;
  unlock: () => void;
};

const KINDS: SoundKind[] = ["blip", "bass", "noise", "chord", "siren"];

export function playPattern(kind: SoundKind, pitch = 1) {
  playJuiceSfx(kind, pitch);
}

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
    playJuiceSfx(k, 1);
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
    if (c) playJuiceSfx(c.kind, c.pitch);
  },
  playKind: (kind, pitch = 1, pan = 0) => playJuiceSfx(kind, pitch, pan),
  unlock: () => unlockAudio(),
}));
