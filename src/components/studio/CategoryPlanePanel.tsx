/**
 * Category asset plane picker — load a wired edit plane per library kind.
 */
import { useCategoryPlanes } from "@/store/category-planes";
import { CATALOG } from "@/lib/packs/category-planes";
import { Library, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export function CategoryPlanePanel() {
  const show = useCategoryPlanes((s) => s.showPanel);
  const planes = useCategoryPlanes((s) => s.planes);
  const loading = useCategoryPlanes((s) => s.loading);
  const [open, setOpen] = useState(true);
  const counts = useMemo(() => useCategoryPlanes.getState().counts(), []);

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute top-14 right-3 z-40 w-72 overflow-hidden rounded-lg border border-border/80 bg-bg-elevated/95 shadow-xl backdrop-blur max-sm:left-2 max-sm:right-2 max-sm:top-auto max-sm:bottom-16 max-sm:w-auto">
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
          <Library size={12} /> Asset planes
        </div>
        <button
          type="button"
          title={open ? "Collapse" : "Expand"}
          className="rounded border border-border p-0.5 text-muted hover:text-fg"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>
      {open && (
        <div className="max-h-[40vh] overflow-y-auto p-1.5">
          <p className="mb-1.5 px-0.5 text-[10px] text-muted">
            Pick a category. Every matching sheet lands on a wired plane you can
            paint — vehicles, boxes, HUD, the lot.
          </p>
          <div className="grid grid-cols-2 gap-1">
            {CATALOG.map((c) => {
              const n = counts[c.id] ?? 0;
              const existing = planes.find((p) => p.kind === c.id);
              const busy = loading === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy || n === 0}
                  onClick={() => void useCategoryPlanes.getState().openKind(c.id)}
                  className={cn(
                    "rounded border px-2 py-1.5 text-left transition-transform duration-150 ease-out active:scale-[0.97]",
                    existing
                      ? "border-cyan/50 bg-cyan/10"
                      : "border-border/70 bg-surface/60 hover:border-border-strong",
                    n === 0 && "opacity-40",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[10px] font-semibold text-fg"
                      style={{ color: existing ? c.color : undefined }}
                    >
                      {c.name}
                    </span>
                    {busy ? (
                      <Loader2 size={10} className="animate-spin text-muted" />
                    ) : (
                      <span className="font-mono text-[9px] text-subtle">
                        {existing ? `${existing.boardIds.length}` : n}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[9px] text-muted">{c.hint}</div>
                  {existing && (
                    <div className="mt-0.5 text-[9px] text-cyan">On plane · jump</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
