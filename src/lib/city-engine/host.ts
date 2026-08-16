/**
 * EngineHost — the only door between the play clock and the studio desk.
 *
 * Sim / juice / indoor-session MUST talk to this port.
 * They must never import a Zustand store.
 *
 * Studio implements the port in host-studio.ts.
 * Tests / headless use noopHost().
 */

import type { JuiceSfx } from "@/lib/audio/juice";
import type { RuleCard } from "@/store/rule-cards";
import type { VaultAsset } from "@/lib/vault/types";
import type { IndoorBits } from "./vault-runtime";

export type ProcBurstSpec = {
  kind: "explosion" | "spark" | "debris";
  seed: number;
  hue: number;
  intensity: number;
  life: number;
};

export type MemoryAgent = {
  id: string;
  name: string;
  engineX?: number;
  engineY?: number;
  color: string;
  factionId?: string | null;
};

export type EngineHost = {
  playSfx(kind: JuiceSfx | string, pitch?: number, pan?: number): void;
  rules(): readonly RuleCard[];
  vaultAsset(id: string): VaultAsset | null;
  fireTrigger(id: string): void;
  ingestHaunt(bits: IndoorBits): void;
  dialogueFor(npcId: string): string;
  smashAt(x: number, y: number, r: number): void;
  addLead(title: string, body: string): void;
  acquire(name: string, color: string): void;
  procBurst(destroyed: boolean, smashCount: number): ProcBurstSpec | null;
  memoryAgents(): MemoryAgent[];
};

export function noopHost(): EngineHost {
  return {
    playSfx() {},
    rules: () => [],
    vaultAsset: () => null,
    fireTrigger() {},
    ingestHaunt() {},
    dialogueFor: () => "",
    smashAt() {},
    addLead() {},
    acquire() {},
    procBurst: () => null,
    memoryAgents: () => [],
  };
}
