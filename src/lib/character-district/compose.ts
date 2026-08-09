/**
 * D_Composite — outfit gravity rings + non-destructive modular attach.
 * D_Bake — layered vs baked atlas export contracts (Gemini slice 2 & 3).
 */

import { compositeLayers, createBuffer } from "@/lib/pixel/buffer";
import type { CharacterDistrict } from "./types";
import { zoneWorld } from "./layout";

/** Default gravity radius around chassis center (world px) */
export const DEFAULT_GRAVITY_RADIUS = 140;

export type CompositeLink = {
  modularArtboardId: string;
  chassisArtboardId: string;
  dist: number;
  inGravity: boolean;
};

export function chassisCenter(
  d: CharacterDistrict,
  boards: { id: string; x: number; y: number; width: number; height: number }[],
): { x: number; y: number } | null {
  if (d.chassisArtboardId) {
    const b = boards.find((x) => x.id === d.chassisArtboardId);
    if (b) return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }
  // fallback: DNA zone center
  const z = zoneWorld(d, "dna");
  return { x: z.x + z.w / 2, y: z.y + z.h * 0.4 };
}

export function findCompositeLinks(
  d: CharacterDistrict,
  boards: { id: string; x: number; y: number; width: number; height: number; name: string }[],
  radius = DEFAULT_GRAVITY_RADIUS,
): CompositeLink[] {
  const c = chassisCenter(d, boards);
  if (!c) return [];
  const chassisId = d.chassisArtboardId;
  const links: CompositeLink[] = [];
  for (const b of boards) {
    if (chassisId && b.id === chassisId) continue;
    // candidates: modular list OR boards whose centers fall in DNA zone
    const dna = zoneWorld(d, "dna");
    const bx = b.x + b.width / 2;
    const by = b.y + b.height / 2;
    const inDna =
      bx >= dna.x &&
      by >= dna.y &&
      bx <= dna.x + dna.w &&
      by <= dna.y + dna.h;
    const isModular = d.modularArtboardIds.includes(b.id);
    if (!inDna && !isModular) continue;
    const dist = Math.hypot(bx - c.x, by - c.y);
    links.push({
      modularArtboardId: b.id,
      chassisArtboardId: chassisId ?? "",
      dist,
      inGravity: dist <= radius,
    });
  }
  return links;
}

export type BakeMode = "layered" | "baked";

export type ModularExportPiece = {
  name: string;
  artboardId: string;
  role: "chassis" | "modular";
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

/** Non-destructive: read layers as-is from studio boards */
export function collectModularPieces(
  d: CharacterDistrict,
  boards: {
    id: string;
    name: string;
    width: number;
    height: number;
    layers: { data: Uint8ClampedArray; visible: boolean; opacity: number }[];
  }[],
  links: CompositeLink[],
): ModularExportPiece[] {
  const pieces: ModularExportPiece[] = [];
  const ids = new Set<string>();
  if (d.chassisArtboardId) ids.add(d.chassisArtboardId);
  for (const L of links) if (L.inGravity) ids.add(L.modularArtboardId);
  for (const id of d.modularArtboardIds) ids.add(id);

  for (const id of ids) {
    const b = boards.find((x) => x.id === id);
    if (!b) continue;
    const pixels = compositeLayers(b.layers, b.width, b.height);
    pieces.push({
      name: b.name.replace(/\s+/g, "_"),
      artboardId: b.id,
      role: id === d.chassisArtboardId ? "chassis" : "modular",
      width: b.width,
      height: b.height,
      pixels,
    });
  }
  return pieces;
}

/** Flatten modular pieces into one atlas (simple vertical stack) — non-destructive to plane */
export function bakeAtlas(pieces: ModularExportPiece[]): {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  layout: { name: string; x: number; y: number; w: number; h: number }[];
} {
  if (!pieces.length) {
    return { width: 8, height: 8, pixels: createBuffer(8, 8), layout: [] };
  }
  const width = Math.max(...pieces.map((p) => p.width));
  let y = 0;
  const layout: { name: string; x: number; y: number; w: number; h: number }[] = [];
  for (const p of pieces) {
    layout.push({ name: p.name, x: 0, y, w: p.width, h: p.height });
    y += p.height + 2;
  }
  const height = y;
  const pixels = createBuffer(width, height);
  for (const entry of layout) {
    const p = pieces.find((x) => x.name === entry.name)!;
    for (let row = 0; row < p.height; row++) {
      for (let col = 0; col < p.width; col++) {
        const si = (row * p.width + col) * 4;
        const di = ((entry.y + row) * width + col) * 4;
        if (p.pixels[si + 3]! > 0) {
          pixels[di] = p.pixels[si]!;
          pixels[di + 1] = p.pixels[si + 1]!;
          pixels[di + 2] = p.pixels[si + 2]!;
          pixels[di + 3] = p.pixels[si + 3]!;
        }
      }
    }
  }
  return { width, height, pixels, layout };
}

export function buildComposeExport(
  d: CharacterDistrict,
  boards: {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    layers: { data: Uint8ClampedArray; visible: boolean; opacity: number }[];
  }[],
  mode: BakeMode,
  radius = DEFAULT_GRAVITY_RADIUS,
) {
  const links = findCompositeLinks(d, boards, radius);
  const pieces = collectModularPieces(d, boards, links);
  const meta = {
    version: 1,
    character: d.name,
    mode,
    doctrine: "Non-destructive plane; bake only at export",
    gravityRadius: radius,
    links: links.map((L) => ({
      modular: L.modularArtboardId,
      dist: Math.round(L.dist),
      attached: L.inGravity,
    })),
  };
  if (mode === "layered") {
    return {
      meta: { ...meta, files: pieces.map((p) => `${p.role}_${p.name}.png`) },
      pieces,
      atlas: null as ReturnType<typeof bakeAtlas> | null,
    };
  }
  const atlas = bakeAtlas(pieces);
  return {
    meta: { ...meta, files: ["Character_Full_Atlas.png", "atlas_layout.json"] },
    pieces,
    atlas,
  };
}
