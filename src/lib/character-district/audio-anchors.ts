/**
 * D_Audio — frame-level audio event anchors on anim strips / state pads.
 */

import { uid } from "@/lib/utils";

export type AudioAnchor = {
  id: string;
  animId: string;
  frameIndex: number;
  /** label / asset name e.g. step_left */
  name: string;
  /** optional path or clip id for export */
  clipId?: string;
  /** plane position of the SFX node (for spatial viz) */
  planeX?: number;
  planeY?: number;
  volume?: number;
};

export function createAudioAnchor(opts: {
  animId: string;
  frameIndex: number;
  name: string;
  planeX?: number;
  planeY?: number;
  clipId?: string;
}): AudioAnchor {
  return {
    id: uid("sfx"),
    animId: opts.animId,
    frameIndex: opts.frameIndex,
    name: opts.name,
    clipId: opts.clipId ?? opts.name,
    planeX: opts.planeX,
    planeY: opts.planeY,
    volume: 1,
  };
}

/** Events for a given frame (engine plays these when frame hits) */
export function anchorsOnFrame(
  anchors: AudioAnchor[],
  animId: string,
  frameIndex: number,
): AudioAnchor[] {
  return anchors.filter((a) => a.animId === animId && a.frameIndex === frameIndex);
}

/** Export payload for state machine */
export function audioEventsForExport(anchors: AudioAnchor[]) {
  return anchors.map((a) => ({
    animId: a.animId,
    frame: a.frameIndex,
    clip: a.clipId ?? a.name,
    volume: a.volume ?? 1,
  }));
}
