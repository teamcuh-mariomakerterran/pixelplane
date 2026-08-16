/**
 * Quest runtime contract — Studio quest trees → City Engine play.
 * Smash / enter-building / drive events feed objectives without hardcoding one quest.
 */

import type { QuestTree, QuestNode } from "@/lib/pixel/types";

export type QuestEventKind = "smash" | "enter_indoor" | "exit_indoor" | "enter_vehicle" | "wanted";

export type QuestEvent = {
  kind: QuestEventKind;
  /** optional prop kind for smash */
  propKind?: string;
  at: number;
};

export type RuntimeObjective = {
  nodeId: string;
  title: string;
  body: string;
  /** parsed from body e.g. "Break 5 street props" */
  targetSmashes: number;
  progressSmashes: number;
  done: boolean;
  /** linked destructible ids from spatial magnet (soft match) */
  linkedTags: string[];
};

export type QuestRuntime = {
  treeId: string;
  name: string;
  active: boolean;
  completed: boolean;
  objectives: RuntimeObjective[];
  currentIndex: number;
  events: QuestEvent[];
  log: string[];
};

function parseSmashTarget(text: string): number {
  const m = text.match(/(?:break|smash|destroy|hit)\s*(\d+)/i);
  if (m) return Math.max(1, parseInt(m[1]!, 10));
  if (/smash|break|crate|destruct|alley/i.test(text)) return 5;
  return 0;
}

export function questTreeToRuntime(tree: QuestTree): QuestRuntime {
  const objectives = tree.nodes
    .filter((n) => n.kind === "objective" || n.kind === "condition")
    .map((n) => nodeToObjective(n));

  // if no parseable smash objectives, still surface first objective as flavor
  if (!objectives.length) {
    const first = tree.nodes.find((n) => n.kind === "objective");
    if (first) objectives.push(nodeToObjective(first));
  }

  return {
    treeId: tree.id,
    name: tree.name,
    active: true,
    completed: false,
    objectives,
    currentIndex: 0,
    events: [],
    log: [`Quest loaded: ${tree.name}`],
  };
}

function nodeToObjective(n: QuestNode): RuntimeObjective {
  const text = `${n.title} ${n.body}`;
  const tags: string[] = [];
  if (n.links?.destructibleId) tags.push(n.links.destructibleId);
  if (n.links?.itemTag) tags.push(...n.links.itemTag.split(",").map((s) => s.trim()).filter(Boolean));
  return {
    nodeId: n.id,
    title: n.title,
    body: n.body,
    targetSmashes: parseSmashTarget(text),
    progressSmashes: 0,
    done: false,
    linkedTags: tags,
  };
}

/** Prefer Studio demo / first tree with smash objective */
export function pickPrimaryQuest(trees: QuestTree[]): QuestTree | null {
  if (!trees.length) return null;
  const smashy = trees.find((t) =>
    t.nodes.some((n) => /smash|break|crate|alley|heat/i.test(`${n.title} ${n.body} ${t.name}`)),
  );
  return smashy ?? trees[0]!;
}

export function applyQuestEvent(rt: QuestRuntime, ev: QuestEvent): QuestRuntime {
  if (!rt.active || rt.completed) return rt;
  const events = [...rt.events.slice(-40), ev];
  let log = rt.log;
  let objectives = rt.objectives.map((o) => ({ ...o }));
  let currentIndex = rt.currentIndex;
  let completed: boolean = rt.completed;

  if (ev.kind === "smash") {
    const obj = objectives[currentIndex];
    if (obj && !obj.done && obj.targetSmashes > 0) {
      obj.progressSmashes = Math.min(obj.targetSmashes, obj.progressSmashes + 1);
      log = [
        ...log,
        `Smash ${obj.progressSmashes}/${obj.targetSmashes} · ${obj.title}`,
      ].slice(-12);
      if (obj.progressSmashes >= obj.targetSmashes) {
        obj.done = true;
        log = [...log, `Objective complete: ${obj.title}`].slice(-12);
        // advance
        const next = objectives.findIndex((o, i) => i > currentIndex && !o.done);
        if (next >= 0) {
          currentIndex = next;
          log = [...log, `Next: ${objectives[next]!.title}`].slice(-12);
        } else if (objectives.every((o) => o.done || o.targetSmashes === 0)) {
          // mark remaining non-smash as done for demo
          objectives = objectives.map((o) =>
            o.targetSmashes === 0 ? { ...o, done: true } : o,
          );
          if (objectives.every((o) => o.done)) {
            completed = true;
            log = [...log, `QUEST COMPLETE: ${rt.name}`].slice(-12);
          }
        }
      }
    } else if (obj && !obj.done && obj.targetSmashes === 0) {
      // flavor objective — one smash advances
      obj.done = true;
      log = [...log, `Beat complete: ${obj.title}`].slice(-12);
      const next = objectives.findIndex((o, i) => i > currentIndex && !o.done);
      if (next >= 0) currentIndex = next;
      else {
        completed = objectives.every((o) => o.done);
        if (completed) log = [...log, `QUEST COMPLETE: ${rt.name}`].slice(-12);
      }
    }
  }

  if (ev.kind === "enter_indoor") {
    log = [...log, "Entered building"].slice(-12);
  }

  return {
    ...rt,
    objectives,
    currentIndex,
    events,
    log,
    completed,
    active: !completed,
  };
}

export function questHudLine(rt: QuestRuntime | null): string {
  if (!rt) return "";
  if (rt.completed) return `✓ ${rt.name}`;
  const o = rt.objectives[rt.currentIndex];
  if (!o) return rt.name;
  if (o.targetSmashes > 0) {
    return `${rt.name}: ${o.title} (${o.progressSmashes}/${o.targetSmashes})`;
  }
  return `${rt.name}: ${o.title}`;
}

export function emitQuest(
  s: { quest: QuestRuntime | null; status: string },
  ev: QuestEvent,
) {
  if (!s.quest) return;
  s.quest = applyQuestEvent(s.quest, ev);
  const line = questHudLine(s.quest);
  if (line) s.status = line;
  if (s.quest.completed) {
    s.status = `QUEST COMPLETE · ${s.quest.name}`;
  }
}
