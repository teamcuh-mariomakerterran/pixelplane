/**
 * Place a solitaire skin template on the infinite plane:
 * labeled artboards for table, back, empty slots, and all 52 faces.
 * Paint into those boards (or drop art) → rebind skin → cards update live.
 */

import { uid } from "@/lib/utils";
import type { Artboard, Layer } from "@/lib/pixel/types";
import {
  CARD_H,
  CARD_W,
  drawCardBack,
  drawCardFace,
  drawEmptySlot,
  drawTableFelt,
} from "./cards-draw";
import {
  SKIN_TEMPLATE_SLOTS,
  type CardId,
  type SkinSlotKey,
  type SolitaireSkin,
  type Suit,
  type Rank,
  cardId,
  SUITS,
  RANKS,
} from "./types";

function emptyLayer(w: number, h: number, name: string, data?: Uint8ClampedArray): Layer {
  return {
    id: uid("layer"),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    data: data ?? new Uint8ClampedArray(w * h * 4),
    rev: 1,
  };
}

export function defaultSkin(): SolitaireSkin {
  return {
    slots: {},
    cardW: CARD_W,
    cardH: CARD_H,
  };
}

/** Build artboards for the full deck template near (ox, oy). */
export function buildSolitaireTemplateArtboards(
  ox: number,
  oy: number,
): { boards: Artboard[]; skin: SolitaireSkin } {
  const boards: Artboard[] = [];
  const slots: SolitaireSkin["slots"] = {};
  let x = ox;
  let y = oy;

  // chrome row
  const chrome: { key: SkinSlotKey; w: number; h: number; paint: () => Uint8ClampedArray }[] = [
    { key: "table", w: 160, h: 100, paint: () => drawTableFelt(160, 100) },
    { key: "card_back", w: CARD_W, h: CARD_H, paint: () => drawCardBack() },
    { key: "empty_foundation", w: CARD_W, h: CARD_H, paint: () => drawEmptySlot("foundation") },
    { key: "empty_tableau", w: CARD_W, h: CARD_H, paint: () => drawEmptySlot("tableau") },
  ];

  for (const c of chrome) {
    const layer = emptyLayer(c.w, c.h, "Base", c.paint());
    const id = uid("board");
    boards.push({
      id,
      name: `Solitaire · ${SKIN_TEMPLATE_SLOTS.find((s) => s.key === c.key)?.label ?? c.key}`,
      x,
      y,
      width: c.w,
      height: c.h,
      layers: [layer],
      activeLayerId: layer.id,
      kind: "sheet",
    });
    slots[c.key] = id;
    x += c.w + 12;
  }

  y += 120;
  x = ox;

  // 52 faces in 4 suit rows
  for (const suit of SUITS) {
    x = ox;
    for (const rank of RANKS) {
      const id = cardId(suit, rank);
      const layer = emptyLayer(
        CARD_W,
        CARD_H,
        "Base",
        drawCardFace({ id, suit, rank, faceUp: true }),
      );
      const bid = uid("board");
      boards.push({
        id: bid,
        name: `Solitaire · ${id}`,
        x,
        y,
        width: CARD_W,
        height: CARD_H,
        layers: [layer],
        activeLayerId: layer.id,
        kind: "sheet",
      });
      slots[id] = bid;
      x += CARD_W + 6;
    }
    y += CARD_H + 10;
  }

  return {
    boards,
    skin: { slots, cardW: CARD_W, cardH: CARD_H },
  };
}

export function resolveSkinSlot(
  skin: SolitaireSkin,
  key: SkinSlotKey,
  artboards: Artboard[],
  composite: (layers: Layer[], w: number, h: number) => Uint8ClampedArray,
): { data: Uint8ClampedArray; w: number; h: number } {
  const boardId = skin.slots[key];
  if (boardId) {
    const b = artboards.find((a) => a.id === boardId);
    if (b) {
      return {
        data: composite(b.layers, b.width, b.height),
        w: b.width,
        h: b.height,
      };
    }
  }
  // procedural fallbacks
  if (key === "table") {
    const data = drawTableFelt(480, 320);
    return { data, w: 480, h: 320 };
  }
  if (key === "card_back") {
    return { data: drawCardBack(skin.cardW, skin.cardH), w: skin.cardW, h: skin.cardH };
  }
  if (key === "empty_foundation") {
    return {
      data: drawEmptySlot("foundation", skin.cardW, skin.cardH),
      w: skin.cardW,
      h: skin.cardH,
    };
  }
  if (key === "empty_tableau") {
    return {
      data: drawEmptySlot("tableau", skin.cardW, skin.cardH),
      w: skin.cardW,
      h: skin.cardH,
    };
  }
  // face_suit_rank
  const m = /^([a-z]+)_(\d+)$/.exec(key);
  if (m) {
    const suit = m[1] as Suit;
    const rank = Number(m[2]) as Rank;
    const card = { id: key as CardId, suit, rank, faceUp: true };
    return {
      data: drawCardFace(card, skin.cardW, skin.cardH),
      w: skin.cardW,
      h: skin.cardH,
    };
  }
  return { data: drawCardBack(skin.cardW, skin.cardH), w: skin.cardW, h: skin.cardH };
}
