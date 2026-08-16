/**
 * Studio implementation of EngineHost.
 * This is the ONE file allowed to wrap Zustand stores for the play clock.
 */

import type { JuiceSfx } from "@/lib/audio/juice";
import { useStudio } from "@/store/studio";
import { useAssetVault } from "@/store/asset-vault";
import { useHauntDistrict } from "@/store/haunt-district";
import { useMemoryWeb } from "@/store/memory-web";
import { useCraftLab } from "@/store/craft-lab";
import { useKernels } from "@/store/kernels";
import { useRuleCards } from "@/store/rule-cards";
import { useSoundSprites } from "@/store/sound-sprites";
import type { EngineHost, MemoryAgent, ProcBurstSpec } from "./host";
import type { IndoorBits } from "./vault-runtime";

export function createStudioHost(): EngineHost {
  return {
    playSfx(kind: JuiceSfx | string, pitch = 1, pan = 0) {
      try {
        useSoundSprites.getState().playKind(kind as JuiceSfx, pitch, pan);
      } catch {
        /* audio optional */
      }
    },
    rules() {
      try {
        return useRuleCards.getState().cards;
      } catch {
        return [];
      }
    },
    vaultAsset(id) {
      try {
        return useAssetVault.getState().assets.find((a) => a.id === id) ?? null;
      } catch {
        return null;
      }
    },
    fireTrigger(id) {
      try {
        useStudio.getState().fireArmedTriggers(id);
      } catch {
        /* studio may not be mounted */
      }
    },
    ingestHaunt(bits: IndoorBits) {
      try {
        useHauntDistrict.getState().ingestBits(bits);
      } catch {
        /* */
      }
    },
    dialogueFor(npcId) {
      try {
        return useMemoryWeb.getState().dialogueFor(npcId) ?? "";
      } catch {
        return "";
      }
    },
    smashAt(x, y, r) {
      try {
        useMemoryWeb.getState().engineSmashAt(x, y, r);
      } catch {
        /* */
      }
    },
    addLead(title, body) {
      try {
        useKernels.getState().addLead(title, body);
      } catch {
        /* */
      }
    },
    acquire(name, color) {
      try {
        useKernels.getState().acquire(name, color);
      } catch {
        /* */
      }
    },
    procBurst(destroyed, smashCount): ProcBurstSpec | null {
      try {
        const craft = useCraftLab.getState();
        if (!craft.procSmash) return null;
        return {
          kind: destroyed ? "explosion" : "spark",
          seed: (craft.proc.seed + smashCount * 17) | 0,
          hue: craft.proc.hue,
          intensity: craft.proc.intensity,
          life: destroyed ? 0.42 : 0.22,
        };
      } catch {
        return null;
      }
    },
    memoryAgents(): MemoryAgent[] {
      try {
        return useMemoryWeb
          .getState()
          .web.agents.filter((a) => a.kind === "npc" && a.active)
          .map((a) => ({
            id: a.id,
            name: a.name,
            engineX: a.engineX,
            engineY: a.engineY,
            color: a.color,
            factionId: a.factionId,
          }));
      } catch {
        return [];
      }
    },
  };
}
