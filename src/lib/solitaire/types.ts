export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13;

export type CardId = `${Suit}_${Rank}`;

export type Card = {
  id: CardId;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
};

export type PileId =
  | "stock"
  | "waste"
  | `foundation_${0 | 1 | 2 | 3}`
  | `tableau_${0 | 1 | 2 | 3 | 4 | 5 | 6}`;

export type SolitairePhase = "playing" | "won";

export type SolitaireState = {
  stock: Card[];
  waste: Card[];
  foundations: [Card[], Card[], Card[], Card[]];
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]];
  drawCount: 1 | 3;
  moves: number;
  score: number;
  phase: SolitairePhase;
  /** history for undo — serialized snapshots */
  history: string[];
};

/** Canvas-bound skin: artboard ids or raw pixel buffers per slot */
export type SkinSlotKey =
  | "table"
  | "card_back"
  | "empty_foundation"
  | "empty_tableau"
  | CardId;

export type SolitaireSkin = {
  /** artboard id wired into each slot (null = procedural default) */
  slots: Partial<Record<SkinSlotKey, string | null>>;
  cardW: number;
  cardH: number;
};

export type SolitaireInstance = {
  id: string;
  name: string;
  /** world position on infinite plane */
  x: number;
  y: number;
  /** UI scale (pixels on screen roughly cardW * scale) */
  scale: number;
  game: SolitaireState;
  skin: SolitaireSkin;
  minimized: boolean;
  /** template artboards group id label */
  templatePlaced: boolean;
};

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function cardId(suit: Suit, rank: Rank): CardId {
  return `${suit}_${rank}`;
}

export function isRed(suit: Suit) {
  return suit === "hearts" || suit === "diamonds";
}

export function rankLabel(rank: Rank): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function suitSymbol(suit: Suit): string {
  if (suit === "hearts") return "♥";
  if (suit === "diamonds") return "♦";
  if (suit === "clubs") return "♣";
  return "♠";
}

/** All 53 visual slots for the skin template (back + 52 faces) plus table chrome */
export const SKIN_TEMPLATE_SLOTS: { key: SkinSlotKey; label: string; group: string }[] = [
  { key: "table", label: "Table / felt", group: "chrome" },
  { key: "card_back", label: "Card back", group: "chrome" },
  { key: "empty_foundation", label: "Empty foundation", group: "chrome" },
  { key: "empty_tableau", label: "Empty tableau", group: "chrome" },
  ...SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      key: cardId(suit, rank) as SkinSlotKey,
      label: `${rankLabel(rank)}${suitSymbol(suit)}`,
      group: suit,
    })),
  ),
];
