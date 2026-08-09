import { useStudio } from "@/store/studio";
import { uid } from "@/lib/utils";
import type { Artboard, Layer } from "@/lib/pixel/types";

/** Place a peer-shared buffer as a new artboard on the plane */
export function emptyArtboardFromBuffer(opts: {
  name: string;
  w: number;
  h: number;
  x: number;
  y: number;
  data: Uint8ClampedArray;
}) {
  const layer: Layer = {
    id: uid("layer"),
    name: "Shared branch",
    visible: true,
    locked: false,
    opacity: 1,
    data: opts.data,
    rev: 1,
  };
  const board: Artboard = {
    id: uid("board"),
    name: opts.name,
    x: opts.x,
    y: opts.y,
    width: opts.w,
    height: opts.h,
    layers: [layer],
    activeLayerId: layer.id,
    kind: "sheet",
  };
  useStudio.setState((s) => ({
    artboards: [...s.artboards, board],
    activeArtboardId: board.id,
    status: `Received shared board “${opts.name}”`,
  }));
  return board.id;
}
