/**
 * Rule Cards — sticky logic on the plane (Wave C §6.6).
 * WHEN → THEN DSL for Studio + City Engine export / live remap.
 */

import { create } from "zustand";
import { uid } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { stampTimeline } from "@/store/timeline";

export type RuleWhen =
  | { kind: "key"; code: string } // KeyboardEvent.code
  | { kind: "smash" }
  | { kind: "enter_vehicle" }
  | { kind: "wanted_above"; level: number }
  | { kind: "sprint" }
  | { kind: "brake" };

export type RuleThen =
  | { kind: "status"; text: string }
  | { kind: "wanted_delta"; amount: number }
  | { kind: "play_siren" }
  | { kind: "hint"; text: string }
  | { kind: "boost_speed"; mult: number }
  | { kind: "remap_key"; from: string; to: string };

export type RuleCard = {
  id: string;
  name: string;
  x: number;
  y: number;
  when: RuleWhen;
  then: RuleThen;
  enabled: boolean;
  color: string;
};

type RuleState = {
  cards: RuleCard[];
  activeId: string | null;
  showOnPlane: boolean;

  setShowOnPlane: (v: boolean) => void;
  select: (id: string | null) => void;
  placeCard: (partial?: Partial<RuleCard>) => string;
  seedStreetHeatDeck: () => void;
  updateCard: (id: string, patch: Partial<RuleCard>) => void;
  removeCard: (id: string) => void;
  moveCard: (id: string, x: number, y: number) => void;
  toggleEnabled: (id: string) => void;
  exportInputMapJson: () => string;
};

const COLORS = ["#e8a838", "#3ecfcf", "#c084fc", "#f472b6", "#4ecb71", "#fb923c"];

const PRESETS: Array<Omit<RuleCard, "id" | "x" | "y">> = [
  {
    name: "F → Smash",
    when: { kind: "key", code: "KeyF" },
    then: { kind: "status", text: "RULE · smash contract armed" },
    enabled: true,
    color: "#fb923c",
  },
  {
    name: "Smash → Heat+",
    when: { kind: "smash" },
    then: { kind: "wanted_delta", amount: 0.4 },
    enabled: true,
    color: "#f87171",
  },
  {
    name: "Wanted 2 → Siren",
    when: { kind: "wanted_above", level: 2 },
    then: { kind: "play_siren" },
    enabled: true,
    color: "#ef4444",
  },
  {
    name: "Shift → Boost",
    when: { kind: "sprint" },
    then: { kind: "boost_speed", mult: 1.2 },
    enabled: true,
    color: "#3ecfcf",
  },
  {
    name: "Space → Brake",
    when: { kind: "brake" },
    then: { kind: "hint", text: "RULE · hard brake" },
    enabled: true,
    color: "#a78bfa",
  },
  {
    name: "Enter car → Status",
    when: { kind: "enter_vehicle" },
    then: { kind: "status", text: "RULE · vehicle contract live" },
    enabled: true,
    color: "#4ecb71",
  },
];

export function whenLabel(w: RuleWhen): string {
  switch (w.kind) {
    case "key":
      return `Key ${w.code.replace(/^Key/, "")}`;
    case "smash":
      return "On smash";
    case "enter_vehicle":
      return "Enter vehicle";
    case "wanted_above":
      return `Wanted ≥ ${w.level}`;
    case "sprint":
      return "Sprint (Shift)";
    case "brake":
      return "Brake (Space)";
  }
}

export function thenLabel(t: RuleThen): string {
  switch (t.kind) {
    case "status":
      return `Status: ${t.text}`;
    case "wanted_delta":
      return `Wanted ${t.amount >= 0 ? "+" : ""}${t.amount}`;
    case "play_siren":
      return "Play siren";
    case "hint":
      return `Hint: ${t.text}`;
    case "boost_speed":
      return `Speed ×${t.mult}`;
    case "remap_key":
      return `Remap ${t.from}→${t.to}`;
  }
}

export const useRuleCards = create<RuleState>((set, get) => ({
  cards: [],
  activeId: null,
  showOnPlane: true,

  setShowOnPlane: (showOnPlane) => set({ showOnPlane }),

  select: (activeId) => set({ activeId }),

  placeCard: (partial) => {
    const s = useStudio.getState();
    const cam = s.camera;
    const id = uid("rule");
    const n = get().cards.length;
    const card: RuleCard = {
      id,
      name: partial?.name ?? `Rule ${n + 1}`,
      x: partial?.x ?? (320 - cam.x) / (cam.zoom || 1) + n * 12,
      y: partial?.y ?? (180 - cam.y) / (cam.zoom || 1) + n * 12,
      when: partial?.when ?? { kind: "key", code: "KeyF" },
      then: partial?.then ?? { kind: "status", text: "Rule fired" },
      enabled: partial?.enabled ?? true,
      color: partial?.color ?? COLORS[n % COLORS.length]!,
    };
    set((st) => ({ cards: [...st.cards, card], activeId: id }));
    s.setStatus(`Rule card · ${card.name}`);
    stampTimeline("Rule card", card.name);
    return id;
  },

  seedStreetHeatDeck: () => {
    const s = useStudio.getState();
    const cam = s.camera;
    const baseX = (280 - cam.x) / (cam.zoom || 1);
    const baseY = (140 - cam.y) / (cam.zoom || 1);
    const cards: RuleCard[] = PRESETS.map((p, i) => ({
      ...p,
      id: uid("rule"),
      x: baseX + (i % 3) * 168,
      y: baseY + Math.floor(i / 3) * 110,
    }));
    set({ cards, activeId: cards[0]?.id ?? null, showOnPlane: true });
    s.setStatus(`Street Heat rule deck · ${cards.length} cards`);
    stampTimeline("Rule deck", `${cards.length} cards`);
  },

  updateCard: (id, patch) =>
    set((st) => ({
      cards: st.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeCard: (id) =>
    set((st) => ({
      cards: st.cards.filter((c) => c.id !== id),
      activeId: st.activeId === id ? null : st.activeId,
    })),

  moveCard: (id, x, y) =>
    set((st) => ({
      cards: st.cards.map((c) => (c.id === id ? { ...c, x, y } : c)),
    })),

  toggleEnabled: (id) =>
    set((st) => ({
      cards: st.cards.map((c) =>
        c.id === id ? { ...c, enabled: !c.enabled } : c,
      ),
    })),

  exportInputMapJson: () => {
    const cards = get().cards.filter((c) => c.enabled);
    const payload = {
      format: "pixelplane.rule_cards.v1",
      exportedAt: new Date().toISOString(),
      cards: cards.map((c) => ({
        name: c.name,
        when: c.when,
        then: c.then,
      })),
      // engine-friendly flat input map stubs
      inputMap: cards
        .filter((c) => c.when.kind === "key")
        .map((c) => ({
          code: (c.when as { kind: "key"; code: string }).code,
          action: c.then.kind,
          detail: c.then,
        })),
    };
    return JSON.stringify(payload, null, 2);
  },
}));
