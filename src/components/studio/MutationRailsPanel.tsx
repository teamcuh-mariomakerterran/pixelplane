/**
 * Mutation Rails inspector — live parent→child variants + mix.
 */
import { useSignature } from "@/store/signature";
import { useStudio } from "@/store/studio";
import { RAILS, CORE_RAIL_IDS } from "@/lib/pixel/mutation-rails";
import { GitBranch, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function MutationRailsPanel() {
  const links = useSignature((s) => s.links);
  const show = useSignature((s) => s.showRailsPanel);
  const activeLinkId = useSignature((s) => s.activeLinkId);
  const activeBoardId = useStudio((s) => s.activeArtboardId);
  const artboards = useStudio((s) => s.artboards);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    useSignature.getState().pruneDead();
  }, []);

  const parentId = (() => {
    if (!activeBoardId) return null;
    const asChild = links.find((l) => l.childId === activeBoardId);
    return asChild?.parentId ?? activeBoardId;
  })();
  const family = parentId
    ? links.filter((l) => l.parentId === parentId)
    : [];
  const parent = artboards.find((b) => b.id === parentId) ?? null;

  if (!show && family.length === 0 && links.length === 0) return null;
  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 left-3 z-40 w-72 overflow-hidden rounded-lg border border-border/80 bg-bg-elevated/95 shadow-xl backdrop-blur sm:left-[19.5rem]">
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
          <GitBranch size={12} /> Mutation rails
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={open ? "Collapse" : "Expand"}
            className="rounded border border-border p-0.5 text-muted hover:text-fg"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          <button
            type="button"
            title="Spawn core 4 (or rebake)"
            className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:text-fg"
            onClick={() => useSignature.getState().spawnMutationRails()}
          >
            Core 4
          </button>
          <button
            type="button"
            title="Full kit — outline, crush, scale, bloom"
            className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:text-fg"
            onClick={() => useSignature.getState().spawnMutationRails({ full: true })}
          >
            Full
          </button>
        </div>
      </div>
      {open && (
        <div className="max-h-[38vh] overflow-y-auto p-1.5">
          <div className="mb-1.5 px-0.5 text-[10px] text-muted">
            {parent ? (
              <>
                Base <span className="font-semibold text-fg">{parent.name}</span>
                {" · "}
                paint it — live rails follow
              </>
            ) : (
              "Select a board, then spawn rails. Variants stay linked to the base."
            )}
          </div>
          <div className="mb-1.5 grid grid-cols-4 gap-1">
            {RAILS.map((r) => {
              const on = family.some((l) => l.railId === r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  title={r.hint}
                  onClick={() => useSignature.getState().addRailToActive(r.id)}
                  className={cn(
                    "rounded border px-1 py-1 text-[9px] font-semibold transition-transform duration-150 ease-out active:scale-[0.96]",
                    on
                      ? "border-accent/60 bg-accent/15 text-fg"
                      : "border-border/70 bg-surface/60 text-muted hover:text-fg",
                  )}
                  style={on ? { color: r.color } : undefined}
                >
                  {r.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
          {family.length === 0 && (
            <p className="px-1 py-2 text-[10px] text-muted">
              No rails yet. Core 4 = neon / dusk / silhouette / chrome. Full adds ink,
              8-bit crush, 2× scale, neon bloom.
            </p>
          )}
          {family.map((link) => {
            const rail = RAILS.find((r) => r.id === link.railId);
            const active = link.id === activeLinkId;
            const child = artboards.find((b) => b.id === link.childId);
            return (
              <div
                key={link.id}
                className={cn(
                  "mb-1 rounded border px-2 py-1.5 text-[10px]",
                  active
                    ? "border-accent/50 bg-accent/10"
                    : "border-border/70 bg-surface/60",
                  !link.live && "opacity-55",
                )}
                onClick={() => {
                  useSignature.getState().selectLink(link.id);
                  if (child) useStudio.getState().selectArtboard(child.id);
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold" style={{ color: rail?.color }}>
                    {link.name}
                  </span>
                  <span className="text-[9px] text-subtle">{rail?.tag}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(link.amount * 100)}
                    onChange={(e) =>
                      useSignature
                        .getState()
                        .setLinkAmount(link.id, Number(e.target.value) / 100)
                    }
                    className="h-1 flex-1 accent-[var(--color-accent)]"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="w-8 text-right font-mono text-[9px] text-muted">
                    {Math.round(link.amount * 100)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded border border-border px-1 py-0.5 text-[9px] text-muted hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      useSignature.getState().setLinkLive(link.id, !link.live);
                    }}
                  >
                    {link.live ? "Live" : "Frozen"}
                  </button>
                  <button
                    type="button"
                    title="Rebake from base"
                    className="rounded border border-border p-0.5 text-muted hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      useSignature.getState().rebakeLink(link.id);
                    }}
                  >
                    <RefreshCw size={10} />
                  </button>
                  <button
                    type="button"
                    title="Unlink (keep board)"
                    className="rounded border border-border p-0.5 text-muted hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      useSignature.getState().unlink(link.id, false);
                    }}
                  >
                    <Unlink size={10} />
                  </button>
                  <button
                    type="button"
                    title="Unlink and delete variant"
                    className="rounded border border-border p-0.5 text-muted hover:text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      useSignature.getState().unlink(link.id, true);
                    }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-center gap-1 rounded border border-border/70 px-2 py-1 text-[9px] text-muted hover:text-fg"
            onClick={() => useSignature.getState().bakeNeonBloomOnActive()}
          >
            <Plus size={10} /> Bake neon bloom rail
          </button>
          <p className="mt-1 px-0.5 text-[9px] text-subtle">
            {(CORE_RAIL_IDS as readonly string[]).join(" · ")} stay live. Edit the base.
          </p>
        </div>
      )}
    </div>
  );
}
