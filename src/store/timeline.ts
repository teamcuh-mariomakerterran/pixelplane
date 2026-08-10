/**
 * Living collage timeline — moments on the plane you can scrub.
 * Not a full git of pixels; camera + status + board census as living track.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export type TimelineMoment = {
  id: string;
  label: string;
  t: number;
  camera: { x: number; y: number; zoom: number };
  boardCount: number;
  animCount: number;
  wireCount: number;
  note?: string;
  color: string;
};

type TimelineState = {
  moments: TimelineMoment[];
  activeId: string | null;
  showStrip: boolean;
  playing: boolean;

  setShowStrip: (v: boolean) => void;
  stamp: (label: string, note?: string) => string;
  jump: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  playThrough: () => void;
  stopPlay: () => void;
};

const COLORS = ["#e8a838", "#3ecfcf", "#c084fc", "#f472b6", "#4ecb71", "#60a5fa"];

let playTimer: ReturnType<typeof setTimeout> | null = null;

export const useTimeline = create<TimelineState>((set, get) => ({
  moments: [],
  activeId: null,
  showStrip: true,
  playing: false,

  setShowStrip: (showStrip) => set({ showStrip }),

  stamp: (label, note) => {
    const s = useStudio.getState();
    const id = uid("tm");
    const moment: TimelineMoment = {
      id,
      label,
      t: Date.now(),
      camera: { ...s.camera },
      boardCount: s.artboards.length,
      animCount: s.animRegions.length,
      wireCount: s.wireZones.length,
      note,
      color: COLORS[get().moments.length % COLORS.length]!,
    };
    set((st) => ({
      moments: [...st.moments.slice(-39), moment],
      activeId: id,
      showStrip: true,
    }));
    s.setStatus(`Timeline · ${label}`);
    return id;
  },

  jump: (id) => {
    const m = get().moments.find((x) => x.id === id);
    if (!m) return;
    useStudio.getState().setCamera({ ...m.camera });
    useStudio
      .getState()
      .setStatus(
        `Jumped · ${m.label} · ${m.boardCount} boards · ${new Date(m.t).toLocaleTimeString()}`,
      );
    set({ activeId: id });
  },

  remove: (id) =>
    set((st) => ({
      moments: st.moments.filter((m) => m.id !== id),
      activeId: st.activeId === id ? null : st.activeId,
    })),

  clear: () => {
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = null;
    }
    set({ moments: [], activeId: null, playing: false });
  },

  stopPlay: () => {
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = null;
    }
    set({ playing: false });
  },

  playThrough: () => {
    const moments = get().moments;
    if (moments.length < 2) {
      useStudio.getState().setStatus("Need 2+ timeline moments to play");
      return;
    }
    if (playTimer) {
      clearTimeout(playTimer);
      playTimer = null;
    }
    set({ playing: true, showStrip: true });
    let i = 0;
    const step = () => {
      const list = get().moments;
      if (i >= list.length) {
        set({ playing: false });
        useStudio.getState().setStatus("Timeline play complete");
        playTimer = null;
        return;
      }
      get().jump(list[i]!.id);
      i++;
      playTimer = setTimeout(step, 900);
    };
    step();
  },
}));

/** Helper for other systems to stamp without importing store gymnastics */
export function stampTimeline(label: string, note?: string) {
  try {
    return useTimeline.getState().stamp(label, note);
  } catch {
    return "";
  }
}
