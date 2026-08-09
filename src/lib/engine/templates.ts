/**
 * Engine-friendly folder templates for PixelPlane wiring.
 * Godot / Unity / Unreal / GameMaker / Generic — used when connecting a game project.
 */

import { uid } from "@/lib/utils";
import type {
  AssetFolder,
  EngineId,
  EngineProject,
  PixelSizePreset,
  WireCategory,
} from "@/lib/pixel/types";
import { PARALLAX_SUBFOLDERS } from "./parallax";

export const PIXEL_SIZE_OPTIONS: PixelSizePreset[] = [
  8, 16, 24, 32, 48, 64, 96, 128, 256,
];

export const WIRE_CATEGORY_META: Record<
  WireCategory,
  { label: string; color: string; icon: string; rootKey: string }
> = {
  characters: { label: "Characters", color: "#e8a838", icon: "user", rootKey: "characters" },
  animations: { label: "Animations", color: "#a78bfa", icon: "clapper", rootKey: "animations" },
  environments: { label: "Environments", color: "#4ecb71", icon: "map", rootKey: "environments" },
  parallax: { label: "Parallax", color: "#818cf8", icon: "layers", rootKey: "parallax" },
  objects: { label: "Objects", color: "#38bdf8", icon: "box", rootKey: "objects" },
  destructibles: {
    label: "Destructibles",
    color: "#f97316",
    icon: "bomb",
    rootKey: "destructibles",
  },
  items: { label: "Items", color: "#f0b84a", icon: "gem", rootKey: "items" },
  effects: { label: "Effects", color: "#3ecfcf", icon: "spark", rootKey: "effects" },
  particles: { label: "Particles", color: "#2dd4bf", icon: "spark", rootKey: "particles" },
  ui: { label: "UI", color: "#fb7185", icon: "layout", rootKey: "ui" },
  hud: { label: "HUD", color: "#ff5cb0", icon: "gauge", rootKey: "hud" },
  chrome: { label: "Chrome", color: "#c084fc", icon: "frame", rootKey: "chrome" },
  scenes: { label: "Scenes", color: "#4ecb71", icon: "film", rootKey: "scenes" },
  quests: { label: "Quests", color: "#eab308", icon: "git-branch", rootKey: "quests" },
  notes: { label: "Notes", color: "#8b93a7", icon: "note", rootKey: "notes" },
  custom: { label: "Custom", color: "#5c6578", icon: "folder", rootKey: "custom" },
};

export const CHARACTER_SUBFOLDERS = [
  { name: "main", label: "Main (game-ready)" },
  { name: "facings", label: "Directional facings" },
  { name: "concept", label: "Concept art" },
  { name: "variants", label: "Variants" },
  { name: "cosmetics", label: "Cosmetics" },
] as const;

export const ANIMATION_SUBFOLDERS = [
  { name: "idle", label: "Idle" },
  { name: "walk", label: "Walk" },
  { name: "run", label: "Run" },
  { name: "attack", label: "Attack" },
  { name: "sheets", label: "Sheets" },
] as const;

export const ENVIRONMENT_SUBFOLDERS = [
  { name: "tiles", label: "Tiles" },
  { name: "props", label: "Props" },
  { name: "backgrounds", label: "Backgrounds" },
  { name: "colliders", label: "Colliders" },
] as const;

export const DESTRUCTIBLE_SUBFOLDERS = [
  { name: "pristine", label: "Pristine (full HP)" },
  { name: "damaged", label: "Damaged stages" },
  { name: "debris", label: "Debris / broken" },
  { name: "hitboxes", label: "Hitboxes" },
  { name: "fx", label: "Break FX" },
] as const;

export const QUEST_SUBFOLDERS = [
  { name: "trees", label: "Quest trees" },
  { name: "objectives", label: "Objectives" },
  { name: "dialogues", label: "Dialogues" },
  { name: "rewards", label: "Rewards" },
  { name: "gates", label: "Gates / conditions" },
] as const;

function folder(
  name: string,
  category: WireCategory,
  opts?: Partial<AssetFolder>,
): AssetFolder {
  return {
    id: uid("folder"),
    name,
    category,
    path: opts?.path ?? name,
    children: opts?.children ?? [],
    pixelSize: opts?.pixelSize,
    inheritsSize: opts?.inheritsSize ?? true,
    isEntityRoot: opts?.isEntityRoot ?? false,
    createdAt: Date.now(),
  };
}

function withPaths(nodes: AssetFolder[], parentPath = ""): AssetFolder[] {
  return nodes.map((n) => {
    const path = parentPath ? `${parentPath}/${n.name}` : n.name;
    return {
      ...n,
      path,
      children: withPaths(n.children, path),
    };
  });
}

function artRoot(engine: EngineId): string {
  if (engine === "godot") return "assets";
  if (engine === "unity") return "Assets/Art";
  if (engine === "unreal") return "Content/PixelArt";
  if (engine === "gamemaker") return "sprites";
  return "art";
}

/** Root art tree under assets/ for the selected engine. */
export function buildDefaultAssetTree(engine: EngineId): AssetFolder[] {
  const parallaxChildren = withPaths(
    PARALLAX_SUBFOLDERS.map((s) =>
      folder(s.name, "parallax", { pixelSize: 16 }),
    ),
    "parallax",
  );

  const destChildren = withPaths(
    DESTRUCTIBLE_SUBFOLDERS.map((s) =>
      folder(s.name, "destructibles", { pixelSize: 32 }),
    ),
    "destructibles",
  );

  const questChildren = withPaths(
    QUEST_SUBFOLDERS.map((s) => folder(s.name, "quests", { pixelSize: 16 })),
    "quests",
  );

  const base = [
    folder("characters", "characters", {
      pixelSize: 48,
      children: [],
    }),
    folder("animations", "animations", { pixelSize: 48 }),
    folder("environments", "environments", { pixelSize: 16 }),
    folder("parallax", "parallax", {
      pixelSize: 16,
      children: parallaxChildren,
    }),
    folder("objects", "objects", { pixelSize: 32 }),
    folder("destructibles", "destructibles", {
      pixelSize: 32,
      children: destChildren,
    }),
    folder("items", "items", { pixelSize: 32 }),
    folder("effects", "effects", { pixelSize: 32 }),
    folder("particles", "particles", { pixelSize: 32 }),
    folder("ui", "ui", { pixelSize: 16 }),
    folder("hud", "hud", { pixelSize: 16 }),
    folder("chrome", "chrome", { pixelSize: 16 }),
    folder("scenes", "scenes", { pixelSize: 16 }),
    folder("quests", "quests", {
      pixelSize: 16,
      children: questChildren,
    }),
    folder("notes", "notes"),
  ];

  return withPaths(base, artRoot(engine));
}

export function createEngineProject(opts: {
  name: string;
  engine: EngineId;
  rootFolderName?: string;
  defaultCharacterSize?: PixelSizePreset;
}): EngineProject {
  const tree = buildDefaultAssetTree(opts.engine);
  if (opts.defaultCharacterSize) {
    const chars = findFolderByCategory(tree, "characters");
    if (chars) chars.pixelSize = opts.defaultCharacterSize;
  }
  const rootName = opts.rootFolderName?.trim() || slugify(opts.name);
  return {
    id: uid("proj"),
    name: opts.name.trim() || "Game Project",
    engine: opts.engine,
    rootFolderName: rootName,
    connected: true,
    connectedAt: Date.now(),
    folders: tree,
    sizeDefaults: {
      characters: opts.defaultCharacterSize ?? 48,
      animations: opts.defaultCharacterSize ?? 48,
      environments: 16,
      parallax: 16,
      objects: 32,
      destructibles: 32,
      items: 32,
      effects: 32,
      particles: 32,
      ui: 16,
      hud: 16,
      chrome: 16,
      scenes: 16,
      quests: 16,
      notes: 16,
      custom: 32,
    },
  };
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "project"
  );
}

export function findFolderByCategory(
  nodes: AssetFolder[],
  category: WireCategory,
): AssetFolder | null {
  for (const n of nodes) {
    if (n.category === category && !n.isEntityRoot) return n;
    const hit = findFolderByCategory(n.children, category);
    if (hit) return hit;
  }
  return null;
}

export function findFolderById(
  nodes: AssetFolder[],
  id: string,
): AssetFolder | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findFolderById(n.children, id);
    if (hit) return hit;
  }
  return null;
}

export function listFoldersFlat(
  nodes: AssetFolder[],
  depth = 0,
): { folder: AssetFolder; depth: number }[] {
  const out: { folder: AssetFolder; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ folder: n, depth });
    out.push(...listFoldersFlat(n.children, depth + 1));
  }
  return out;
}

export function addChildFolder(
  nodes: AssetFolder[],
  parentId: string,
  child: AssetFolder,
): AssetFolder[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, child] };
    }
    return { ...n, children: addChildFolder(n.children, parentId, child) };
  });
}

export function updateFolderInTree(
  nodes: AssetFolder[],
  id: string,
  patch: Partial<AssetFolder>,
): AssetFolder[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    return { ...n, children: updateFolderInTree(n.children, id, patch) };
  });
}

export function mapFolders(
  nodes: AssetFolder[],
  fn: (f: AssetFolder) => AssetFolder,
): AssetFolder[] {
  return nodes.map((n) => {
    const mapped = fn(n);
    return {
      ...mapped,
      children: mapFolders(mapped.children, fn),
    };
  });
}

/** parent folder + entity name → folder with category substructure */
export function createEntityFolder(
  parent: AssetFolder,
  entityName: string,
  category: WireCategory,
  pixelSize: number,
): AssetFolder {
  let subs: { name: string; label: string }[] = [];
  if (category === "characters") subs = [...CHARACTER_SUBFOLDERS];
  else if (category === "animations") subs = [...ANIMATION_SUBFOLDERS];
  else if (category === "environments") subs = [...ENVIRONMENT_SUBFOLDERS];
  else if (category === "destructibles") subs = [...DESTRUCTIBLE_SUBFOLDERS];
  else if (category === "quests") subs = [...QUEST_SUBFOLDERS];

  const safe = entityName.trim() || "Entity";
  const children = subs.map((s) =>
    folder(s.name, category, {
      pixelSize,
      inheritsSize: true,
      path: `${parent.path}/${safe}/${s.name}`,
    }),
  );
  return folder(safe, category, {
    pixelSize,
    isEntityRoot: true,
    children,
    path: `${parent.path}/${safe}`,
  });
}

export function engineLabel(engine: EngineId): string {
  switch (engine) {
    case "godot":
      return "Godot 4";
    case "unity":
      return "Unity";
    case "unreal":
      return "Unreal";
    case "gamemaker":
      return "GameMaker";
    default:
      return "Generic";
  }
}

export function engineReadme(project: EngineProject): string {
  return `# ${project.name} — PixelPlane export

Engine: ${engineLabel(project.engine)}
Root: ${project.rootFolderName}

## Folders
Asset folders were generated for characters, animations, environments,
parallax, objects, **destructibles**, items, effects, UI/HUD, scenes, and **quests**.

## Destructibles
Place stage art under \`destructibles/<entity>/{pristine,damaged,debris,hitboxes,fx}\`.
PixelPlane tracks HP stages on the plane; engines read the folder stages.

## Quests
Quest trees export as JSON under \`quests/trees/\`. Wire objectives to
destructibles, items, and dialogue nodes from the plane quest builder.

Generated by PixelPlane.
`;
}
