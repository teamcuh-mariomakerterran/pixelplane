import {
  User,
  Clapperboard,
  Map,
  Box,
  Gem,
  Sparkles,
  Layout,
  Gauge,
  Frame,
  Film,
  StickyNote,
  Folder,
  Cable,
  ChevronLeft,
  ChevronRight,
  Layers,
  Bomb,
  GitBranch,
  Zap,
} from "lucide-react";
import { useStudio } from "@/store/studio";
import { WIRE_CATEGORY_META } from "@/lib/engine/templates";
import type { WireCategory } from "@/lib/pixel/types";
import { TRIGGER_KINDS, TRIGGER_META, type WireTriggerKind } from "@/lib/wires/triggers";
import { cn } from "@/lib/utils";

const CONNECTORS: { id: WireCategory; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "characters", Icon: User },
  { id: "animations", Icon: Clapperboard },
  { id: "environments", Icon: Map },
  { id: "parallax", Icon: Layers },
  { id: "objects", Icon: Box },
  { id: "destructibles", Icon: Bomb },
  { id: "items", Icon: Gem },
  { id: "effects", Icon: Sparkles },
  { id: "particles", Icon: Sparkles },
  { id: "ui", Icon: Layout },
  { id: "hud", Icon: Gauge },
  { id: "chrome", Icon: Frame },
  { id: "scenes", Icon: Film },
  { id: "quests", Icon: GitBranch },
  { id: "notes", Icon: StickyNote },
  { id: "custom", Icon: Folder },
];

/**
 * Drag-ready connector icons. Select a connector, then draw a feed plane
 * on the canvas (or click an existing zone) to open the destination picker.
 * Quests → places a quest builder tree. Destructibles → HP stage props.
 */
export function WirePalette() {
  const open = useStudio((s) => s.showWirePalette);
  const setOpen = useStudio((s) => s.setShowWirePalette);
  const active = useStudio((s) => s.activeConnector);
  const setActive = useStudio((s) => s.setActiveConnector);
  const project = useStudio((s) => s.engineProject);
  const beginWire = useStudio((s) => s.beginWireConnect);
  const activeZone = useStudio((s) => s.activeWireZoneId);
  const zones = useStudio((s) => s.wireZones);
  const zone = zones.find((z) => z.id === activeZone) ?? null;
  const setShowEngine = useStudio((s) => s.setShowEngineConnect);
  const activeParallax = useStudio((s) => s.activeParallaxId);
  const wireParallax = useStudio((s) => s.wireParallaxStack);
  const findParallaxFolder = () => {
    const p = useStudio.getState().engineProject;
    if (!p) return null;
    const walk = (nodes: typeof p.folders): (typeof p.folders)[0] | null => {
      for (const n of nodes) {
        if (n.category === "parallax" && !n.isEntityRoot) return n;
        const hit = walk(n.children);
        if (hit) return hit;
      }
      return null;
    };
    return walk(p.folders);
  };

  if (!open) {
    return (
      <button
        type="button"
        title="Show wire connectors"
        onClick={() => setOpen(true)}
        className="absolute bottom-10 left-2 z-30 flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-bg-elevated/95 px-2.5 text-[11px] font-medium text-muted shadow-lg backdrop-blur hover:text-fg"
      >
        <Cable size={14} className="text-accent" />
        Wires
        <ChevronRight size={12} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-10 left-2 z-30 flex max-w-[min(100%,360px)] flex-col gap-1.5 rounded-[var(--radius-md)] border border-border bg-bg-elevated/95 p-2 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fg">
          <Cable size={13} className="text-accent" />
          Wire connectors
        </div>
        <button
          type="button"
          className="rounded p-0.5 text-muted hover:text-fg"
          onClick={() => setOpen(false)}
          title="Collapse"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="grid grid-cols-8 gap-1 sm:grid-cols-8">
        {CONNECTORS.map(({ id, Icon }) => {
          const m = WIRE_CATEGORY_META[id];
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              title={m.label}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-pixelplane-wire", id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => {
                if (isActive) {
                  setActive(null);
                  return;
                }
                setActive(id);
                if (id === "parallax" && activeParallax) {
                  const folder = findParallaxFolder();
                  if (folder) wireParallax(activeParallax, folder.id, folder.path);
                }
              }}
              className={cn(
                "flex h-9 w-9 flex-col items-center justify-center rounded-md border transition",
                isActive
                  ? "border-transparent text-bg shadow"
                  : "border-border/70 text-muted hover:border-border hover:bg-surface-2 hover:text-fg",
              )}
              style={
                isActive
                  ? { background: m.color, borderColor: m.color }
                  : undefined
              }
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>

      <p className="px-0.5 text-[10px] leading-snug text-subtle">
        {active ? (
          <>
            <span className="font-semibold text-fg">{WIRE_CATEGORY_META[active].label}</span>
            {active === "quests" && " — draw a plane to drop a quest tree"}
            {active === "destructibles" && " — draw a plane to place breakable props"}
            {active !== "quests" && active !== "destructibles" && " — draw a feed plane on the canvas"}
          </>
        ) : (
          <>
            Pick a connector → draw a feed plane.{" "}
            <span className="text-amber-400/90">Quests</span> = builder tree ·{" "}
            <span className="text-orange-400/90">Destructibles</span> = HP stages
          </>
        )}
      </p>

      {!project && (
        <button
          type="button"
          onClick={() => setShowEngine(true)}
          className="rounded border border-dashed border-border px-2 py-1 text-[10px] text-muted hover:border-accent/40 hover:text-fg"
        >
          Name a play project to finish wiring…
        </button>
      )}

      {project && active && activeZone && (
        <button
          type="button"
          onClick={() =>
            beginWire({
              zoneId: activeZone,
              category: active,
              screenX: window.innerWidth / 2,
              screenY: window.innerHeight / 2,
            })
          }
          className="rounded bg-accent/15 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/25"
        >
          Wire active plane → {WIRE_CATEGORY_META[active].label} folder
        </button>
      )}

      <div className="mt-0.5 border-t border-border/60 pt-1.5">
        <div className="mb-1 flex items-center gap-1 px-0.5 text-[10px] font-semibold text-fg">
          <Zap size={11} className="text-accent" />
          Triggers
          {zone?.trigger?.kind && zone.trigger.kind !== "none" && (
            <span className="font-normal text-muted">
              · {TRIGGER_META[zone.trigger.kind as WireTriggerKind].short}
              {zone.trigger.armed ? " armed" : " off"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {TRIGGER_KINDS.map((k) => {
            const m = TRIGGER_META[k];
            const on = zone?.trigger?.kind === k;
            return (
              <button
                key={k}
                type="button"
                title={m.hint}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[9px] font-semibold",
                  on
                    ? "border-transparent text-bg"
                    : "border-border/70 text-muted hover:text-fg",
                )}
                style={on ? { background: m.color, borderColor: m.color } : undefined}
                onClick={() => {
                  if (!zone) {
                    useStudio.getState().setStatus("Select a feed plane, then arm a trigger");
                    return;
                  }
                  const next = on ? "none" : k;
                  useStudio.getState().setZoneTrigger(zone.id, next, true);
                }}
              >
                {m.short}
              </button>
            );
          })}
          {zone && zone.trigger?.kind && zone.trigger.kind !== "none" && (
            <button
              type="button"
              className="rounded border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-fg"
              onClick={() => useStudio.getState().fireZoneTrigger(zone.id)}
            >
              Fire
            </button>
          )}
        </div>
        <p className="mt-1 px-0.5 text-[9px] leading-snug text-subtle">
          Arm a plane → click the badge or press T. Valve (dot) opens / closes the flow.
        </p>
      </div>
    </div>
  );
}
