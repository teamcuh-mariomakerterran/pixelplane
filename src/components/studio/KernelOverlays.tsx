import { useKernels } from "@/store/kernels";
import {
  Package,
  ListChecks,
  X,
  Minimize2,
  Maximize2,
  Link2,
  FlaskConical,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Inventory + Leads + Brew play kernels. */
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
  const quest = useKernels((s) => s.loadQuestTools);
  if (!k || !k.slots) return null;

  if (k.minimized) {
    return (
      <button
        type="button"
        onClick={() => setMin(id, false)}
        className="pointer-events-auto absolute right-3 top-28 z-40 flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-bg-elevated/95 px-2 py-1.5 text-[10px] text-cyan-300 shadow-lg"
      >
        <Package size={12} /> {k.name}
        <Maximize2 size={10} />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute right-3 top-28 z-40 w-[240px] rounded-lg border border-cyan-500/35 bg-bg-elevated/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <Package size={12} className="text-cyan" />
        <span className="text-[11px] font-semibold text-fg">{k.name}</span>
        <button
          type="button"
          title="Load 8 quest tools"
          className="ml-auto text-subtle hover:text-amber-300"
          onClick={() => quest(id)}
        >
          <Wrench size={12} />
        </button>
        <button
          type="button"
          title="Bind gear sheet labels"
          className="text-subtle hover:text-cyan"
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
            <span className="line-clamp-2 text-center leading-tight">{sl.label}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-border px-2 py-1 text-[9px] text-subtle">
        Wrench = quest tools · Link = gear labels
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
        className="pointer-events-auto absolute left-3 top-28 z-40 flex items-center gap-1.5 rounded-lg border border-pink-500/40 bg-bg-elevated/95 px-2 py-1.5 text-[10px] text-pink-300 shadow-lg"
      >
        <ListChecks size={12} /> Leads
        <Maximize2 size={10} />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute left-3 top-28 z-40 w-[240px] rounded-lg border border-pink-500/35 bg-bg-elevated/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <ListChecks size={12} className="text-pink-300" />
        <span className="text-[11px] font-semibold text-fg">Active leads</span>
        <button type="button" className="ml-auto text-subtle hover:text-fg" onClick={() => setMin(id, true)}>
          <Minimize2 size={12} />
        </button>
        <button type="button" className="text-subtle hover:text-danger" onClick={() => remove(id)}>
          <X size={12} />
        </button>
      </div>
      <ul className="max-h-[280px] space-y-1 overflow-y-auto p-2">
        {k.leads.map((lead) => (
          <li key={lead.id}>
            <button
              type="button"
              onClick={() => toggle(id, lead.id)}
              className={cn(
                "w-full rounded border px-2 py-1.5 text-left transition",
                lead.done
                  ? "border-border/50 bg-surface/40 text-subtle line-through"
                  : "border-pink-500/30 bg-pink-500/5 text-fg",
              )}
            >
              <div className="text-[11px] font-medium">{lead.title}</div>
              <div className="text-[9px] text-muted">{lead.detail}</div>
            </button>
          </li>
        ))}
      </ul>
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
    <div className="pointer-events-auto absolute left-3 top-28 z-40 w-[240px] overflow-hidden rounded-lg border border-amber-500/40 bg-[#100e18]/95 shadow-2xl backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "url(/packs/goodies/drinks/brewing_station_full.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative">
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
          <div className="rounded border border-border/60 bg-surface/70 px-2 py-1 text-[11px] font-semibold text-cyan-200">
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
          <div className="text-[9px] text-subtle">Sweet spot 55–72° · Herbs / Roe / Salt</div>
        </div>
      </div>
    </div>
  );
}
