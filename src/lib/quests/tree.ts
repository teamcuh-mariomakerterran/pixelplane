import { uid } from "@/lib/utils";
import type { QuestNode, QuestNodeKind, QuestTree } from "@/lib/pixel/types";

const NODE_W = 140;
const NODE_H = 56;
const GAP_Y = 78;
const GAP_X = 170;

export const QUEST_NODE_META: Record<
  QuestNodeKind,
  { label: string; color: string; hint: string }
> = {
  start: { label: "Start", color: "#4ecb71", hint: "Quest entry — only one" },
  objective: { label: "Objective", color: "#38bdf8", hint: "Do the thing" },
  branch: { label: "Branch", color: "#a78bfa", hint: "Player choice / fork" },
  condition: { label: "Condition", color: "#fbbf24", hint: "If item / flag / destructible" },
  dialogue: { label: "Dialogue", color: "#fb7185", hint: "Talk beat" },
  reward: { label: "Reward", color: "#e8a838", hint: "XP / item / unlock" },
  fail: { label: "Fail", color: "#f97316", hint: "Fail state / retry" },
  gate: { label: "Gate", color: "#94a3b8", hint: "Requires prior quest / key" },
  end: { label: "End", color: "#64748b", hint: "Quest complete terminal" },
};

export function createStarterQuestTree(opts: {
  name?: string;
  x: number;
  y: number;
  color?: string;
  wireZoneId?: string;
}): QuestTree {
  const start: QuestNode = {
    id: uid("qn"),
    kind: "start",
    title: "Start",
    body: "Quest begins",
    x: 40,
    y: 40,
    next: [],
  };
  const obj: QuestNode = {
    id: uid("qn"),
    kind: "objective",
    title: "Main objective",
    body: "Describe what the player must do",
    x: 40,
    y: 40 + GAP_Y,
    next: [],
  };
  const branch: QuestNode = {
    id: uid("qn"),
    kind: "branch",
    title: "Choice",
    body: "Path A or Path B",
    x: 40,
    y: 40 + GAP_Y * 2,
    next: [],
    edgeLabels: {},
  };
  const rewA: QuestNode = {
    id: uid("qn"),
    kind: "reward",
    title: "Reward A",
    body: "Generous payout",
    x: 40,
    y: 40 + GAP_Y * 3,
    next: [],
  };
  const rewB: QuestNode = {
    id: uid("qn"),
    kind: "reward",
    title: "Reward B",
    body: "Alternate payout",
    x: 40 + GAP_X,
    y: 40 + GAP_Y * 3,
    next: [],
  };
  const end: QuestNode = {
    id: uid("qn"),
    kind: "end",
    title: "Complete",
    body: "Quest ends",
    x: 40 + GAP_X / 2,
    y: 40 + GAP_Y * 4,
    next: [],
  };

  start.next = [obj.id];
  obj.next = [branch.id];
  branch.next = [rewA.id, rewB.id];
  branch.edgeLabels = { [rewA.id]: "Path A", [rewB.id]: "Path B" };
  rewA.next = [end.id];
  rewB.next = [end.id];

  return {
    id: uid("quest"),
    name: opts.name ?? "New quest line",
    x: opts.x,
    y: opts.y,
    w: 420,
    h: 420,
    nodes: [start, obj, branch, rewA, rewB, end],
    color: opts.color ?? "#eab308",
    wireZoneId: opts.wireZoneId ?? null,
    folderId: null,
    folderPath: null,
  };
}

export function addQuestNode(
  tree: QuestTree,
  kind: QuestNodeKind,
  at?: { x: number; y: number },
): QuestTree {
  const node: QuestNode = {
    id: uid("qn"),
    kind,
    title: QUEST_NODE_META[kind].label,
    body: "",
    x: at?.x ?? 40 + (tree.nodes.length % 3) * GAP_X * 0.5,
    y: at?.y ?? 40 + tree.nodes.length * 28,
    next: [],
  };
  return { ...tree, nodes: [...tree.nodes, node] };
}

export function connectQuestNodes(
  tree: QuestTree,
  fromId: string,
  toId: string,
  label?: string,
): QuestTree {
  return {
    ...tree,
    nodes: tree.nodes.map((n) => {
      if (n.id !== fromId) return n;
      if (n.next.includes(toId)) return n;
      const edgeLabels = { ...(n.edgeLabels ?? {}) };
      if (label) edgeLabels[toId] = label;
      return { ...n, next: [...n.next, toId], edgeLabels };
    }),
  };
}

export function exportQuestTreeJson(tree: QuestTree) {
  return {
    id: tree.id,
    name: tree.name,
    version: 1,
    nodes: tree.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      next: n.next,
      edgeLabels: n.edgeLabels ?? {},
      links: n.links ?? {},
    })),
  };
}

export { NODE_W, NODE_H };
