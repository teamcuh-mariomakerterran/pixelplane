/**
 * Global icon theme preference — amber / cyan pixel packs or Lucide vector.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IconTheme } from "./pixel-packs";

type IconThemeState = {
  theme: IconTheme;
  setTheme: (t: IconTheme) => void;
  cycleTheme: () => void;
};

const ORDER: IconTheme[] = ["amber", "cyan", "vector"];

export const useIconTheme = create<IconThemeState>()(
  persist(
    (set, get) => ({
      theme: "amber",
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const i = ORDER.indexOf(get().theme);
        set({ theme: ORDER[(i + 1) % ORDER.length]! });
      },
    }),
    { name: "pixelplane-icon-theme" },
  ),
);
