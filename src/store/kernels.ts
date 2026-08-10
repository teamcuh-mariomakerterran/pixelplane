/**
 * Play kernels — skinnable mini play surfaces on/near the plane.
 * Solitaire was first; Inventory + Leads are next.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export type KernelKind = "inventory" | "leads";

export type InventorySlot = {
  id: string;
  label: string;
  filled: boolean;
  color: string;
};

export type LeadItem = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
};

export type KernelInstance = {
  id: string;
  kind: KernelKind;
  name: string;
  x: number; // screen-ish docked overlay uses fixed UI; keep for future plane pin
  y: number;
  minimized: boolean;
  // inventory
  slots?: InventorySlot[];
  selectedSlot?: string | null;
  // leads
  leads?: LeadItem[];
};

type KernelState = {
  instances: KernelInstance[];
  activeId: string | null;

  placeInventory: () => string;
  placeLeads: () => string;
  select: (id: string | null) => void;
  setMinimized: (id: string, v: boolean) => void;
  remove: (id: string) => void;
  toggleSlot: (id: string, slotId: string) => void;
  toggleLead: (id: string, leadId: string) => void;
  bindGearSheet: (id: string) => void;
};

const SLOT_COLORS = [
  "#3ecfcf",
  "#e8a838",
  "#c084fc",
  "#f472b6",
  "#4ecb71",
  "#60a5fa",
  "#fb923c",
  "#a78bfa",
];

function defaultSlots(): InventorySlot[] {
  const labels = [
    "Primary",
    "Sidearm",
    "Melee",
    "Helmet",
    "Visor",
    "Torso",
    "Gloves",
    "Boots",
    "Gadget",
    "Med",
    "Chip",
    "Key",
  ];
  return labels.map((label, i) => ({
    id: uid("slot"),
    label,
    filled: i < 3,
    color: SLOT_COLORS[i % SLOT_COLORS.length]!,
  }));
}

function defaultLeads(): LeadItem[] {
  return [
    {
      id: uid("lead"),
      title: "Meet with client",
      detail: "Confirm details",
      done: true,
    },
    {
      id: uid("lead"),
      title: "Gather info",
      detail: "Find contact",
      done: false,
    },
    {
      id: uid("lead"),
      title: "Review notes",
      detail: "Check data",
      done: true,
    },
    {
      id: uid("lead"),
      title: "Night District sweep",
      detail: "Map feed planes",
      done: false,
    },
  ];
}

export const useKernels = create<KernelState>((set, get) => ({
  instances: [],
  activeId: null,

  placeInventory: () => {
    const id = uid("ker");
    const inst: KernelInstance = {
      id,
      kind: "inventory",
      name: "Inventory kernel",
      x: 0,
      y: 0,
      minimized: false,
      slots: defaultSlots(),
      selectedSlot: null,
    };
    set((s) => ({ instances: [...s.instances, inst], activeId: id }));
    useStudio.getState().setStatus("Inventory kernel · skin with gear boards");
    return id;
  },

  placeLeads: () => {
    const id = uid("ker");
    const inst: KernelInstance = {
      id,
      kind: "leads",
      name: "Active leads",
      x: 0,
      y: 0,
      minimized: false,
      leads: defaultLeads(),
    };
    set((s) => ({ instances: [...s.instances, inst], activeId: id }));
    useStudio.getState().setStatus("Leads kernel · mission checklist");
    return id;
  },

  select: (activeId) => set({ activeId }),
  setMinimized: (id, minimized) =>
    set((s) => ({
      instances: s.instances.map((k) => (k.id === id ? { ...k, minimized } : k)),
    })),
  remove: (id) =>
    set((s) => ({
      instances: s.instances.filter((k) => k.id !== id),
      activeId: s.activeId === id ? null : s.activeId,
    })),

  toggleSlot: (id, slotId) =>
    set((s) => ({
      instances: s.instances.map((k) => {
        if (k.id !== id || !k.slots) return k;
        return {
          ...k,
          slots: k.slots.map((sl) =>
            sl.id === slotId ? { ...sl, filled: !sl.filled } : sl,
          ),
          selectedSlot: slotId,
        };
      }),
    })),

  toggleLead: (id, leadId) =>
    set((s) => ({
      instances: s.instances.map((k) => {
        if (k.id !== id || !k.leads) return k;
        return {
          ...k,
          leads: k.leads.map((l) =>
            l.id === leadId ? { ...l, done: !l.done } : l,
          ),
        };
      }),
    })),

  bindGearSheet: (id) => {
    const board = useStudio
      .getState()
      .artboards.find((b) => /gear|weapon|armor|inventory/i.test(b.name));
    if (!board) {
      useStudio.getState().setStatus("No gear board — Summon Goodies first");
      return;
    }
    useStudio.getState().selectArtboard(board.id);
    useStudio.getState().setStatus(`Inventory bound visual ref · ${board.name}`);
    get().select(id);
  },
}));
