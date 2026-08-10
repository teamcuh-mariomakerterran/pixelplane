import { useKernels } from "@/store/kernels";
import { Package, ListChecks, X, Minimize2, Maximize2, Link2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inventory + Leads play kernels — skinnable mission toys. */
export function KernelOverlays() {
  const instances = useKernels((s) => s.instances);
  if (!instances.length) return null;
  return (
    <>
      {instances.map((k) =>
        k.kind === "inventory" ? (
          <InventoryKernel key={k.id} id={k.id} />
        ) : k.kind === "leads" ? (
          <LeadsKernel key={k.id} id={k.id} />
        ) : (
          <BrewKernel key={k.id} id={k.id} />
        ),
      )}
    </>
  );
}

function InventoryKernel({ id }: { id: string }) {
  const k = useKernels((s) => s.instances.find((x) => x.id === id));
  const toggle = useKernels((s) => s.toggleSlot);
  const remove = useKernels((s) => s.remove);
  const setMin = useKernels((s) => s.setMinimized);
  const bind = useKernels((s) => s.bindGearSheet);
  if (!k || !k.slots) return null;

  if (k.minimized) {
    return (
      <button
        type="button"
        onClick={() => setMin(id, false)}
        className="pointer-events-auto absolute right-3 top-28 z-40 flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-bg-elevated/95 px-2 py-1.5 text-[10px] text-cyan-300 shadow-lg"
      >
        <Package size={12} /> Inventory
        <Maximize2 size={10} />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-28 z-40 w-[220px] rounded-lg border border-cyan-500/35 bg-bg-elevated/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <Package size={12} className="text-cyan" />
        <span className="text-[11px] font-semibold text-fg">Inventory</span>
        <button
          type="button"
          title="Bind gear sheet from plane"
          className="ml-auto text-subtle hover:text-cyan"
          onClick={() => bind(id)}
        >
          <Link2 size={12} />
        </button>
        <button type="button" className="text-subtle hover:text-fg" onClick={() => setMin(id, true)}>
          <Minimize2 size={12} />
        </button>
        <button type="button" className="text-subtle hover:text-danger" onClick={() => remove(id)}>
          <X size={12} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1 p-2">
        {k.slots.map((sl) => (
          <button
            key={sl.id}
            type="button"
            onClick={() => toggle(id, sl.id)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded border px-1 py-1.5 text-[9px] transition",
              sl.filled
                ? "border-cyan-500/50 bg-cyan-500/10 text-fg"
                : "border-border/60 bg-surface/60 text-subtle",
            )}
          >
            <span
              className="h-6 w-6 rounded-sm border border-border-strong"
              style={{
                background: sl.filled
                  ? `linear-gradient(135deg, ${sl.color}, #111)`
                  : "transparent",
              }}
            />
            {sl.label}
          </button>
        ))}
      </div>
      <div className="border-t border-border px-2 py-1 text-[9px] text-subtle">
        Click slots · Link binds gear board
      </div>
    </div>
  );
}

function LeadsKernel({ id }: { id: string }) {
  const k = useKernels((s) => s.instances.find((x) => x.id === id));
  const toggle = useKernels((s) => s.toggleLead);
  const remove = useKernels((s) => s.remove);
  const setMin = useKernels((s) => s.setMinimized);
  if (!k || !k.leads) return null;

  if (k.minimized) {
    return (
      <button
        type="button"
        onClick={() => setMin(id, false)}
        className="pointer-events-auto absolute right-3 top-40 z-40 flex items-center gap-1.5 rounded-lg border border-fuchsia-500/40 bg-bg-elevated/95 px-2 py-1.5 text-[10px] text-fuchsia-300 shadow-lg"
      >
        <ListChecks size={12} /> Leads
        <Maximize2 size={10} />
      </button>
    );
  }

  const done = k.leads.filter((l) => l.done).length;

  return (
    <div className="pointer-events-auto absolute right-3 top-[22rem] z-40 w-[240px] rounded-lg border border-fuchsia-500/35 bg-[#0c0e16]/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <ListChecks size={12} className="text-fuchsia-400" />
        <span className="text-[11px] font-semibold tracking-wide text-cyan-300">
          ACTIVE LEADS
        </span>
        <span className="ml-auto font-mono text-[9px] text-subtle">
          {done}/{k.leads.length}
        </span>
        <button type="button" className="text-subtle hover:text-fg" onClick={() => setMin(id, true)}>
          <Minimize2 size={12} />
        </button>
        <button type="button" className="text-subtle hover:text-danger" onClick={() => remove(id)}>
          <X size={12} />
        </button>
      </div>
      <div className="space-y-1.5 p-2">
        {k.leads.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => toggle(id, l.id)}
            className="flex w-full items-start gap-2 rounded border border-border/50 bg-surface/40 px-2 py-1.5 text-left hover:border-fuchsia-500/40"
          >
            <span
              className={cn(
                "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[8px]",
                l.done
                  ? "border-lime-400 bg-lime-400/20 text-lime-300"
                  : "border-subtle text-transparent",
              )}
            >
              ✓
            </span>
            <span className="min-w-0">
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  l.done ? "text-muted line-through" : "text-cyan-300",
                )}
              >
                {l.title}
              </div>
              <div className="text-[9px] text-subtle">{l.detail}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}


function BrewKernel({ id }: { id: string }) {
  const k = useKernels((s) => s.instances.find((x) => x.id === id));
  const remove = useKernels((s) => s.remove);
  const setMin = useKernels((s) => s.setMinimized);
  const heat = useKernels((s) => s.heatBrew);
  const pour = useKernels((s) => s.pourBrew);
  if (!k || !k.brew) return null;

  if (k.minimized) {
    return (
      <button
        type="button"
        onClick={() => setMin(id, false)}
        className="pointer-events-auto absolute left-3 top-28 z-40 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-bg-elevated/95 px-2 py-1.5 text-[10px] text-amber-300 shadow-lg"
      >
        <FlaskConical size={12} /> Brew
        <Maximize2 size={10} />
      </button>
    );
  }

  const q = k.brew.quality;
  const qColor =
    q === "perfect"
      ? "text-lime-300"
      : q === "burned"
        ? "text-danger"
        : q === "raw"
          ? "text-subtle"
          : "text-cyan-300";

  return (
    <div className="pointer-events-auto absolute left-3 top-28 z-40 w-[240px] rounded-lg border border-amber-500/40 bg-[#100e18]/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <FlaskConical size={12} className="text-amber-300" />
        <span className="text-[11px] font-semibold text-fg">Brew kernel</span>
        <button type="button" className="ml-auto text-subtle hover:text-fg" onClick={() => setMin(id, true)}>
          <Minimize2 size={12} />
        </button>
        <button type="button" className="text-subtle hover:text-danger" onClick={() => remove(id)}>
          <X size={12} />
        </button>
      </div>
      <div className="space-y-2 p-2">
        <div className="text-[10px] text-muted">Recipe</div>
        <div className="rounded border border-border/60 bg-surface/50 px-2 py-1 text-[11px] font-semibold text-cyan-200">
          {k.brew.recipe}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted">Heat</span>
          <span className="font-mono text-fg">{k.brew.heat}°</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-pink-500 transition-all"
            style={{ width: `${k.brew.heat}%` }}
          />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="flex-1 rounded border border-border py-1 text-[10px] text-muted hover:border-cyan-500/50"
            onClick={() => heat(id, -8)}
          >
            Cool
          </button>
          <button
            type="button"
            className="flex-1 rounded border border-border py-1 text-[10px] text-muted hover:border-amber-500/50"
            onClick={() => heat(id, 10)}
          >
            Heat
          </button>
        </div>
        <button
          type="button"
          className="w-full rounded-md border border-amber-500/50 bg-amber-500/15 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25"
          onClick={() => pour(id)}
        >
          Pour
        </button>
        <div className={cn("text-center text-[10px] font-semibold uppercase", qColor)}>
          {q}
          {k.brew.lastDrink ? ` · ${k.brew.lastDrink}` : ""}
        </div>
        <div className="text-[9px] text-subtle">
          Sweet spot 55–72° · art on plane under Brew/Bar boards
        </div>
      </div>
    </div>
  );
}
