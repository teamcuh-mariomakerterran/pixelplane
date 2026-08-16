import type { HauntEvent, HauntKind } from "@/lib/city-engine/house-memory";

export type ResiduePad = {
  id: string;
  eventId: string;
  kind: HauntKind;
  label: string;
  roomName: string;
  x: number;
  y: number;
  t: number;
};

export type HauntDistrict = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vaultAssetId: string | null;
  residues: ResiduePad[];
  sleepNode: { x: number; y: number } | null;
  lastSave: number | null;
};

export type { HauntEvent, HauntKind };
