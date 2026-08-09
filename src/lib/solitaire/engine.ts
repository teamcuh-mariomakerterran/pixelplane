/**
 * Klondike Solitaire — pure model (no DOM).
 * Draw-1 default; legal moves only; undo via snapshots.
 */

import {
  type Card,
  type CardId,
  type Rank,
  type SolitaireState,
  type Suit,
  SUITS,
  RANKS,
  cardId,
  isRed,
} from "./types";

function cloneCard(c: Card): Card {
  return { ...c };
}

function cloneState(s: SolitaireState): SolitaireState {
  return {
    stock: s.stock.map(cloneCard),
    waste: s.waste.map(cloneCard),
    foundations: s.foundations.map((p) => p.map(cloneCard)) as SolitaireState["foundations"],
    tableau: s.tableau.map((p) => p.map(cloneCard)) as SolitaireState["tableau"],
    drawCount: s.drawCount,
    moves: s.moves,
    score: s.score,
    phase: s.phase,
    history: [...s.history],
  };
}

function serialize(s: SolitaireState): string {
  const slim = {
    stock: s.stock,
    waste: s.waste,
    foundations: s.foundations,
    tableau: s.tableau,
    drawCount: s.drawCount,
    moves: s.moves,
    score: s.score,
    phase: s.phase,
  };
  return JSON.stringify(slim);
}

function deserialize(raw: string): Omit<SolitaireState, "history"> {
  return JSON.parse(raw) as Omit<SolitaireState, "history">;
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fullDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: cardId(suit, rank), suit, rank, faceUp: false });
    }
  }
  return cards;
}

export function newGame(drawCount: 1 | 3 = 1): SolitaireState {
  const deck = fisherYates(fullDeck());
  const tableau = [[], [], [], [], [], [], []] as SolitaireState["tableau"];
  let i = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const c = deck[i++];
      c.faceUp = row === col;
      tableau[col].push(c);
    }
  }
  const stock = deck.slice(i).map((c) => ({ ...c, faceUp: false }));
  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawCount,
    moves: 0,
    score: 0,
    phase: "playing",
    history: [],
  };
}

function pushHistory(s: SolitaireState): SolitaireState {
  const snap = serialize({ ...s, history: [] });
  const history = [...s.history, snap].slice(-80);
  return { ...s, history };
}

export function undo(s: SolitaireState): SolitaireState {
  if (s.history.length === 0) return s;
  const history = [...s.history];
  const prev = history.pop()!;
  const body = deserialize(prev);
  return { ...body, history };
}

function canStackOnTableau(moving: Card, target: Card | undefined): boolean {
  if (!target) return moving.rank === 13; // kings only on empty
  if (!target.faceUp) return false;
  if (isRed(moving.suit) === isRed(target.suit)) return false;
  return moving.rank === target.rank - 1;
}

function canStackOnFoundation(moving: Card, pile: Card[]): boolean {
  if (pile.length === 0) return moving.rank === 1;
  const top = pile[pile.length - 1];
  return moving.suit === top.suit && moving.rank === top.rank + 1;
}

export type MoveSource =
  | { kind: "waste" }
  | { kind: "foundation"; index: 0 | 1 | 2 | 3 }
  | { kind: "tableau"; col: number; fromIndex: number };

export type MoveDest =
  | { kind: "foundation"; index: 0 | 1 | 2 | 3 }
  | { kind: "tableau"; col: number };

function takeCards(
  s: SolitaireState,
  src: MoveSource,
): { cards: Card[]; next: SolitaireState } | null {
  if (src.kind === "waste") {
    if (s.waste.length === 0) return null;
    const cards = [s.waste[s.waste.length - 1]];
    if (!cards[0].faceUp) return null;
    const waste = s.waste.slice(0, -1);
    return { cards, next: { ...s, waste } };
  }
  if (src.kind === "foundation") {
    const pile = s.foundations[src.index];
    if (pile.length === 0) return null;
    const cards = [pile[pile.length - 1]];
    const foundations = s.foundations.map((p, i) =>
      i === src.index ? p.slice(0, -1) : p,
    ) as SolitaireState["foundations"];
    return { cards, next: { ...s, foundations } };
  }
  const col = s.tableau[src.col];
  if (src.fromIndex < 0 || src.fromIndex >= col.length) return null;
  const cards = col.slice(src.fromIndex);
  if (cards.length === 0 || !cards[0].faceUp) return null;
  // all face up
  if (cards.some((c) => !c.faceUp)) return null;
  const tableau = s.tableau.map((p, i) =>
    i === src.col ? p.slice(0, src.fromIndex) : p,
  ) as SolitaireState["tableau"];
  return { cards, next: { ...s, tableau } };
}

function placeCards(
  s: SolitaireState,
  cards: Card[],
  dest: MoveDest,
): SolitaireState | null {
  if (dest.kind === "foundation") {
    if (cards.length !== 1) return null;
    const pile = s.foundations[dest.index];
    if (!canStackOnFoundation(cards[0], pile)) return null;
    const foundations = s.foundations.map((p, i) =>
      i === dest.index ? [...p, { ...cards[0], faceUp: true }] : p,
    ) as SolitaireState["foundations"];
    return { ...s, foundations, score: s.score + 10 };
  }
  const target = s.tableau[dest.col];
  const top = target[target.length - 1];
  if (!canStackOnTableau(cards[0], top)) return null;
  const tableau = s.tableau.map((p, i) =>
    i === dest.col ? [...p, ...cards.map((c) => ({ ...c, faceUp: true }))] : p,
  ) as SolitaireState["tableau"];
  return { ...s, tableau };
}

function flipTopIfNeeded(s: SolitaireState, col: number): SolitaireState {
  const pile = s.tableau[col];
  if (pile.length === 0) return s;
  const top = pile[pile.length - 1];
  if (top.faceUp) return s;
  const tableau = s.tableau.map((p, i) => {
    if (i !== col) return p;
    const next = p.map(cloneCard);
    next[next.length - 1].faceUp = true;
    return next;
  }) as SolitaireState["tableau"];
  return { ...s, tableau, score: s.score + 5 };
}

function checkWin(s: SolitaireState): SolitaireState {
  const won = s.foundations.every((p) => p.length === 13);
  return won ? { ...s, phase: "won", score: s.score + 100 } : s;
}

export function drawFromStock(s: SolitaireState): SolitaireState {
  if (s.phase === "won") return s;
  let next = pushHistory(s);
  if (next.stock.length === 0) {
    // recycle waste → stock
    if (next.waste.length === 0) return s;
    const stock = next.waste
      .slice()
      .reverse()
      .map((c) => ({ ...c, faceUp: false }));
    next = { ...next, stock, waste: [], moves: next.moves + 1, score: Math.max(0, next.score - 5) };
    return next;
  }
  const n = Math.min(next.drawCount, next.stock.length);
  const drawn = next.stock.slice(-n).map((c) => ({ ...c, faceUp: true }));
  const stock = next.stock.slice(0, -n);
  const waste = [...next.waste, ...drawn];
  return { ...next, stock, waste, moves: next.moves + 1 };
}

export function tryMove(s: SolitaireState, src: MoveSource, dest: MoveDest): SolitaireState {
  if (s.phase === "won") return s;
  // same pile no-op
  if (src.kind === "tableau" && dest.kind === "tableau" && src.col === dest.col) return s;
  if (src.kind === "foundation" && dest.kind === "foundation" && src.index === dest.index) return s;

  const taken = takeCards(cloneState(s), src);
  if (!taken) return s;
  const placed = placeCards(taken.next, taken.cards, dest);
  if (!placed) return s;

  let next = pushHistory(s);
  // re-apply from fresh history-aware state
  const t2 = takeCards(next, src);
  if (!t2) return s;
  let after = placeCards(t2.next, t2.cards, dest);
  if (!after) return s;

  if (src.kind === "tableau") {
    after = flipTopIfNeeded(after, src.col);
  }
  after = {
    ...after,
    moves: s.moves + 1,
    history: next.history,
  };
  return checkWin(after);
}

/** Auto-move card to a legal foundation if unique/obvious */
export function tryAutoFoundation(s: SolitaireState, src: MoveSource): SolitaireState {
  if (s.phase === "won") return s;
  const taken = takeCards(cloneState(s), src);
  if (!taken || taken.cards.length !== 1) return s;
  const card = taken.cards[0];
  for (let i = 0 as 0 | 1 | 2 | 3; i < 4; i = (i + 1) as 0 | 1 | 2 | 3) {
    if (canStackOnFoundation(card, s.foundations[i])) {
      return tryMove(s, src, { kind: "foundation", index: i });
    }
  }
  return s;
}

export function pileTop(s: SolitaireState, kind: "waste" | "foundation" | "tableau", index = 0): Card | null {
  if (kind === "waste") return s.waste[s.waste.length - 1] ?? null;
  if (kind === "foundation") return s.foundations[index][s.foundations[index].length - 1] ?? null;
  return s.tableau[index][s.tableau[index].length - 1] ?? null;
}

export function faceUpRunStart(pile: Card[]): number {
  let i = pile.length - 1;
  if (i < 0) return 0;
  while (i > 0 && pile[i - 1].faceUp) {
    // must be legal descending alternating
    const a = pile[i - 1];
    const b = pile[i];
    if (isRed(a.suit) === isRed(b.suit) || a.rank !== b.rank + 1) break;
    i--;
  }
  // find first face-up
  while (i < pile.length && !pile[i].faceUp) i++;
  return i;
}
