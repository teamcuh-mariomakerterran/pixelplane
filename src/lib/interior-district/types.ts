/**
 * Interior District — floor plan pads ARE the rooms.
 * Circulation tethers ARE the doors/stairs. Layout is the interior.
 */

export type InteriorZoneId = "plan" | "flow" | "air";

export type CirculationKind = "door" | "stair";

export type RoomPad = {
  id: string;
  roomId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floor: number;
  dark: boolean;
  locked: boolean;
  window: boolean;
  color: string;
};

export type CirculationLink = {
  id: string;
  fromPadId: string;
  toPadId: string;
  kind: CirculationKind;
  locked: boolean;
  keyId?: string | null;
};

export type LightPad = {
  id: string;
  roomPadId: string;
  x: number;
  y: number;
  color: string;
  flicker: "none" | "regular" | "irregular";
};

export type InteriorDistrict = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vaultAssetId: string | null;
  zones: Record<InteriorZoneId, { x: number; y: number; w: number; h: number; label: string }>;
  roomPads: RoomPad[];
  links: CirculationLink[];
  lightPads: LightPad[];
};

export const INTERIOR_ZONE_LABEL: Record<InteriorZoneId, string> = {
  plan: "Floor plan",
  flow: "Circulation",
  air: "Atmosphere",
};
