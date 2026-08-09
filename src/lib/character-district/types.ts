/**
 * Character & Animation District — Gemini doctrine (2026-08-05)
 * Spatial layout IS the animation tree / state machine.
 * D_State: strip inside state pad = engine state binding (manual override = exception)
 * D_Compose: modular layers non-destructive; bake optional at export
 */

export type DistrictZoneId = "dna" | "facing" | "strips" | "logic";

export type AnimStateName =
  | "idle"
  | "walk"
  | "run"
  | "attack"
  | "hurt"
  | "death"
  | "custom";

export type CollisionBoxKind = "hurt" | "hit" | "push";

export type CollisionBox = {
  id: string;
  kind: CollisionBoxKind;
  /** local to frame pixel space */
  x: number;
  y: number;
  w: number;
  h: number;
  frameIndex: number;
  /** optional damage / event hook for hitboxes */
  eventTag?: string;
};

export type StatePad = {
  id: string;
  state: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  /** anim region ids whose centers fall in pad (or manual bind) */
  animIds: string[];
  /** manual binds win over spatial */
  manualAnimIds: string[];
};

export type StateTransition = {
  id: string;
  fromPadId: string;
  toPadId: string;
  /** e.g. "Velocity > 0", "On_Anim_End" */
  condition: string;
};

export type FacingCell = {
  dir: string; // N NE E SE S SW W NW
  x: number;
  y: number;
  /** optional artboard or note id */
  artboardId?: string | null;
  /** non-destructive flip of source dir */
  mirrorOf?: string | null;
};

export type CharacterDistrict = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  /** zone rects relative to district origin */
  zones: Record<
    DistrictZoneId,
    { x: number; y: number; w: number; h: number; label: string }
  >;
  statePads: StatePad[];
  transitions: StateTransition[];
  facings: FacingCell[];
  /** chassis / modular artboard ids in DNA hub */
  chassisArtboardId?: string | null;
  modularArtboardIds: string[];
  paletteNote?: string;
  /** collision boxes keyed by animId */
  collisions: Record<string, CollisionBox[]>;
  /** frame-level SFX anchors (D_Audio) */
  audioAnchors: import("./audio-anchors").AudioAnchor[];
  /** secondary spring nodes (D_Spring) */
  springs: import("./springs").SpringNode[];
  createdAt: number;
};

export const STATE_COLORS: Record<string, string> = {
  idle: "#4ecb71",
  walk: "#38bdf8",
  run: "#2dd4bf",
  attack: "#e85d5d",
  hurt: "#fbbf24",
  death: "#64748b",
  custom: "#a78bfa",
};

export const COLLISION_COLORS: Record<CollisionBoxKind, string> = {
  hurt: "#4ecb71",
  hit: "#e85d5d",
  push: "#38bdf8",
};
