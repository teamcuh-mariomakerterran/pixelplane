/**
 * Memory Web — general-purpose social/knowledge memory for agents.
 * Not faction-only: works for single NPCs, selection groups, plane groups, factions.
 * Game-type agnostic: crime sandbox, RPG, RTS, etc. feed the same event bus.
 */

export type AgentKind = "npc" | "player" | "group" | "faction" | "crowd";

export type MemoryEventKind =
  | "saw"
  | "heard"
  | "helped"
  | "hurt"
  | "betrayed"
  | "traded"
  | "quest"
  | "dialogue"
  | "smash_near"
  | "wanted"
  | "entered_place"
  | "wore" // cosmetics / appearance memory
  | "allied"
  | "rival"
  | "custom";

export type MemorySubject = {
  /** agent id remembered about */
  agentId: string;
  /** free tags e.g. "rat_ninja", "red_jacket" */
  tags?: string[];
};

export type MemoryEvent = {
  id: string;
  kind: MemoryEventKind;
  /** who holds this memory (or group/faction id that inherits) */
  ownerId: string;
  /** optional subject of the memory (player, other npc, place) */
  subject?: MemorySubject;
  /** short human line for debug / dialogue hooks */
  summary: string;
  /** structured payload (HP delta, quest id, cosmetic id…) */
  data?: Record<string, string | number | boolean>;
  /** world/plane position if spatial */
  x?: number;
  y?: number;
  t: number;
  /** importance 0–1 for decay / priority dialogue */
  weight: number;
  /** if set, only these agents also get a copy (gossip) */
  gossipTo?: string[];
};

export type Agent = {
  id: string;
  kind: AgentKind;
  name: string;
  /** faction membership (optional) */
  factionId?: string | null;
  /** group memberships (selection groups, plane clusters) */
  groupIds: string[];
  /** plane placement — own plane cluster or studio position */
  planeX?: number;
  planeY?: number;
  planeId?: string | null;
  /** appearance tags for "wore" / silhouette memory */
  appearance: string[];
  /** disposition toward subjects: agentId → -1..1 */
  disposition: Record<string, number>;
  color: string;
  /** engine spawn hint */
  engineX?: number;
  engineY?: number;
  active: boolean;
};

export type AgentGroup = {
  id: string;
  name: string;
  /** how the group was formed */
  origin: "selection" | "plane_cluster" | "faction_slice" | "manual";
  memberIds: string[];
  /** optional plane rect that defines membership by spatial scope */
  planeRect?: { x: number; y: number; w: number; h: number } | null;
  color: string;
  /** shared memory owner id (group acts as memory holder) */
  sharesMemory: boolean;
};

export type Faction = {
  id: string;
  name: string;
  color: string;
  /** member agent ids */
  memberIds: string[];
  /** disposition toward other factions */
  factionStance: Record<string, number>;
  blurb?: string;
};

export type MemoryWebState = {
  agents: Agent[];
  groups: AgentGroup[];
  factions: Faction[];
  events: MemoryEvent[];
  /** player agent id (usually one) */
  playerId: string;
};
