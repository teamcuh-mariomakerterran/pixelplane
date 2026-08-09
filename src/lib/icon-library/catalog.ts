/**
 * PixelPlane Icon Library — style-contracted catalog for wires, HUD, chrome.
 * Doctrine: game-ui-icons (one set contract, 32px legible, no text in glyphs).
 * Lucide is vector fallback; Brian’s packs fill pixelSrc via theme (amber/cyan).
 */

import { catalogPixelSrc } from "./pixel-packs";
import type { IconTheme } from "./pixel-packs";

export type IconCategory =
  | "wire"
  | "folder"
  | "tool"
  | "hud"
  | "engine"
  | "chrome"
  | "anim"
  | "indoor";

export type IconEntry = {
  id: string;
  name: string;
  category: IconCategory;
  /** lucide-react export name */
  lucide: string;
  tags: string[];
  /** optional pixel art override path under /public */
  pixelSrc?: string;
  /** engine folder / wire role this icon represents */
  wireRole?: string;
};

/** Default curated set — uniform outlined weight via Lucide stroke */
export const ICON_CATALOG: IconEntry[] = [
  // Wire / engine feed roles
  { id: "wire.character", name: "Characters", category: "wire", lucide: "User", tags: ["character", "sprite"], wireRole: "characters" },
  { id: "wire.animation", name: "Animations", category: "wire", lucide: "Clapperboard", tags: ["anim", "frames"], wireRole: "animations" },
  { id: "wire.environment", name: "Environments", category: "wire", lucide: "Trees", tags: ["env", "level"], wireRole: "environments" },
  { id: "wire.parallax", name: "Parallax", category: "wire", lucide: "Layers", tags: ["parallax", "bg"], wireRole: "parallax" },
  { id: "wire.effects", name: "Effects", category: "wire", lucide: "Sparkles", tags: ["fx", "vfx"], wireRole: "effects" },
  { id: "wire.items", name: "Items", category: "wire", lucide: "Package", tags: ["item", "loot"], wireRole: "items" },
  { id: "wire.ui", name: "UI", category: "wire", lucide: "LayoutDashboard", tags: ["ui", "menu"], wireRole: "ui" },
  { id: "wire.hud", name: "HUD", category: "wire", lucide: "Gauge", tags: ["hud", "overlay"], wireRole: "hud" },
  { id: "wire.audio", name: "Audio", category: "wire", lucide: "Music", tags: ["sfx", "music"], wireRole: "audio" },
  { id: "wire.tiles", name: "Tiles", category: "wire", lucide: "Grid3x3", tags: ["tile", "terrain"], wireRole: "tiles" },
  { id: "wire.indoor", name: "Interiors", category: "wire", lucide: "Building2", tags: ["indoor", "room"], wireRole: "interiors" },

  // Folder structure
  { id: "folder.root", name: "Game root", category: "folder", lucide: "FolderTree", tags: ["project"] },
  { id: "folder.main", name: "Main ready", category: "folder", lucide: "FolderCheck", tags: ["export"] },
  { id: "folder.facing", name: "Directionals", category: "folder", lucide: "Compass", tags: ["facing"] },
  { id: "folder.concept", name: "Concept art", category: "folder", lucide: "Palette", tags: ["concept"] },
  { id: "folder.variants", name: "Variants", category: "folder", lucide: "Copy", tags: ["variant"] },
  { id: "folder.cosmetics", name: "Cosmetics", category: "folder", lucide: "Shirt", tags: ["skin"] },

  // Tools
  { id: "tool.select", name: "Select", category: "tool", lucide: "MousePointer2", tags: ["select"] },
  { id: "tool.move", name: "Move", category: "tool", lucide: "Move", tags: ["move"] },
  { id: "tool.pan", name: "Pan", category: "tool", lucide: "Hand", tags: ["pan"] },
  { id: "tool.brush", name: "Brush", category: "tool", lucide: "Pencil", tags: ["draw"] },
  { id: "tool.eraser", name: "Eraser", category: "tool", lucide: "Eraser", tags: ["erase"] },
  { id: "tool.fill", name: "Fill", category: "tool", lucide: "PaintBucket", tags: ["fill"] },
  { id: "tool.eyedropper", name: "Eyedropper", category: "tool", lucide: "Pipette", tags: ["pick"] },
  { id: "tool.line", name: "Line", category: "tool", lucide: "Minus", tags: ["line"] },
  { id: "tool.rect", name: "Rectangle", category: "tool", lucide: "Square", tags: ["rect"] },
  { id: "tool.ellipse", name: "Ellipse", category: "tool", lucide: "Circle", tags: ["ellipse"] },
  { id: "tool.marquee", name: "Marquee", category: "tool", lucide: "Crop", tags: ["marquee"] },
  { id: "tool.anim", name: "Anim square", category: "tool", lucide: "Clapperboard", tags: ["anim"] },
  { id: "tool.slice", name: "Sheet slicer", category: "tool", lucide: "Scissors", tags: ["slice"] },
  { id: "tool.wire", name: "Feed plane", category: "tool", lucide: "Cable", tags: ["wire"] },
  { id: "tool.particle", name: "Particles", category: "tool", lucide: "Sparkles", tags: ["fx"] },
  { id: "tool.beacon", name: "Beacon", category: "tool", lucide: "MapPin", tags: ["beacon"] },
  { id: "tool.private_mask", name: "Private mask", category: "tool", lucide: "Shield", tags: ["mask"] },
  { id: "tool.chunk", name: "Chunk grid", category: "tool", lucide: "Grid3x3", tags: ["chunk"] },

  // HUD / chrome
  { id: "hud.health", name: "Health", category: "hud", lucide: "Heart", tags: ["hp"] },
  { id: "hud.energy", name: "Energy", category: "hud", lucide: "Zap", tags: ["mp"] },
  { id: "hud.wanted", name: "Wanted", category: "hud", lucide: "AlertTriangle", tags: ["wanted"] },
  { id: "hud.minimap", name: "Minimap", category: "hud", lucide: "Map", tags: ["map"] },
  { id: "chrome.studio", name: "Studio", category: "chrome", lucide: "PenTool", tags: ["suite"] },
  { id: "chrome.engine", name: "City Engine", category: "chrome", lucide: "Car", tags: ["play"] },
  { id: "chrome.shared_plane", name: "Shared plane", category: "chrome", lucide: "Users", tags: ["collab"] },
  { id: "chrome.watch_mode", name: "Watch mode", category: "chrome", lucide: "Eye", tags: ["watch"] },
  { id: "chrome.play_ghost", name: "Play Ghost", category: "chrome", lucide: "Ghost", tags: ["ghost"] },
  { id: "chrome.spatial_scope", name: "Spatial scope", category: "chrome", lucide: "Box", tags: ["scope"] },
  { id: "chrome.export_map", name: "Export map", category: "chrome", lucide: "Map", tags: ["export"] },
  { id: "chrome.first_night", name: "First Night", category: "chrome", lucide: "Moon", tags: ["guide"] },
  { id: "chrome.indoor", name: "Indoor", category: "chrome", lucide: "Building2", tags: ["building"] },
  { id: "chrome.solitaire", name: "Solitaire", category: "chrome", lucide: "Spade", tags: ["easter"] },

  // Anim library
  { id: "anim.idle", name: "Idle cycle", category: "anim", lucide: "Pause", tags: ["idle", "loop"] },
  { id: "anim.walk", name: "Walk cycle", category: "anim", lucide: "Move", tags: ["walk", "loop"] },
  { id: "anim.run", name: "Run cycle", category: "anim", lucide: "Zap", tags: ["run"] },
  { id: "anim.attack", name: "Attack", category: "anim", lucide: "Swords", tags: ["action"] },
  { id: "anim.hit", name: "Hit / hurt", category: "anim", lucide: "HeartCrack", tags: ["damage"] },
  { id: "anim.death", name: "Death", category: "anim", lucide: "Skull", tags: ["death"] },
  { id: "anim.fx", name: "FX strip", category: "anim", lucide: "Flame", tags: ["fx"] },
  { id: "anim.cosmetic", name: "Cosmetic layer", category: "anim", lucide: "Shirt", tags: ["cosmetic"] },
  { id: "anim.onion", name: "Onion skin", category: "anim", lucide: "Layers", tags: ["onion"] },
  { id: "anim.audit", name: "Anim audit", category: "anim", lucide: "CheckSquare", tags: ["audit"] },
];

/** Resolve pixelSrc for catalog entry given theme */
export function resolvePixelSrc(entry: IconEntry, theme: IconTheme): string | undefined {
  if (theme === "vector") return undefined;
  return catalogPixelSrc(entry.id, theme) ?? entry.pixelSrc;
}

export function iconsByCategory(cat: IconCategory): IconEntry[] {
  return ICON_CATALOG.filter((i) => i.category === cat);
}

export function findIcon(id: string): IconEntry | undefined {
  return ICON_CATALOG.find((i) => i.id === id);
}

export function searchIcons(q: string): IconEntry[] {
  const s = q.trim().toLowerCase();
  if (!s) return ICON_CATALOG;
  return ICON_CATALOG.filter(
    (i) =>
      i.id.includes(s) ||
      i.name.toLowerCase().includes(s) ||
      i.tags.some((t) => t.includes(s)) ||
      i.category.includes(s),
  );
}

/** Style contract notes for UI (game-ui-icons) */
export const ICON_STYLE_CONTRACT = {
  stroke: "uniform outline weight (Lucide default 2) OR crisp pixel 1px packs",
  fill: "outline-only default; solid only if whole set is solid",
  padding: "optical center, ~12% inset at 32px",
  noText: true,
  sizes: [16, 24, 32, 48] as const,
  themes: ["amber", "cyan", "vector"] as const,
  notes:
    "Brian packs live under /pixel-icons. Theme toggle swaps amber/cyan/vector without changing wireRole bindings.",
} as const;
