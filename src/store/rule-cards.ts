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
  | { kind: "remap_key"; from: string; to: string }
  | { kind: "fire_trigger"; trigger: "boil" | "tile_kit" | "qa" | "mutate" | "bloom" };

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
  {
    name: "Smash → Boil",
    when: { kind: "smash" },
    then: { kind: "fire_trigger", trigger: "boil" },
    enabled: true,
    color: "#3ecfcf",
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
    case "fire_trigger":
      return `Fire ${t.trigger.replace("_", " ")} planes`;
  }
}


/** Card footprint on the plane */
const CARD_W = 148;
const CARD_H = 78;
const CARD_GAP_X = 168;
const CARD_GAP_Y = 110;

/**
 * Find a clear home for the rule deck — open build field / right of quest,
 * never stacked on characters / neon alley / smashables.
 */
function ruleDeckOrigin(count: number): { x: number; y: number } {
  const s = useStudio.getState();
  const cols = Math.min(3, Math.max(1, count));
  const rows = Math.ceil(count / cols);
  const needW = cols * CARD_GAP_X;
  const needH = rows * CARD_GAP_Y;

  // Occupied AABBs from plane clutter
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  for (const b of s.artboards) boxes.push({ x: b.x, y: b.y, w: b.width, h: b.height });
  for (const z of s.wireZones) {
    // allow open build field as a candidate host, but avoid other zones' cores
    if (z.category === "scenes" && /open/i.test(z.name || "")) continue;
    boxes.push({ x: z.x, y: z.y, w: z.w, h: z.h });
  }
  for (const d of s.destructibles) boxes.push({ x: d.x - 8, y: d.y - 8, w: d.w + 16, h: d.h + 16 });
  for (const q of s.questTrees) {
    // quest trees sit near their first nodes / zone
    boxes.push({ x: q.x, y: q.y, w: q.w || 480, h: q.h || 480 });
  }
  for (const p of s.parallaxStacks) boxes.push({ x: p.x, y: p.y, w: p.viewW, h: p.viewH });
  for (const a of s.animRegions) boxes.push({ x: a.x, y: a.y, w: a.frameW, h: a.frameH });
  for (const p of s.particles) boxes.push({ x: p.x, y: p.y, w: p.w, h: p.h });

  const overlaps = (x: number, y: number) => {
    const x2 = x + needW;
    const y2 = y + needH;
    for (const b of boxes) {
      if (x < b.x + b.w && x2 > b.x && y < b.y + b.h && y2 > b.y) return true;
    }
    return false;
  };

  // Prefer open build field (demo seeds it at ~1400,720)
  const open = s.wireZones.find(
    (z) => z.category === "scenes" || /open build/i.test(z.name || ""),
  );
  const candidates: { x: number; y: number }[] = [];
  if (open) {
    // right half of open field, clear of quest cluster on the left of that zone
    candidates.push(
      { x: open.x + open.w * 0.55, y: open.y + 40 },
      { x: open.x + open.w * 0.55, y: open.y + open.h * 0.35 },
      { x: open.x + 40, y: open.y + open.h * 0.55 },
    );
  }
  // fixed free pads relative to demo layout
  candidates.push(
    { x: 2200, y: 820 },
    { x: 2100, y: 1100 },
    { x: 2200, y: 200 },
    { x: 40, y: 1500 },
    { x: 1900, y: 1500 },
  );

  for (const c of candidates) {
    const x = Math.round(c.x);
    const y = Math.round(c.y);
    if (!overlaps(x, y)) return { x, y };
  }
  // fallback: far right of everything
  let maxX = 1800;
  for (const b of boxes) maxX = Math.max(maxX, b.x + b.w);
  return { x: Math.round(maxX + 80), y: 800 };
}

export const useRuleCards = create<RuleState>((set, get) => ({
  cards: [],
  activeId: null,
  showOnPlane: true,

  setShowOnPlane: (showOnPlane) => set({ showOnPlane }),

  select: (activeId) => set({ activeId }),

  placeCard: (partial) => {
    const s = useStudio.getState();
    const id = uid("rule");
    const n = get().cards.length;
    // stack next to existing cards, else park in free open-field space
    let x: number;
    let y: number;
    if (partial?.x != null && partial?.y != null) {
      x = partial.x;
      y = partial.y;
    } else if (get().cards.length) {
      const last = get().cards[get().cards.length - 1]!;
      x = last.x + CARD_GAP_X;
      y = last.y;
      // wrap every 3
      if ((n % 3) === 0) {
        x = get().cards[Math.floor(n / 3) * 3]?.x ?? last.x;
        y = last.y + CARD_GAP_Y;
      }
    } else {
      const home = ruleDeckOrigin(1);
      x = home.x;
      y = home.y;
    }
    const card: RuleCard = {
      id,
      name: partial?.name ?? `Rule ${n + 1}`,
      x: Math.round(x),
      y: Math.round(y),
      when: partial?.when ?? { kind: "key", code: "KeyF" },
      then: partial?.then ?? { kind: "status", text: "Rule fired" },
      enabled: partial?.enabled ?? true,
      color: partial?.color ?? COLORS[n % COLORS.length]!,
    };
    set((st) => ({ cards: [...st.cards, card], activeId: id }));
    s.setStatus(`Rule card · ${card.name} @ ${card.x},${card.y}`);
    stampTimeline("Rule card", card.name);
    return id;
  },

  seedStreetHeatDeck: () => {
    const s = useStudio.getState();
    const home = ruleDeckOrigin(PRESETS.length);
    const cards: RuleCard[] = PRESETS.map((p, i) => ({
      ...p,
      id: uid("rule"),
      x: home.x + (i % 3) * CARD_GAP_X,
      y: home.y + Math.floor(i / 3) * CARD_GAP_Y,
    }));
    set({ cards, activeId: cards[0]?.id ?? null, showOnPlane: true });
    // Frame the deck so it's obvious they didn't land on Neon Alley
    const cx = home.x + CARD_GAP_X;
    const cy = home.y + CARD_GAP_Y * 0.5;
    const zoom = 0.45;
    const vw = typeof window !== "undefined" ? Math.max(640, window.innerWidth - 360) : 900;
    const vh = typeof window !== "undefined" ? Math.max(400, window.innerHeight - 140) : 700;
    s.setCamera({
      zoom,
      x: vw / 2 - cx * zoom,
      y: vh / 2 - cy * zoom,
    });
    stampTimeline("Rule deck", `${cards.length} cards @ open field`);
    s.setStatus(`Street Heat rule deck · ${cards.length} cards · parked open field (${home.x},${home.y})`);
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
