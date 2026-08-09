/**
 * Default hotkey bindings + feature tip copy for PixelPlane.
 * StarCraft-style F1–F12 camera locations; tool letters; command chords.
 */

import type { ToolId } from "@/lib/pixel/types";

export type KeyChord = {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
};

export type HotkeyAction =
  | { kind: "tool"; tool: ToolId }
  | { kind: "bookmark_save"; slot: number }
  | { kind: "bookmark_jump"; slot: number }
  | {
      kind: "command";
      cmd:
        | "undo"
        | "redo"
        | "copy"
        | "cut"
        | "paste"
        | "duplicate"
        | "save"
        | "help"
        | "brush_dec"
        | "brush_inc";
    };

export type Binding = {
  id: string;
  label: string;
  chord: KeyChord;
  action: HotkeyAction;
};

export type FeatureTip = {
  title: string;
  body: string;
  creative?: string;
};

export const TOOL_LABELS: Record<ToolId, string> = {
  select: "Select",
  move: "Move",
  pan: "Pan",
  brush: "Brush",
  eraser: "Eraser",
  fill: "Fill",
  eyedropper: "Eyedropper",
  line: "Line",
  rect: "Rectangle",
  ellipse: "Ellipse",
  marquee: "Marquee",
  "anim-region": "Animation square",
  particle: "Particle region",
  place: "Place anim",
  "wire-zone": "Feed plane",
  destructible: "Destructible",
  "quest-tree": "Quest tree",
  "game-viewport": "Game viewport",
  "constraint-stamp": "Constraint stamp",
};

export function chordKey(c: KeyChord): string {
  const parts: string[] = [];
  if (c.ctrl) parts.push("ctrl");
  if (c.alt) parts.push("alt");
  if (c.shift) parts.push("shift");
  if (c.meta) parts.push("meta");
  parts.push((c.key || "").toLowerCase());
  return parts.join("+");
}

export function formatChord(c: KeyChord): string {
  if (!c.key) return "(unbound)";
  const parts: string[] = [];
  if (c.ctrl || c.meta) parts.push("Ctrl");
  if (c.alt) parts.push("Alt");
  if (c.shift) parts.push("Shift");
  const k = c.key.length === 1 ? c.key.toUpperCase() : c.key;
  parts.push(k);
  return parts.join("+");
}

export function actionLabel(a: HotkeyAction): string {
  if (a.kind === "tool") return TOOL_LABELS[a.tool] ?? a.tool;
  if (a.kind === "bookmark_save") return `Save camera F${a.slot}`;
  if (a.kind === "bookmark_jump") return `Jump camera F${a.slot}`;
  const cmds: Record<string, string> = {
    undo: "Undo",
    redo: "Redo",
    copy: "Copy",
    cut: "Cut",
    paste: "Paste",
    duplicate: "Duplicate artboard",
    save: "Save project",
    help: "Help",
    brush_dec: "Smaller brush",
    brush_inc: "Larger brush",
  };
  return cmds[a.cmd] ?? a.cmd;
}

export function bindingLabel(b: Binding): string {
  return `${b.label} · ${formatChord(b.chord)}`;
}

/** Normalize keyboard event → chord (ctrl||meta for cross-platform). */
export function eventToChord(e: KeyboardEvent): KeyChord | null {
  // ignore pure modifiers
  if (
    e.key === "Control" ||
    e.key === "Shift" ||
    e.key === "Alt" ||
    e.key === "Meta"
  ) {
    return null;
  }
  let key = e.key.toLowerCase();
  if (key === " ") key = "space";
  // F-keys keep f1..f12
  if (/^f\d{1,2}$/i.test(e.key)) key = e.key.toLowerCase();
  // Normalize arrow names
  if (key.startsWith("arrow")) key = key.replace("arrow", "");
  return {
    key,
    ctrl: e.ctrlKey || e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey,
    meta: false,
  };
}

function chord(
  key: string,
  mods: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {},
): KeyChord {
  return {
    key: key.toLowerCase(),
    ctrl: !!mods.ctrl,
    alt: !!mods.alt,
    shift: !!mods.shift,
    meta: false,
  };
}

function toolBinding(id: string, key: string, tool: ToolId, label?: string): Binding {
  return {
    id,
    label: label ?? TOOL_LABELS[tool],
    chord: chord(key),
    action: { kind: "tool", tool },
  };
}

export function defaultBindings(): Binding[] {
  const tools: Binding[] = [
    toolBinding("tool_select", "v", "select"),
    toolBinding("tool_move", "m", "move"),
    toolBinding("tool_pan", "h", "pan"),
    toolBinding("tool_brush", "b", "brush"),
    toolBinding("tool_eraser", "e", "eraser"),
    // G is also used for beacon cycle in shell when free — fill uses G by default
    toolBinding("tool_fill", "g", "fill"),
    toolBinding("tool_eyedropper", "i", "eyedropper"),
    toolBinding("tool_line", "l", "line"),
    toolBinding("tool_rect", "r", "rect"),
    toolBinding("tool_ellipse", "o", "ellipse"),
    toolBinding("tool_marquee", "s", "marquee"),
    toolBinding("tool_anim", "a", "anim-region"),
    toolBinding("tool_particle", "p", "particle"),
    toolBinding("tool_place", "t", "place"),
    toolBinding("tool_wire", "w", "wire-zone"),
    toolBinding("tool_viewport", "u", "game-viewport", "Game viewport"),
    toolBinding("tool_stamp", "n", "constraint-stamp", "Constraint stamp"),
  ];

  const commands: Binding[] = [
    {
      id: "cmd_undo",
      label: "Undo",
      chord: chord("z", { ctrl: true }),
      action: { kind: "command", cmd: "undo" },
    },
    {
      id: "cmd_redo",
      label: "Redo",
      chord: chord("y", { ctrl: true }),
      action: { kind: "command", cmd: "redo" },
    },
    {
      id: "cmd_redo_shift",
      label: "Redo (Shift+Z)",
      chord: chord("z", { ctrl: true, shift: true }),
      action: { kind: "command", cmd: "redo" },
    },
    {
      id: "cmd_copy",
      label: "Copy",
      chord: chord("c", { ctrl: true }),
      action: { kind: "command", cmd: "copy" },
    },
    {
      id: "cmd_cut",
      label: "Cut",
      chord: chord("x", { ctrl: true }),
      action: { kind: "command", cmd: "cut" },
    },
    {
      id: "cmd_paste",
      label: "Paste",
      chord: chord("v", { ctrl: true }),
      action: { kind: "command", cmd: "paste" },
    },
    {
      id: "cmd_dup",
      label: "Duplicate artboard",
      chord: chord("d", { ctrl: true }),
      action: { kind: "command", cmd: "duplicate" },
    },
    {
      id: "cmd_save",
      label: "Save project",
      chord: chord("s", { ctrl: true }),
      action: { kind: "command", cmd: "save" },
    },
    {
      id: "cmd_help",
      label: "Help",
      chord: chord("?", { shift: true }),
      action: { kind: "command", cmd: "help" },
    },
    {
      id: "cmd_help2",
      label: "Help",
      chord: chord("f1", { ctrl: true, shift: true }),
      action: { kind: "command", cmd: "help" },
    },
    {
      id: "cmd_brush_dec",
      label: "Smaller brush",
      chord: chord("["),
      action: { kind: "command", cmd: "brush_dec" },
    },
    {
      id: "cmd_brush_inc",
      label: "Larger brush",
      chord: chord("]"),
      action: { kind: "command", cmd: "brush_inc" },
    },
  ];

  const bookmarks: Binding[] = [];
  for (let slot = 1; slot <= 12; slot++) {
    bookmarks.push({
      id: `bm_jump_${slot}`,
      label: `Jump F${slot}`,
      chord: chord(`f${slot}`),
      action: { kind: "bookmark_jump", slot },
    });
    bookmarks.push({
      id: `bm_save_${slot}`,
      label: `Save F${slot}`,
      chord: chord(`f${slot}`, { ctrl: true }),
      action: { kind: "bookmark_save", slot },
    });
  }

  return [...tools, ...commands, ...bookmarks];
}

export const FEATURE_TIPS: Record<string, FeatureTip> = {
  select: {
    title: "Select",
    body: "Click artboards, anims, wires, quests, and props. Drag to move what you grab.",
    creative: "Think of the plane as a studio floor — click anything to claim it.",
  },
  move: {
    title: "Move",
    body: "Drag boards, animation squares, feed planes, and props freely across the infinite plane.",
  },
  pan: {
    title: "Pan",
    body: "Drag to slide the camera. Hold Space for temporary pan from any tool.",
  },
  brush: {
    title: "Brush",
    body: "Paint on the active artboard. [ ] resize · color in the toolbar.",
    creative: "Pixel first — scale later. Tiny brushes read best in-game.",
  },
  eraser: {
    title: "Eraser",
    body: "Clears pixels on the active layer. Same size as the brush.",
  },
  fill: {
    title: "Fill",
    body: "Flood-fill connected pixels on the active layer.",
  },
  eyedropper: {
    title: "Eyedropper",
    body: "Sample a color from any artboard into the active palette.",
  },
  line: {
    title: "Line",
    body: "Click-drag a straight pixel line on the active board.",
  },
  rect: {
    title: "Rectangle",
    body: "Drag a rectangle outline (or filled if fill shapes is on).",
  },
  ellipse: {
    title: "Ellipse",
    body: "Drag an ellipse outline (or filled if fill shapes is on).",
  },
  marquee: {
    title: "Marquee",
    body: "Drag a selection rect · Ctrl+C/X/V to copy/cut/paste pixels.",
  },
  "anim-region": {
    title: "Animation square",
    body: "Drag a frame-sized region. It becomes a live strip you can play, onion, and audit.",
    creative: "Drop walk/idle/attack pads into a Character District for spatial binding.",
  },
  particle: {
    title: "Particle region",
    body: "Drag a box for spark / smoke / magic / dust / slash FX previews.",
  },
  place: {
    title: "Place anim",
    body: "Click the plane to drop the active animation as a scene actor.",
  },
  "wire-zone": {
    title: "Feed plane",
    body: "Drag a rectangle that owns art for export. Drop a wire connector to bind a folder.",
    creative: "Spatial layout IS your project structure — nested pads win ownership.",
  },
  destructible: {
    title: "Destructible",
    body: "Click to place smashable props with HP stages for City Engine.",
  },
  "quest-tree": {
    title: "Quest tree",
    body: "Click to plant a quest builder graph on the plane.",
  },
  "game-viewport": {
    title: "Ghost of the game",
    body: "Click to drop a viewport frame at a target resolution (GBC, GBA, 16:9…). Safe areas help compose for the real game.",
    creative: "What you see in the frame is what players see — design inside the ghost.",
  },
  "constraint-stamp": {
    title: "Constraint stamp",
    body: "Click to place a fixed pixel cage (16×16, 48×48…). Paste and generate can clamp into the active stamp.",
    creative: "Cages keep sheet production honest — no accidental 47×49 tiles.",
  },
  bookmarks: {
    title: "Camera locations",
    body: "Ctrl+F1…F12 saves a view. F1…F12 jumps back — StarCraft base cams for your studio floor.",
    creative: "F1 characters · F2 anims · F3 world · F4 HUD — make a mental map.",
  },
  session_ghosts: {
    title: "Session ghosts",
    body: "Saving a camera stores a ghost snapshot. Jumping F-keys recalls the place and the ghost thumb.",
    creative: "Your past camera is a co-worker — leave breadcrumbs for tomorrow-you.",
  },
  wire_heat: {
    title: "Wire heat map",
    body: "Toggle in Plane systems. Feed planes glow by coverage and wire health — orphans run hot.",
  },
  minimap: {
    title: "Plane map",
    body: "Always-on overview. Click to jump the camera anywhere on the floor.",
  },
  "game-viewport-alt": {
    title: "Ghost of the game",
    body: "Place resolution frames on the plane. Capture PNG at native game res.",
  },
  "constraint-stamp-tip": {
    title: "Constraint stamps",
    body: "Fixed pixel cages for tiles and icons. Active stamp clamps paste.",
  },
};
