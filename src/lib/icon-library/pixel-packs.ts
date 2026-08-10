/**
 * Brian’s curated pixel icon packs — amber / cyan themes.
 * Named files under /public/pixel-icons/tool_{theme}_{name}.png
 * Lucide remains fallback when theme=vector or file missing.
 */

export type IconTheme = "amber" | "cyan" | "vector";

/**
 * Toolbar toolId → named glyph.
 * move = 4-way arrows (boards)
 * pan = open hand
 * brush = pencil / paint
 */
export const TOOL_PIXEL_NAME: Record<string, string> = {
  select: "select",
  move: "move",
  pan: "pan",
  brush: "brush",
  eraser: "eraser",
  fill: "fill",
  eyedropper: "eyedropper",
  line: "line",
  rect: "rect",
  ellipse: "ellipse",
  marquee: "marquee",
  "anim-region": "anim_region",
  particle: "particle",
  "wire-zone": "wire_zone",
  place: "beacon",
  "game-viewport": "viewport",
  "constraint-stamp": "stamp",

  // extras
  private_mask: "private_mask",
  beacon: "beacon",
  chunk: "chunk",
  foot: "foot",
};

/** @deprecated index map kept only for pack_e/f sheets */
export const TOOL_PIXEL_INDEX: Record<string, number> = {
  select: 0,
  move: 1,
  pan: 3,
  brush: 4,
  eraser: 5,
  fill: 6,
  eyedropper: 7,
  line: 8,
  rect: 9,
  ellipse: 9,
  marquee: 10,
  "anim-region": 11,
  particle: 12,
  "wire-zone": 13,
  private_mask: 14,
  beacon: 15,
  chunk: 16,
  foot: 2,
  "game-viewport": 9,
  "constraint-stamp": 10,
};

/** Catalog id → pack_e / pack_f / tools named or indexed */
export type PixelRef = {
  pack: "tools" | "pack_e" | "pack_f" | "pack_ef";
  index?: number;
  /** named tool glyph (preferred for tools) */
  name?: string;
  /** optional fixed path override */
  path?: string;
};

export const CATALOG_PIXEL: Record<string, PixelRef> = {
  // Chrome / suite
  "chrome.studio": { pack: "pack_e", index: 0 },
  "chrome.engine": { pack: "pack_e", index: 1 },
  "chrome.shared_plane": { pack: "pack_e", index: 2 },
  "chrome.watch_mode": { pack: "pack_e", index: 3 },
  "chrome.play_ghost": { pack: "pack_e", index: 4 },
  "chrome.spatial_scope": { pack: "pack_e", index: 5 },
  "chrome.export_map": { pack: "pack_e", index: 8 },
  "chrome.first_night": { pack: "pack_e", index: 7 },
  "chrome.indoor": { pack: "pack_e", index: 1 },
  "chrome.solitaire": { pack: "pack_e", index: 6 },

  // Wire roles
  "wire.character": { pack: "pack_f", index: 0 },
  "wire.animation": { pack: "pack_f", index: 1 },
  "wire.environment": { pack: "pack_f", index: 2 },
  "wire.parallax": { pack: "pack_f", index: 3 },
  "wire.effects": { pack: "pack_f", index: 4 },
  "wire.items": { pack: "pack_f", index: 5 },
  "wire.ui": { pack: "pack_f", index: 6 },
  "wire.hud": { pack: "pack_f", index: 7 },
  "wire.audio": { pack: "pack_f", index: 8 },
  "wire.tiles": { pack: "pack_f", index: 9 },
  "wire.indoor": { pack: "pack_f", index: 10 },

  // Tools (named)
  "tool.select": { pack: "tools", name: "select" },
  "tool.move": { pack: "tools", name: "move" },
  "tool.pan": { pack: "tools", name: "pan" },
  "tool.brush": { pack: "tools", name: "brush" },
  "tool.eraser": { pack: "tools", name: "eraser" },
  "tool.fill": { pack: "tools", name: "fill" },
  "tool.eyedropper": { pack: "tools", name: "eyedropper" },
  "tool.line": { pack: "tools", name: "line" },
  "tool.rect": { pack: "tools", name: "rect" },
  "tool.ellipse": { pack: "tools", name: "ellipse" },
  "tool.marquee": { pack: "tools", name: "marquee" },
  "tool.anim": { pack: "tools", name: "anim_region" },
  "tool.particle": { pack: "tools", name: "particle" },
  "tool.wire": { pack: "tools", name: "wire_zone" },
  "tool.beacon": { pack: "tools", name: "beacon" },
  "tool.private_mask": { pack: "tools", name: "private_mask" },
  "tool.chunk": { pack: "tools", name: "chunk" },
  "tool.slice": { pack: "tools", name: "marquee" },

  // Folders
  "folder.root": { pack: "pack_ef", index: 0 },
  "folder.main": { pack: "pack_ef", index: 1 },
  "folder.facing": { pack: "pack_ef", index: 2 },
  "folder.concept": { pack: "pack_ef", index: 3 },
  "folder.variants": { pack: "pack_ef", index: 4 },
  "folder.cosmetics": { pack: "pack_ef", index: 5 },

  // HUD
  "hud.health": { pack: "pack_ef", index: 8 },
  "hud.energy": { pack: "pack_ef", index: 9 },
  "hud.wanted": { pack: "pack_ef", index: 10 },
  "hud.minimap": { pack: "pack_ef", index: 11 },

  // Anim
  "anim.idle": { pack: "pack_ef", index: 12 },
  "anim.walk": { pack: "pack_ef", index: 13 },
  "anim.run": { pack: "pack_ef", index: 14 },
  "anim.attack": { pack: "pack_ef", index: 15 },
  "anim.hit": { pack: "pack_ef", index: 16 },
  "anim.death": { pack: "pack_ef", index: 17 },
  "anim.fx": { pack: "pack_ef", index: 18 },
  "anim.cosmetic": { pack: "pack_ef", index: 19 },
  "anim.onion": { pack: "pack_ef", index: 20 },
  "anim.audit": { pack: "pack_ef", index: 21 },
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** Named tool glyph path for amber/cyan theme */
export function toolPixelSrc(toolId: string, theme: IconTheme): string | null {
  if (theme === "vector") return null;
  const name = TOOL_PIXEL_NAME[toolId];
  if (!name) return null;
  // chunk only exists for cyan; fall back to amber marquee if missing
  return `/pixel-icons/tool_${theme}_${name}.png`;
}

/** Resolve catalog entry id → pixel src for theme */
export function catalogPixelSrc(id: string, theme: IconTheme): string | null {
  if (theme === "vector") return null;
  const ref = CATALOG_PIXEL[id];
  if (!ref) return null;
  if (ref.path) return ref.path;
  if (ref.pack === "tools") {
    const name = ref.name ?? TOOL_PIXEL_NAME[id.replace(/^tool\./, "")] ?? "select";
    return `/pixel-icons/tool_${theme}_${name}.png`;
  }
  if (ref.pack === "pack_e") {
    const i = ref.index ?? 0;
    // pack_e has amber + cyan
    return `/pixel-icons/pack_e_${theme}_${pad2(i)}.png`;
  }
  if (ref.pack === "pack_f") {
    const i = ref.index ?? 0;
    // pack_f primarily amber; cyan falls back to pack_ef when missing
    if (theme === "cyan") {
      return `/pixel-icons/pack_ef_cyan_${pad2(i)}.png`;
    }
    return `/pixel-icons/pack_f_amber_${pad2(i)}.png`;
  }
  if (ref.pack === "pack_ef") {
    const i = ref.index ?? 0;
    // pack_ef is cyan set; amber uses same art (engine doesn't have amber pack_ef)
    return `/pixel-icons/pack_ef_cyan_${pad2(i)}.png`;
  }
  return null;
}

function fxFrames(folder: string, count = 16): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`/pixel-icons/fx/${folder}/frame_${pad2(i)}.png`);
  }
  return out;
}

/** Smash / explosion sequences for City Engine */
export const FX_EXPLOSIONS = {
  v1: fxFrames("a_pixel_explosion_v1"),
  v2: fxFrames("A_pixel_explosion_v2"),
  v3: fxFrames("a_pixel_explosion_v3"),
  gifV1: "/pixel-icons/ui/a_pixel_explosion_v1.gif",
  gifV2: "/pixel-icons/ui/A_pixel_explosion_v2.gif",
  sheetV1: "/pixel-icons/ui/a_pixel_explosion_v1.png",
  sheetV2: "/pixel-icons/ui/A_pixel_explosion_v2.png",
  sheetV3: "/pixel-icons/ui/a_pixel_explosion_v3.png",
};

/** UI chrome plates for HUD / minimap / quest */
export const UI_CHROME = {
  minimapFrame: "/pixel-icons/ui/mini_map_frame_hollow.png",
  minimapFrameSolid: "/pixel-icons/ui/mini_map_frame.png",
  staminaFull: "/pixel-icons/ui/stamina_bar_full.png",
  staminaEmpty: "/pixel-icons/ui/stamina_bar_empty.png",
  questPanel: "/pixel-icons/ui/quest_tracker_panel.png",
  panelAmber: "/pixel-icons/ui/UI_panel_amber_accent.jpg",
  panelCyan: "/pixel-icons/ui/ui_panel_cyan_accent.jpg",
  uiSheet: "/pixel-icons/ui/UI_v1.png",
  tooltipPlate: "/pixel-icons/ui/tooltip_plate_sheet.jpg",
};
