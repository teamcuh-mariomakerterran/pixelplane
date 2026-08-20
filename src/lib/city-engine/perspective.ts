/**
 * Perspective profiles — engine growth doctrine (§1.2).
 * Current live profile: top-down open-world sandbox.
 * Other families (iso, 3/4, FPS) clone this shape — they do not fork sim.
 * FPS is already-authored Grok work: absorb as a module, do not rewrite from Doom refs.
 */

export type PerspectiveId =
  | "topdown_openworld"
  | "topdown_true"
  | "isometric"
  | "oblique_34"
  | "fps_raycast"
  | "rts"
  | "rpg_overworld"
  | "puzzle_grid"
  | "sports_field";

export type PerspectiveProfile = {
  id: PerspectiveId;
  /** Human label for Studio + engine HUD */
  label: string;
  /** Short design intent */
  blurb: string;
  /** Suggested pixel sizes for assets in this template */
  pixelSizes: number[];
  defaultPixelSize: number;
  /** Camera language for this profile (engine reads these) */
  zoom: {
    exploration: number;
    action: number;
    interior: number;
    lerp: number;
  };
  /** What art roles usually need for this view */
  assetHints: string[];
  /** Modules this profile expects (seams for growth) */
  modules: Array<
    | "vehicle"
    | "foot"
    | "indoors"
    | "destructibles"
    | "quests"
    | "wanted"
    | "traffic"
    | "minimap"
    | "fps"
  >;
  /** live = City Engine today. authored = exists (other Grok session) — absorb, don't invent. */
  status: "live" | "blueprint" | "planned" | "authored";
};

/** The birthplace profile — City Engine today */
export const TOPDOWN_OPENWORLD: PerspectiveProfile = {
  id: "topdown_openworld",
  label: "Top-down open world",
  blurb:
    "Classic crime-sandbox camera: wide while driving, closer on foot, doors into interiors.",
  pixelSizes: [16, 24, 32, 48, 64],
  defaultPixelSize: 32,
  zoom: {
    exploration: 1.1, // drive / city
    action: 2.6, // foot
    interior: 3.0,
    lerp: 0.08,
  },
  assetHints: [
    "Top-facing or 3/4 vehicles (sheet rows)",
    "Character walk cycles with 4 or 8 facings optional later",
    "Building footprints + door markers",
    "Street props (crate/barrel) read clearly at foot zoom",
    "Parallax optional — world map is ground truth",
  ],
  modules: [
    "vehicle",
    "foot",
    "indoors",
    "destructibles",
    "quests",
    "wanted",
    "traffic",
    "minimap",
  ],
  status: "live",
};

/** Reserved blueprints — no runtime yet; prevents “we forgot iso” */
export const PERSPECTIVE_CATALOG: PerspectiveProfile[] = [
  TOPDOWN_OPENWORLD,
  {
    id: "topdown_true",
    label: "True top-down",
    blurb: "Straight-down camera; facings matter less for bodies, more for shadows.",
    pixelSizes: [16, 32, 64],
    defaultPixelSize: 32,
    zoom: { exploration: 1.4, action: 2.2, interior: 2.8, lerp: 0.1 },
    assetHints: ["Top-only character discs", "Floor plans read as maps"],
    modules: ["foot", "indoors", "quests", "minimap"],
    status: "blueprint",
  },
  {
    id: "isometric",
    label: "Isometric",
    blurb: "Diamond grid; depth sorting and tile height matter.",
    pixelSizes: [32, 64],
    defaultPixelSize: 32,
    zoom: { exploration: 1.0, action: 1.6, interior: 2.0, lerp: 0.1 },
    assetHints: ["Iso character sheets", "Height-sorted props"],
    modules: ["foot", "indoors", "destructibles", "quests"],
    status: "planned",
  },
  {
    id: "oblique_34",
    label: "Angled / 3-4 top-down",
    blurb: "Slight pitch; characters show more body; common JRPG street feel.",
    pixelSizes: [16, 24, 32, 48],
    defaultPixelSize: 32,
    zoom: { exploration: 1.2, action: 2.0, interior: 2.5, lerp: 0.09 },
    assetHints: ["3/4 walk cycles", "Building front faces"],
    modules: ["foot", "vehicle", "indoors", "quests"],
    status: "planned",
  },
  {
    id: "fps_raycast",
    label: "FPS / first-person (PixelPlane family)",
    blurb:
      "Already programmed with Grok. Absorb as a perspective + EngineModule — do not invent a second runtime, do not rewrite from Doom refs.",
    pixelSizes: [64, 128],
    defaultPixelSize: 64,
    zoom: { exploration: 1, action: 1, interior: 1, lerp: 1 },
    assetHints: ["Billboard sprites", "Wall textures", "Weapon viewmodels"],
    modules: ["foot", "quests", "fps"],
    status: "authored",
  },
];

export function getPerspective(id: PerspectiveId = "topdown_openworld"): PerspectiveProfile {
  return PERSPECTIVE_CATALOG.find((p) => p.id === id) ?? TOPDOWN_OPENWORLD;
}

/** Apply profile zoom language onto engine config shape (no hardcode in one file forever). */
export function zoomTargets(
  profile: PerspectiveProfile,
  mode: "drive" | "foot" | "indoor",
): number {
  if (mode === "drive") return profile.zoom.exploration;
  if (mode === "indoor") return profile.zoom.interior;
  return profile.zoom.action;
}
