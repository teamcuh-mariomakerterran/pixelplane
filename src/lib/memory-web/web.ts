/**
 * Memory Web core API — pure functions, engine + studio both use this.
 */

import { uid } from "@/lib/utils";
import type {
  Agent,
  AgentGroup,
  AgentKind,
  Faction,
  MemoryEvent,
  MemoryEventKind,
  MemoryWebState,
} from "./types";

const FACTION_COLORS = ["#e85d5d", "#38bdf8", "#a78bfa", "#4ecb71", "#e8a838", "#fb7185"];
const AGENT_COLORS = ["#f0b84a", "#2dd4bf", "#c084fc", "#94a3b8", "#f97316", "#4ade80"];

export function createEmptyWeb(): MemoryWebState {
  const playerId = uid("ag");
  const player: Agent = {
    id: playerId,
    kind: "player",
    name: "Player",
    factionId: null,
    groupIds: [],
    appearance: [],
    disposition: {},
    color: "#e8a838",
    active: true,
  };
  return {
    agents: [player],
    groups: [],
    factions: [],
    events: [],
    playerId,
  };
}

export function createAgent(
  opts: {
    name: string;
    kind?: AgentKind;
    factionId?: string | null;
    planeX?: number;
    planeY?: number;
    planeId?: string | null;
    engineX?: number;
    engineY?: number;
    appearance?: string[];
    color?: string;
  },
): Agent {
  return {
    id: uid("ag"),
    kind: opts.kind ?? "npc",
    name: opts.name,
    factionId: opts.factionId ?? null,
    groupIds: [],
    planeX: opts.planeX,
    planeY: opts.planeY,
    planeId: opts.planeId ?? null,
    engineX: opts.engineX,
    engineY: opts.engineY,
    appearance: opts.appearance ?? [],
    disposition: {},
    color: opts.color ?? AGENT_COLORS[Math.floor(Math.random() * AGENT_COLORS.length)]!,
    active: true,
  };
}

export function createFaction(name: string, blurb?: string): Faction {
  return {
    id: uid("fac"),
    name,
    color: FACTION_COLORS[Math.floor(Math.random() * FACTION_COLORS.length)]!,
    memberIds: [],
    factionStance: {},
    blurb,
  };
}

export function addAgent(web: MemoryWebState, agent: Agent): MemoryWebState {
  return { ...web, agents: [...web.agents, agent] };
}

export function addFaction(web: MemoryWebState, f: Faction): MemoryWebState {
  return { ...web, factions: [...web.factions, f] };
}

export function assignToFaction(
  web: MemoryWebState,
  agentId: string,
  factionId: string | null,
): MemoryWebState {
  const agents = web.agents.map((a) =>
    a.id === agentId ? { ...a, factionId } : a,
  );
  const factions = web.factions.map((f) => {
    let memberIds = f.memberIds.filter((id) => id !== agentId);
    if (factionId && f.id === factionId) memberIds = [...memberIds, agentId];
    return { ...f, memberIds };
  });
  return { ...web, agents, factions };
}

/** Group from explicit multi-select of agent ids */
export function groupFromSelection(
  web: MemoryWebState,
  memberIds: string[],
  name?: string,
): { web: MemoryWebState; group: AgentGroup } {
  const group: AgentGroup = {
    id: uid("grp"),
    name: name ?? `Group ${web.groups.length + 1}`,
    origin: "selection",
    memberIds: [...new Set(memberIds)],
    planeRect: null,
    color: AGENT_COLORS[web.groups.length % AGENT_COLORS.length]!,
    sharesMemory: true,
  };
  const agents = web.agents.map((a) =>
    group.memberIds.includes(a.id)
      ? { ...a, groupIds: [...new Set([...a.groupIds, group.id])] }
      : a,
  );
  return { web: { ...web, agents, groups: [...web.groups, group] }, group };
}

/** Group from spatial plane rect — all agents whose plane point is inside */
export function groupFromPlaneCluster(
  web: MemoryWebState,
  rect: { x: number; y: number; w: number; h: number },
  name?: string,
): { web: MemoryWebState; group: AgentGroup } {
  const memberIds = web.agents
    .filter(
      (a) =>
        a.kind === "npc" &&
        a.planeX != null &&
        a.planeY != null &&
        a.planeX >= rect.x &&
        a.planeY >= rect.y &&
        a.planeX <= rect.x + rect.w &&
        a.planeY <= rect.y + rect.h,
    )
    .map((a) => a.id);
  const group: AgentGroup = {
    id: uid("grp"),
    name: name ?? `Plane cluster ${web.groups.length + 1}`,
    origin: "plane_cluster",
    memberIds,
    planeRect: rect,
    color: "#38bdf8",
    sharesMemory: true,
  };
  const agents = web.agents.map((a) =>
    memberIds.includes(a.id)
      ? { ...a, groupIds: [...new Set([...a.groupIds, group.id])] }
      : a,
  );
  return { web: { ...web, agents, groups: [...web.groups, group] }, group };
}

export function remember(
  web: MemoryWebState,
  opts: {
    ownerId: string;
    kind: MemoryEventKind;
    summary: string;
    subjectId?: string;
    subjectTags?: string[];
    data?: Record<string, string | number | boolean>;
    x?: number;
    y?: number;
    weight?: number;
    /** also copy to faction mates / group mates */
    propagate?: "none" | "group" | "faction" | "both";
  },
): MemoryWebState {
  const t = Date.now();
  const base: MemoryEvent = {
    id: uid("mem"),
    kind: opts.kind,
    ownerId: opts.ownerId,
    subject: opts.subjectId
      ? { agentId: opts.subjectId, tags: opts.subjectTags }
      : undefined,
    summary: opts.summary,
    data: opts.data,
    x: opts.x,
    y: opts.y,
    t,
    weight: opts.weight ?? 0.6,
  };

  const owners = new Set<string>([opts.ownerId]);
  const agent = web.agents.find((a) => a.id === opts.ownerId);
  const prop = opts.propagate ?? "none";

  if (agent && (prop === "group" || prop === "both")) {
    for (const gid of agent.groupIds) {
      const g = web.groups.find((x) => x.id === gid);
      if (!g?.sharesMemory) continue;
      for (const mid of g.memberIds) owners.add(mid);
    }
  }
  if (agent?.factionId && (prop === "faction" || prop === "both")) {
    const f = web.factions.find((x) => x.id === agent.factionId);
    if (f) for (const mid of f.memberIds) owners.add(mid);
  }

  const events = [...web.events];
  for (const oid of owners) {
    events.push({
      ...base,
      id: uid("mem"),
      ownerId: oid,
      gossipTo: oid === opts.ownerId ? [...owners].filter((id) => id !== oid) : undefined,
    });
  }
  // cap memory list
  const trimmed = events.length > 800 ? events.slice(events.length - 800) : events;

  // disposition nudge
  let agents = web.agents;
  if (opts.subjectId) {
    let delta = 0.02;
    if (opts.kind === "helped" || opts.kind === "allied") delta = 0.15;
    else if (opts.kind === "hurt" || opts.kind === "betrayed" || opts.kind === "wanted")
      delta = -0.2;
    else if (opts.kind === "smash_near") delta = -0.05;
    else if (opts.kind === "saw" || opts.kind === "heard") delta = 0.02;
    else delta = 0;

    if (delta !== 0) {
      agents = agents.map((a) => {
        if (!owners.has(a.id)) return a;
        const prev = a.disposition[opts.subjectId!] ?? 0;
        return {
          ...a,
          disposition: {
            ...a.disposition,
            [opts.subjectId!]: Math.max(-1, Math.min(1, prev + delta)),
          },
        };
      });
    }
  }

  return { ...web, events: trimmed, agents };
}

export function memoriesOf(web: MemoryWebState, ownerId: string, limit = 20): MemoryEvent[] {
  return web.events.filter((e) => e.ownerId === ownerId).slice(-limit).reverse();
}

export function memoriesAbout(
  web: MemoryWebState,
  subjectId: string,
  limit = 30,
): MemoryEvent[] {
  return web.events
    .filter((e) => e.subject?.agentId === subjectId)
    .slice(-limit)
    .reverse();
}

export function disposition(
  web: MemoryWebState,
  ownerId: string,
  subjectId: string,
): number {
  return web.agents.find((a) => a.id === ownerId)?.disposition[subjectId] ?? 0;
}

/** What an agent would say about the player / subject — dialogue hook */
export function dialogueHook(
  web: MemoryWebState,
  speakerId: string,
  aboutId: string,
): string | null {
  const mems = memoriesOf(web, speakerId, 40).filter((m) => m.subject?.agentId === aboutId);
  if (!mems.length) return null;
  const top = [...mems].sort((a, b) => b.weight - a.weight)[0]!;
  const d = disposition(web, speakerId, aboutId);
  const tone = d > 0.3 ? "warm" : d < -0.3 ? "cold" : "wary";
  return `[${tone}] ${top.summary}`;
}

export function seedDemoWeb(planeOrigin = { x: 2400, y: 200 }): MemoryWebState {
  let web = createEmptyWeb();
  const crews = createFaction("Neon Crew", "Street heat alley crew");
  const synd = createFaction("Syndicate", "Office upstairs suits");
  web = addFaction(web, crews);
  web = addFaction(web, synd);

  const names = [
    { n: "Vex", f: crews.id, dx: 0, dy: 0 },
    { n: "Moth", f: crews.id, dx: 40, dy: 20 },
    { n: "Rook", f: crews.id, dx: 80, dy: 0 },
    { n: "Glass", f: synd.id, dx: 200, dy: 40 },
    { n: "Ivory", f: synd.id, dx: 240, dy: 20 },
  ];
  for (const row of names) {
    let a = createAgent({
      name: row.n,
      kind: "npc",
      factionId: row.f,
      planeX: planeOrigin.x + row.dx,
      planeY: planeOrigin.y + row.dy,
      engineX: 900 + row.dx * 2,
      engineY: 1100 + row.dy * 2,
      appearance: row.f === crews.id ? ["jacket_neon"] : ["suit_gray"],
    });
    web = addAgent(web, a);
    web = assignToFaction(web, a.id, row.f);
  }

  // plane cluster group for Neon Crew NPCs on plane
  const { web: w2 } = groupFromPlaneCluster(
    web,
    { x: planeOrigin.x - 20, y: planeOrigin.y - 20, w: 140, h: 80 },
    "Alley table",
  );
  web = w2;

  // seed a memory: crew saw player smash
  const vex = web.agents.find((a) => a.name === "Vex");
  if (vex) {
    web = remember(web, {
      ownerId: vex.id,
      kind: "smash_near",
      summary: "Saw them smash crates in the alley",
      subjectId: web.playerId,
      weight: 0.75,
      propagate: "faction",
      x: planeOrigin.x,
      y: planeOrigin.y,
    });
  }
  return web;
}

export function exportMemoryJson(web: MemoryWebState): string {
  return JSON.stringify(
    {
      version: 1,
      doctrine:
        "Agent memory is general — NPC, selection group, plane cluster, faction are lenses on the same web.",
      playerId: web.playerId,
      agents: web.agents,
      groups: web.groups,
      factions: web.factions,
      events: web.events.slice(-200),
    },
    null,
    2,
  );
}
