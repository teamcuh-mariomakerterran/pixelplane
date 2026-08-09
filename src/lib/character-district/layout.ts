/**
 * Spawn a Character District template on the plane (4 zones + default state pads).
 */

import { uid } from "@/lib/utils";
import {
  STATE_COLORS,
  type CharacterDistrict,
  type StatePad,
  type FacingCell,
} from "./types";
import { centerOf, pointInRect } from "@/lib/spatial/scope";

const DEFAULT_STATES = ["idle", "walk", "run", "attack", "hurt", "death"] as const;

export function createCharacterDistrict(opts: {
  name?: string;
  x: number;
  y: number;
}): CharacterDistrict {
  const x = opts.x;
  const y = opts.y;
  // District footprint ~ large enough for strips + logic
  const w = 1680;
  const h = 980;

  const zones = {
    dna: { x: 24, y: 48, w: 420, h: 360, label: "Zone 1 · DNA & Modular Hub" },
    facing: { x: 24, y: 440, w: 420, h: 480, label: "Zone 2 · Facing Matrix" },
    strips: { x: 480, y: 48, w: 720, h: 520, label: "Zone 3 · Animation Strips" },
    logic: { x: 480, y: 600, w: 1160, h: 340, label: "Zone 4 · Logic Spine" },
  };

  // State pads along logic zone
  const statePads: StatePad[] = DEFAULT_STATES.map((state, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    return {
      id: uid("spad"),
      state,
      x: zones.logic.x + 24 + col * 280,
      y: zones.logic.y + 48 + row * 140,
      w: 250,
      h: 110,
      color: STATE_COLORS[state] ?? STATE_COLORS.custom!,
      animIds: [],
      manualAnimIds: [],
    };
  });

  // 8-way facing anchors
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const facings: FacingCell[] = dirs.map((dir, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    return {
      dir,
      x: zones.facing.x + 40 + col * 95,
      y: zones.facing.y + 80 + row * 160,
      artboardId: null,
      // E mirrors from W placeholder — artist draws E, W is non-destructive mirror
      mirrorOf: dir === "W" ? "E" : dir === "NW" ? "NE" : dir === "SW" ? "SE" : null,
    };
  });

  return {
    id: uid("cdist"),
    name: opts.name ?? "Character District",
    x,
    y,
    w,
    h,
    color: "#e8a838",
    zones,
    statePads,
    transitions: [
      {
        id: uid("stx"),
        fromPadId: statePads.find((p) => p.state === "idle")!.id,
        toPadId: statePads.find((p) => p.state === "walk")!.id,
        condition: "Velocity > 0",
      },
      {
        id: uid("stx"),
        fromPadId: statePads.find((p) => p.state === "walk")!.id,
        toPadId: statePads.find((p) => p.state === "idle")!.id,
        condition: "Velocity == 0",
      },
      {
        id: uid("stx"),
        fromPadId: statePads.find((p) => p.state === "attack")!.id,
        toPadId: statePads.find((p) => p.state === "idle")!.id,
        condition: "On_Anim_End",
      },
    ],
    facings,
    chassisArtboardId: null,
    modularArtboardIds: [],
    collisions: {},
    audioAnchors: [],
    springs: [],
    createdAt: Date.now(),
  };
}

/** Absolute world rect for a zone */
export function zoneWorld(
  d: CharacterDistrict,
  zone: keyof CharacterDistrict["zones"],
) {
  const z = d.zones[zone];
  return { x: d.x + z.x, y: d.y + z.y, w: z.w, h: z.h };
}

export function padWorld(d: CharacterDistrict, pad: StatePad) {
  return { x: d.x + pad.x, y: d.y + pad.y, w: pad.w, h: pad.h };
}

/**
 * D_State: spatial binding — anim centers inside pads register to that state.
 * Manual anim ids always stick even if moved out.
 */
export function resolveStateBindings(
  d: CharacterDistrict,
  anims: { id: string; x: number; y: number; frameW: number; frameH: number; name: string }[],
): CharacterDistrict {
  const statePads = d.statePads.map((pad) => {
    const world = padWorld(d, pad);
    const spatial: string[] = [];
    for (const a of anims) {
      const { cx, cy } = centerOf({
        x: a.x,
        y: a.y,
        width: a.frameW,
        height: a.frameH,
      });
      if (pointInRect(cx, cy, world, 0)) spatial.push(a.id);
    }
    // manual wins: always included; spatial fills rest
    const manual = pad.manualAnimIds;
    const animIds = [...new Set([...manual, ...spatial])];
    return { ...pad, animIds };
  });
  return { ...d, statePads };
}

/** Export-friendly state machine JSON for engine */
export function districtToStateMachine(
  d: CharacterDistrict,
  anims: { id: string; name: string }[],
  extras?: {
    audio?: { animId: string; frame: number; clip: string; volume: number }[];
    springs?: unknown[];
  },
) {
  const nameOf = (id: string) => anims.find((a) => a.id === id)?.name ?? id;
  return {
    version: 2,
    character: d.name,
    doctrine: "Spatial location creates engine state binding; manual is exception",
    states: d.statePads.map((p) => ({
      state: p.state,
      color: p.color,
      clips: p.animIds.map(nameOf),
      manualClips: p.manualAnimIds.map(nameOf),
    })),
    transitions: d.transitions.map((t) => {
      const from = d.statePads.find((p) => p.id === t.fromPadId)?.state;
      const to = d.statePads.find((p) => p.id === t.toPadId)?.state;
      return { from, to, condition: t.condition };
    }),
    facings: d.facings.map((f) => ({
      dir: f.dir,
      mirrorOf: f.mirrorOf,
    })),
    collisions: d.collisions,
    audioEvents: extras?.audio ?? d.audioAnchors.map((a) => ({
      animId: a.animId,
      frame: a.frameIndex,
      clip: a.clipId ?? a.name,
      volume: a.volume ?? 1,
      anim: nameOf(a.animId),
    })),
    springs: extras?.springs ?? d.springs,
  };
}
