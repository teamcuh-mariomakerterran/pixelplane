import { useStudio } from "@/store/studio";
import { currentStage } from "@/lib/destructibles/presets";
import { Bomb, Heart, Trash2 } from "lucide-react";

export function DestructiblesPanel() {
  const list = useStudio((s) => s.destructibles);
  const activeId = useStudio((s) => s.activeDestructibleId);
  const select = useStudio((s) => s.selectDestructible);
  const dmg = useStudio((s) => s.damageDestructible);
  const del = useStudio((s) => s.deleteDestructible);
  const place = useStudio((s) => s.placeDestructible);
  const cam = useStudio((s) => s.camera);

  if (list.length === 0) return null;
  const active = list.find((d) => d.id === activeId) ?? list[0]!;

  const stage = currentStage(active);
  const ratio = active.hp / Math.max(1, active.maxHp);

  return (
    <div className="absolute bottom-52 left-2 z-20 w-[min(280px,calc(100vw-1rem))] rounded-md border border-orange-500/40 bg-bg-elevated/95 p-2 shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-orange-400">
        <Bomb size={13} /> Destructibles
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {(["crate", "barrel", "pot", "sign"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="rounded border border-border px-1.5 py-0.5 text-[10px] capitalize text-muted hover:border-orange-400/50 hover:text-fg"
            onClick={() => {
              const wx = (-cam.x + 200) / cam.zoom;
              const wy = (-cam.y + 200) / cam.zoom;
              place(wx, wy, k);
            }}
          >
            + {k}
          </button>
        ))}
      </div>
      <div className="max-h-36 space-y-1 overflow-y-auto">
        {list.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => select(d.id)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[10px] ${
              d.id === active.id ? "bg-orange-500/15 text-fg" : "text-muted hover:bg-surface-2"
            }`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="font-mono text-subtle">
              {d.hp}/{d.maxHp}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2">
        <div className="text-xs font-medium text-fg">{active.name}</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-surface-2">
          <div
            className="h-full rounded bg-orange-400 transition-all"
            style={{ width: `${Math.max(0, ratio * 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
          <span>
            Stage: <b className="text-fg/80">{stage.label}</b>
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Heart size={10} /> {active.hp} HP
          </span>
        </div>
        <div className="mt-1.5 flex gap-1">
          <button
            type="button"
            className="flex-1 rounded border border-border py-1 text-[10px] text-muted hover:border-orange-400/50 hover:text-fg"
            onClick={() => dmg(active.id, Math.ceil(active.maxHp * 0.25))}
          >
            Hit −25%
          </button>
          <button
            type="button"
            className="flex-1 rounded border border-border py-1 text-[10px] text-muted hover:border-orange-400/50 hover:text-fg"
            onClick={() => dmg(active.id, active.hp)}
          >
            Smash
          </button>
          <button
            type="button"
            className="rounded border border-border p-1 text-muted hover:text-danger"
            onClick={() => del(active.id)}
          >
            <Trash2 size={12} />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-subtle">
          Drops: {active.drops.join(", ") || "—"} · wire plane → destructibles/ folder for stage art
        </p>
      </div>
    </div>
  );
}
