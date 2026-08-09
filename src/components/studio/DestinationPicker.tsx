import { useMemo, useState } from "react";
import {
  ChevronRight,
  FolderPlus,
  UserPlus,
  X,
  Link2,
} from "lucide-react";
import { useStudio } from "@/store/studio";
import {
  listFoldersFlat,
  PIXEL_SIZE_OPTIONS,
  WIRE_CATEGORY_META,
} from "@/lib/engine/templates";
import type { WireCategory, PixelSizePreset } from "@/lib/pixel/types";
import { cn } from "@/lib/utils";

export function DestinationPicker() {
  const pending = useStudio((s) => s.pendingWireDrop);
  const project = useStudio((s) => s.engineProject);
  const setPending = useStudio((s) => s.setPendingWireDrop);
  const assign = useStudio((s) => s.assignWireDestination);
  const addEntity = useStudio((s) => s.addEntityFolder);
  const addFolder = useStudio((s) => s.addAssetFolder);
  const setCategorySize = useStudio((s) => s.setCategoryPixelSize);

  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [size, setSize] = useState<PixelSizePreset>(48);

  const category: WireCategory = pending?.category ?? "characters";
  const meta = WIRE_CATEGORY_META[category];

  const flat = useMemo(() => {
    if (!project) return [];
    return listFoldersFlat(project.folders);
  }, [project]);

  // Prefer folders matching category; still show full tree
  const preferred = flat.filter((f) => f.folder.category === category);
  const categoryRoot = preferred.find((f) => !f.folder.isEntityRoot && f.depth <= 1)?.folder;

  if (!pending || !project) return null;

  const onWire = (folderId: string) => {
    assign({
      folderId,
      zoneId: pending.zoneId ?? undefined,
      draft: pending.draft,
      category,
    });
    setNewName("");
    setSelectedId(null);
  };

  const onCreateEntity = () => {
    if (!categoryRoot || !newName.trim()) return;
    const id = addEntity(categoryRoot.id, newName.trim(), category, size);
    if (id) onWire(id);
  };

  const onCreateSubfolder = () => {
    const parentId = selectedId ?? categoryRoot?.id;
    if (!parentId || !newName.trim()) return;
    const id = addFolder(parentId, newName.trim(), category);
    if (id) onWire(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-3 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-labelledby="dest-picker-title"
        className="flex max-h-[min(90dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-elevated shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[10px] font-bold text-bg"
                style={{ background: meta.color }}
              >
                <Link2 size={12} />
              </span>
              <h2 id="dest-picker-title" className="text-sm font-semibold text-fg">
                Wire destination
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {meta.label} feed plane → pick a folder or create one
            </p>
          </div>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-surface-2"
            onClick={() => setPending(null)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-border px-4 py-2">
          <label className="flex items-center justify-between gap-2 text-[11px] text-muted">
            <span>Default {meta.label.toLowerCase()} size</span>
            <select
              value={project.sizeDefaults[category] ?? size}
              onChange={(e) => {
                const n = Number(e.target.value) as PixelSizePreset;
                setSize(n);
                setCategorySize(category, n);
              }}
              className="rounded border border-border bg-surface px-2 py-1 text-xs text-fg"
            >
              {PIXEL_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}×{n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {flat.map(({ folder, depth }) => {
            const match = folder.category === category;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedId(folder.id)}
                onDoubleClick={() => onWire(folder.id)}
                className={cn(
                  "flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs transition",
                  selectedId === folder.id
                    ? "bg-accent/15 text-fg"
                    : match
                      ? "text-fg hover:bg-surface-2"
                      : "text-subtle hover:bg-surface",
                )}
                style={{ paddingLeft: 12 + depth * 12 }}
              >
                <ChevronRight
                  size={12}
                  className={cn(
                    "shrink-0 opacity-40",
                    folder.children.length ? "opacity-70" : "opacity-20",
                  )}
                />
                <span
                  className="h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: WIRE_CATEGORY_META[folder.category].color }}
                />
                <span className="flex-1 truncate font-medium">{folder.name}</span>
                {folder.pixelSize != null && (
                  <span className="font-mono text-[10px] text-subtle">{folder.pixelSize}px</span>
                )}
                {folder.isEntityRoot && (
                  <span className="rounded bg-surface-3 px-1 text-[9px] text-muted">entity</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2 border-t border-border px-4 py-3">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={
                category === "characters"
                  ? "New character name…"
                  : `New ${meta.label.toLowerCase()} name…`
              }
              className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value) as PixelSizePreset)}
              className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-xs text-fg"
              title="Pixel size for this entity"
            >
              {PIXEL_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!newName.trim() || !categoryRoot}
              onClick={onCreateEntity}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-40"
            >
              <UserPlus size={14} />
              Add {category === "characters" ? "character" : "entity"} + wire
            </button>
            <button
              type="button"
              disabled={!newName.trim()}
              onClick={onCreateSubfolder}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-xs text-fg hover:bg-surface-2 disabled:opacity-40"
            >
              <FolderPlus size={14} />
              Folder here
            </button>
          </div>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => selectedId && onWire(selectedId)}
            className="h-9 w-full rounded-[var(--radius-sm)] border border-accent/40 bg-accent/10 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-40"
          >
            Wire selected folder
          </button>
          <p className="text-center text-[10px] text-subtle">
            Double-click a folder to wire instantly · multiple planes can share one folder
          </p>
        </div>
      </div>
    </div>
  );
}
