/**
 * Craft Lab — boil / tile kit / sprite QA.
 */
import { useCraftLab } from "@/store/craft-lab";
import { Waves, LayoutGrid, ScanSearch, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function CraftLabPanel() {
  const show = useCraftLab((s) => s.showPanel);
  const tab = useCraftLab((s) => s.tab);
  const boilOn = useCraftLab((s) => s.boilOn);
  const boil = useCraftLab((s) => s.boil);
  const boilAll = useCraftLab((s) => s.boilAll);
  const qa = useCraftLab((s) => s.qaReport);
  const qaOn = useCraftLab((s) => s.qaOn);
  const [open, setOpen] = useState(true);

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 right-80 z-40 w-72 overflow-hidden rounded-lg border border-border/80 bg-bg-elevated/95 shadow-xl backdrop-blur max-sm:right-2 max-sm:left-2 max-sm:w-auto max-sm:bottom-16">
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
          <Waves size={12} /> Craft lab
        </div>
        <div className="flex items-center gap-1">
          {(["boil", "tiles", "qa"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "rounded border px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                tab === t
                  ? "border-accent/50 bg-accent/15 text-fg"
                  : "border-border text-muted hover:text-fg",
              )}
              onClick={() => useCraftLab.getState().setTab(t)}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            className="rounded border border-border p-0.5 text-muted hover:text-fg"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="max-h-[36vh] overflow-y-auto p-2">
          {tab === "boil" && (
            <div className="space-y-2 text-[10px]">
              <p className="text-muted">
                Live 1px life on edges. Highlights stay locked. Nothing bakes unless you
                mutate a rail.
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={cn(
                    "rounded border px-2 py-1 font-semibold",
                    boilOn
                      ? "border-accent/50 bg-accent/15 text-fg"
                      : "border-border text-muted hover:text-fg",
                  )}
                  onClick={() => useCraftLab.getState().setBoilOn(!boilOn)}
                >
                  {boilOn ? "Boil on" : "Boil off"}
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded border px-2 py-1",
                    boilAll
                      ? "border-cyan/40 bg-cyan/10 text-fg"
                      : "border-border text-muted hover:text-fg",
                  )}
                  onClick={() => useCraftLab.getState().setBoilAll(!boilAll)}
                >
                  {boilAll ? "All boards" : "Active only"}
                </button>
              </div>
              <label className="block text-muted">
                Intensity {boil.intensity}
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={boil.intensity}
                  onChange={(e) =>
                    useCraftLab.getState().patchBoil({
                      intensity: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-1 w-full accent-[var(--color-accent)]"
                />
              </label>
              <div className="flex gap-1">
                {(["wobble", "noise", "ripple"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={cn(
                      "flex-1 rounded border px-1 py-1 capitalize",
                      boil.pattern === p
                        ? "border-accent/50 bg-accent/10 text-fg"
                        : "border-border text-muted hover:text-fg",
                    )}
                    onClick={() => useCraftLab.getState().setPattern(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-muted">
                <input
                  type="checkbox"
                  checked={boil.lockBright}
                  onChange={(e) =>
                    useCraftLab.getState().patchBoil({ lockBright: e.target.checked })
                  }
                />
                Lock bright pixels (eyes / blades)
              </label>
              <label className="flex items-center gap-2 text-muted">
                <input
                  type="checkbox"
                  checked={boil.edgeOnly}
                  onChange={(e) =>
                    useCraftLab.getState().patchBoil({ edgeOnly: e.target.checked })
                  }
                />
                Edges only
              </label>
            </div>
          )}
          {tab === "tiles" && (
            <div className="space-y-2 text-[10px]">
              <p className="text-muted">
                One tile becomes 8 turns/mirrors, 4 worn, 4 edges, 4 corners — parked
                beside the source on a wired kit plane.
              </p>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 rounded border border-accent/40 bg-accent/15 px-2 py-1.5 font-semibold text-fg"
                onClick={() => useCraftLab.getState().spawnTileKit()}
              >
                <LayoutGrid size={12} /> Grow tile kit
              </button>
            </div>
          )}
          {tab === "qa" && (
            <div className="space-y-2 text-[10px]">
              <p className="text-muted">
                Orphans, alpha bleed, stray singles, off-palette specks. Overlay stays
                on the board.
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1 rounded border border-accent/40 bg-accent/15 px-2 py-1.5 font-semibold text-fg"
                  onClick={() => useCraftLab.getState().runQa()}
                >
                  <ScanSearch size={12} /> Run QA
                </button>
                {qa && (
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-1 text-muted hover:text-fg"
                    onClick={() => useCraftLab.getState().clearQa()}
                  >
                    Clear
                  </button>
                )}
              </div>
              {qa && (
                <div className="rounded border border-border/70 bg-surface/60 px-2 py-1.5">
                  <div className="font-semibold text-fg">
                    {qa.name} · {qa.score}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-2 text-muted">
                    <span>Orphans {qa.counts.orphan}</span>
                    <span>Bleed {qa.counts.bleed}</span>
                    <span>Stray {qa.counts.stray}</span>
                    <span>Off-palette {qa.counts.palette}</span>
                  </div>
                  <div className="mt-1 text-[9px] text-subtle">
                    Overlay {qaOn ? "on" : "off"} · red orphan · orange bleed · amber
                    stray · violet palette
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
