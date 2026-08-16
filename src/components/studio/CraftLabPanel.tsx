/**
 * Craft Lab — boil / tile kit / sprite QA / proc VFX.
 */
import { useCraftLab } from "@/store/craft-lab";
import { Waves, LayoutGrid, ScanSearch, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { BOIL_PATTERNS, BOIL_PATTERN_META } from "@/lib/pixel/boil";
import { generateProcVfx, PROC_KINDS, PROC_KIND_META, PROC_DIRS, PROC_LAYER_IDS, PROC_BLENDS, defaultLayers } from "@/lib/pixel/proc-vfx";
import { bufferToImageData } from "@/lib/pixel/buffer";

export function CraftLabPanel() {
  const show = useCraftLab((s) => s.showPanel);
  const tab = useCraftLab((s) => s.tab);
  const boilOn = useCraftLab((s) => s.boilOn);
  const boil = useCraftLab((s) => s.boil);
  const boilAll = useCraftLab((s) => s.boilAll);
  const qa = useCraftLab((s) => s.qaReport);
  const qaOn = useCraftLab((s) => s.qaOn);
  const proc = useCraftLab((s) => s.proc);
  const procSmash = useCraftLab((s) => s.procSmash);
  const [open, setOpen] = useState(true);
  const previewRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (tab !== "proc") return;
    const c = previewRef.current;
    if (!c) return;
    const out = generateProcVfx(proc);
    c.width = out.sheetW;
    c.height = out.sheetH;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(bufferToImageData(out.sheet, out.sheetW, out.sheetH), 0, 0);
  }, [tab, proc]);

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 right-80 z-40 w-72 overflow-hidden rounded-lg border border-border/80 bg-bg-elevated/95 shadow-xl backdrop-blur max-sm:right-2 max-sm:left-2 max-sm:w-auto max-sm:bottom-16">
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
          <Waves size={12} /> Craft lab
        </div>
        <div className="flex items-center gap-1">
          {(["boil", "tiles", "qa", "proc"] as const).map((t) => (
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
                Live on the sprite you see — edges crawl, the whole figure
                breathes. Overlay only; nothing bakes unless you mutate a rail.
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={cn(
                    "rounded border px-2 py-1 font-semibold",
                    boilOn
                      ? "border-cyan/50 bg-cyan/15 text-fg shadow-[0_0_12px_rgba(62,207,207,0.35)]"
                      : "border-border text-muted hover:text-fg",
                  )}
                  onClick={() => useCraftLab.getState().setBoilOn(!boilOn)}
                >
                  {boilOn ? "Boil on · sizzle" : "Boil off"}
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
                {boil.intensity >= 8 ? " · 3px" : boil.intensity >= 5 ? " · 2px" : " · 1px"}
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
              <div className="grid grid-cols-3 gap-1">
                {BOIL_PATTERNS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    title={BOIL_PATTERN_META[p].hint}
                    className={cn(
                      "rounded border px-1 py-1",
                      boil.pattern === p
                        ? "border-accent/50 bg-accent/10 text-fg"
                        : "border-border text-muted hover:text-fg",
                    )}
                    onClick={() => useCraftLab.getState().setPattern(p)}
                  >
                    {BOIL_PATTERN_META[p].label}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-muted/80">
                {BOIL_PATTERN_META[boil.pattern].hint}
              </p>
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
          {tab === "proc" && (
            <div className="space-y-2 text-[10px]">
              <p className="text-muted">
                Procedural synth — radial fields, sparks, beam SDF, debris,
                scars, haze. Multiplies NeonPurr sheets. Does not replace them.
              </p>
              <div className="grid grid-cols-3 gap-1">
                {PROC_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    title={PROC_KIND_META[k].hint}
                    className={cn(
                      "rounded border px-1 py-1 font-semibold capitalize",
                      proc.kind === k
                        ? "border-accent/50 bg-accent/15 text-fg"
                        : "border-border text-muted hover:text-fg",
                    )}
                    onClick={() => useCraftLab.getState().setProcKind(k)}
                  >
                    {PROC_KIND_META[k].label}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded border border-border/70 bg-[#0a0c10] p-1">
                <canvas
                  ref={previewRef}
                  className="mx-auto block h-14 w-auto image-pixelated"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {PROC_DIRS.map((d) => (
                  <button
                    key={d.deg}
                    type="button"
                    className={cn(
                      "min-w-7 rounded border px-1 py-0.5 text-[9px] font-semibold",
                      proc.direction === d.deg
                        ? "border-cyan/50 bg-cyan/15 text-fg"
                        : "border-border text-muted hover:text-fg",
                    )}
                    onClick={() => useCraftLab.getState().patchProc({ direction: d.deg })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-muted">
                Spread {proc.spread}°
                <input
                  type="range"
                  min={15}
                  max={180}
                  value={proc.spread ?? 70}
                  onChange={(e) =>
                    useCraftLab.getState().patchProc({ spread: Number(e.target.value) })
                  }
                  className="h-1 flex-1 accent-cyan"
                />
              </label>
              <label className="flex items-center gap-2 text-muted">
                Hue
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(proc.hue * 100)}
                  onChange={(e) =>
                    useCraftLab.getState().patchProc({ hue: Number(e.target.value) / 100 })
                  }
                  className="h-1 flex-1 accent-cyan"
                />
              </label>
              <label className="flex items-center gap-2 text-muted">
                Intensity {proc.intensity}
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={proc.intensity}
                  onChange={(e) =>
                    useCraftLab.getState().patchProc({ intensity: Number(e.target.value) })
                  }
                  className="h-1 flex-1 accent-cyan"
                />
              </label>
              <div className="space-y-1 rounded border border-border/60 p-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-wide text-subtle">
                  Layers · kind · rate · blend
                </div>
                {PROC_LAYER_IDS.map((id) => {
                  const L = (proc.layers ?? defaultLayers())[id];
                  return (
                    <div key={id} className="grid grid-cols-[14px_52px_1fr_56px_44px] items-center gap-1">
                      <input
                        type="checkbox"
                        checked={L.on}
                        onChange={(e) =>
                          useCraftLab.getState().patchProcLayer(id, { on: e.target.checked })
                        }
                      />
                      <span className="capitalize text-muted">{id}</span>
                      <select
                        className="rounded border border-border bg-surface px-0.5 py-0.5 text-[9px] text-fg"
                        value={L.kind}
                        onChange={(e) =>
                          useCraftLab.getState().patchProcLayer(id, {
                            kind: e.target.value as typeof L.kind,
                          })
                        }
                      >
                        <option value="inherit">same</option>
                        {PROC_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <input
                        type="range"
                        min={25}
                        max={200}
                        value={Math.round(L.rate * 100)}
                        title={`rate ${L.rate.toFixed(2)}`}
                        onChange={(e) =>
                          useCraftLab.getState().patchProcLayer(id, {
                            rate: Number(e.target.value) / 100,
                          })
                        }
                        className="h-1 accent-cyan"
                      />
                      <select
                        className="rounded border border-border bg-surface px-0.5 py-0.5 text-[9px] text-fg"
                        value={L.blend}
                        onChange={(e) =>
                          useCraftLab.getState().patchProcLayer(id, {
                            blend: e.target.value as typeof L.blend,
                          })
                        }
                      >
                        {PROC_BLENDS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded border border-border px-2 py-1 text-muted hover:text-fg"
                  onClick={() => useCraftLab.getState().rerollProc()}
                >
                  Reroll seed
                </button>
                <button
                  type="button"
                  className="rounded border border-accent/50 bg-accent/15 px-2 py-1 font-semibold text-fg"
                  onClick={() => useCraftLab.getState().bakeProc()}
                >
                  Bake to plane
                </button>
              </div>
              <button
                type="button"
                className={cn(
                  "w-full rounded border px-2 py-1",
                  procSmash
                    ? "border-cyan/40 bg-cyan/10 text-fg"
                    : "border-border text-muted",
                )}
                onClick={() => useCraftLab.getState().setProcSmash(!procSmash)}
              >
                {procSmash ? "Smash plays proc burst" : "Smash uses stock FX only"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
