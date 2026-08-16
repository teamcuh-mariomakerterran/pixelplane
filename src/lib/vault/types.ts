export type VaultKind = "building" | "prop" | "item" | "vehicle" | "fx" | "ui" | "other";

export type AssetPerspective = "topdown" | "threequarter" | "side" | "ui";

export type InteractMode =
  | "none"
  | "pickup"
  | "button"
  | "switch"
  | "dialog"
  | "sit"
  | "sleep"
  | "stair"
  | "window"
  | "unlock";

export type PickupKind = "health" | "ammo" | "quest" | "collectable" | "junk" | "custom" | "key";

export type SwitchAction = "particle" | "sound" | "activate" | "dialog" | "light";

export type FlickerKind = "none" | "regular" | "irregular";

export type DoorKind = "entry" | "interior" | "stair";

export type DoorRect = {
  id: string;
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  label?: string;
  kind?: DoorKind;
  toRoomId?: string | null;
  locked?: boolean;
  keyId?: string | null;
};

export type RoomDef = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  downstairs?: boolean;
  parentId?: string | null;
  floor?: number;
  dark?: boolean;
  secret?: boolean;
  locked?: boolean;
  keyId?: string | null;
  window?: boolean;
  ambient?: string;
};

export type FixtureDef = {
  id: string;
  name: string;
  assetId?: string;
  roomId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  base: boolean;
  interactable: boolean;
  mode: InteractMode;
  consume: boolean;
  dialog: string;
  pickupKind?: PickupKind;
  sellValue?: number;
  combineWith?: string;
  combineResult?: string;
  linkId?: string;
  switchAction?: SwitchAction;
  destructible: boolean;
  destPreset?: string;
  color: string;
  solid?: boolean;
  isKey?: boolean;
  keyId?: string;
  locked?: boolean;
  stairTo?: string | null;
  saves?: boolean;
  crumbs?: boolean;
  phone?: boolean;
  hiddenUntil?: string;
};

export type LightDef = {
  id: string;
  roomId: string;
  x: number;
  y: number;
  strength: number;
  coneDeg: number;
  heading: number;
  feather: number;
  flicker: FlickerKind;
  flickerMutate: boolean;
  color: string;
  switchId?: string | null;
  on?: boolean;
};

export type VaultAsset = {
  id: string;
  name: string;
  kind: VaultKind;
  tags: string[];
  perspective: AssetPerspective;
  sourceUrl?: string | null;
  artboardId?: string | null;
  w: number;
  h: number;
  enterable: boolean;
  doors: DoorRect[];
  rooms: RoomDef[];
  fixtures: FixtureDef[];
  lights: LightDef[];
  parentId?: string | null;
  built: boolean;
  createdAt: number;
};

export type ClipboardEntry = {
  assetId: string;
  addedAt: number;
};

export const VAULT_KINDS: VaultKind[] = [
  "building",
  "prop",
  "item",
  "vehicle",
  "fx",
  "ui",
  "other",
];

export const ASSET_PERSPECTIVES: AssetPerspective[] = [
  "topdown",
  "threequarter",
  "side",
  "ui",
];

export const PERSPECTIVE_LABEL: Record<AssetPerspective, string> = {
  topdown: "Top-down",
  threequarter: "3/4",
  side: "Side",
  ui: "Flat UI",
};

export const INTERACT_MODES: InteractMode[] = [
  "none",
  "pickup",
  "button",
  "switch",
  "dialog",
  "sit",
  "sleep",
  "stair",
  "window",
  "unlock",
];

export const PICKUP_KINDS: PickupKind[] = [
  "health",
  "ammo",
  "quest",
  "collectable",
  "junk",
  "custom",
  "key",
];

export function roomFloor(r: RoomDef): number {
  if (typeof r.floor === "number") return r.floor;
  return r.downstairs ? -1 : 0;
}
