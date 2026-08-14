/**
 * Dispatch a wire-plane trigger. Imports stores at call time via getState.
 */

import type { WireZone } from "@/lib/pixel/types";
import type { WireTriggerKind } from "./triggers";
import { boardsInZone } from "./triggers";
import { useStudio } from "@/store/studio";
import { useCraftLab } from "@/store/craft-lab";
import { useSignature } from "@/store/signature";

export function fireWireAction(zone: WireZone, kind: WireTriggerKind) {
  const studio = useStudio.getState();
  const boards = boardsInZone(zone, studio.artboards);
  const first = boards[0];

  switch (kind) {
    case "boil": {
      const ids = boards.map((b) => b.id);
      useCraftLab.getState().setBoilOn(true);
      useCraftLab.setState({ boilBoardIds: ids.length ? ids : null, boilAll: false });
      studio.setStatus(
        ids.length
          ? `WIRE · boil on ${ids.length} board${ids.length === 1 ? "" : "s"}`
          : "WIRE · boil on (empty plane — paint a board in it)",
      );
      return;
    }
    case "tile_kit": {
      if (!first) {
        studio.setStatus("WIRE · no board in plane to grow a kit from");
        return;
      }
      studio.selectArtboard(first.id);
      useCraftLab.getState().spawnTileKitFrom(first.id);
      return;
    }
    case "qa": {
      if (!first) {
        studio.setStatus("WIRE · no board in plane to QA");
        return;
      }
      studio.selectArtboard(first.id);
      useCraftLab.getState().runQaOn(first.id);
      return;
    }
    case "mutate": {
      if (!first) {
        studio.setStatus("WIRE · no board in plane to mutate");
        return;
      }
      studio.selectArtboard(first.id);
      useSignature.getState().spawnMutationRails();
      studio.setStatus(`WIRE · mutation rails · ${first.name}`);
      return;
    }
    case "bloom": {
      if (!first) {
        studio.setStatus("WIRE · no board in plane to bloom");
        return;
      }
      studio.selectArtboard(first.id);
      useSignature.getState().bakeNeonBloomOnActive();
      studio.setStatus(`WIRE · neon bloom · ${first.name}`);
      return;
    }
    default:
      studio.setStatus("WIRE · no trigger");
  }
}
