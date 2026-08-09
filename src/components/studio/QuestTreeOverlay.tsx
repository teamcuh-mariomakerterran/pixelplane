import { useState } from "react";
import { useStudio } from "@/store/studio";
import { QUEST_NODE_META, NODE_W, NODE_H } from "@/lib/quests/tree";
import type { QuestNodeKind } from "@/lib/pixel/types";
import { Download, Plus, Trash2, Magnet } from "lucide-react";

const ADDABLE: QuestNodeKind[] = [
  "objective",
  "branch",
  "condition",
  "dialogue",
  "reward",
  "fail",
  "gate",
  "end",
];

/**
 * Inspector for the active quest tree on the plane.
 * Trees themselves paint via CanvasWorkspace; this is the builder chrome.
 */
export function QuestTreePanel() {
  const trees = useStudio((s) => s.questTrees);
  const activeId = useStudio((s) => s.activeQuestTreeId);
  const addNode = useStudio((s) => s.addQuestTreeNode);
  const del = useStudio((s) => s.deleteQuestTree);
  const exportJson = useStudio((s) => s.exportActiveQuestJson);
  const select = useStudio((s) => s.selectQuestTree);
  const update = useStudio((s) => s.updateQuestTree);
  const updateNode = useStudio((s) => s.updateQuestNode);
  const applySpatial = useStudio((s) => s.applySpatialQuestLinks);
  const [editId, setEditId] = useState<string | null>(null);

  const tree = trees.find((t) => t.id === activeId) ?? trees[0];
  if (!tree) return null;

  const editing = tree.nodes.find((n) => n.id === editId) ?? null;

  return (
    <div className="absolute bottom-10 right-2 z-20 w-[min(300px,calc(100vw-1rem))] rounded-md border border-amber-500/40 bg-bg-elevated/95 p-2 shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-amber-400">Quest builder</div>
          <input
            className="w-full bg-transparent text-xs font-medium text-fg outline-none"
            value={tree.name}
            onChange={(e) => update(tree.id, { name: e.target.value })}
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            title="Spatial link — bind nearby smashables/art by canvas proximity"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-amber-300"
            onClick={() => applySpatial(tree.id)}
          >
            <Magnet size={14} />
          </button>
          <button
            type="button"
            title="Export JSON"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg"
            onClick={() => {
              const j = exportJson();
              if (!j) return;
              const blob = new Blob([j], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${tree.name.replace(/\s+/g, "_")}.quest.json`;
              a.click();
            }}
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            title="Delete tree"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-danger"
            onClick={() => del(tree.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {trees.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {trees.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => select(t.id)}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                t.id === tree.id ? "bg-amber-500/20 text-amber-300" : "text-muted hover:bg-surface-2"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-2 max-h-36 space-y-1 overflow-y-auto">
        {tree.nodes.map((n) => {
          const m = QUEST_NODE_META[n.kind];
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => setEditId(n.id)}
              className={`w-full rounded border border-border/70 px-2 py-1 text-left text-[10px] ${
                editId === n.id ? "bg-amber-500/10" : "hover:bg-surface-2"
              }`}
              style={{ borderLeftColor: m.color, borderLeftWidth: 3 }}
            >
              <div className="font-semibold text-fg">
                {m.label} · {n.title}
              </div>
              <div className="truncate text-muted">{n.body || "—"}</div>
            </button>
          );
        })}
      </div>

      {editing && (
        <div className="mb-2 space-y-1 rounded border border-amber-500/30 bg-surface/50 p-2">
          <div className="text-[10px] font-medium text-amber-300/90">
            Edit · {QUEST_NODE_META[editing.kind].label}
          </div>
          <input
            className="w-full rounded border border-border bg-bg px-1.5 py-1 text-[11px] text-fg outline-none"
            value={editing.title}
            onChange={(e) =>
              updateNode(tree.id, editing.id, { title: e.target.value })
            }
            placeholder="Title"
          />
          <textarea
            className="h-14 w-full resize-none rounded border border-border bg-bg px-1.5 py-1 text-[11px] text-fg outline-none"
            value={editing.body}
            onChange={(e) =>
              updateNode(tree.id, editing.id, { body: e.target.value })
            }
            placeholder="What happens here…"
          />
        </div>
      )}

      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-subtle">Add node</div>
      <div className="flex flex-wrap gap-1">
        {ADDABLE.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => addNode(tree.id, k)}
            className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:border-amber-500/40 hover:text-fg"
          >
            <Plus size={10} />
            {QUEST_NODE_META[k].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-snug text-subtle">
        Tree on plane ({NODE_W}×{NODE_H} nodes).{" "}
        <b className="text-fg/80">Magnet</b> = spatial link: nearby smashables auto-scope
        to objectives (canvas proximity = data).
      </p>
    </div>
  );
}
