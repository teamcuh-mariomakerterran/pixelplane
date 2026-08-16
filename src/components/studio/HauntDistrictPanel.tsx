import { useHauntDistrict } from "@/store/haunt-district";
import { Ghost, Moon, RefreshCw, Trash2, X } from "lucide-react";

export function HauntDistrictPanel() {
  const show = useHauntDistrict((s) => s.showPanel);
  const districts = useHauntDistrict((s) => s.districts);
  const activeId = useHauntDistrict((s) => s.activeId);
  const d = districts.find((x) => x.id === activeId) ?? districts[0];

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute bottom-16 left-2 z-30 w-[min(280px,calc(100vw-1rem))] rounded-lg border border-border bg-bg-elevated/95 shadow-xl backdrop-blur max-sm:left-2">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          <Ghost size={14} className="text-violet-300" /> Haunt District
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted hover:bg-surface hover:text-fg"
          onClick={() => useHauntDistrict.getState().setShowPanel(false)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto p-3 text-[11px]">
        <p className="leading-snug text-muted">
          The house wears its data. Sleep on the couch to save. Residues land here.
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-[10px] text-muted hover:text-fg"
            onClick={() => useHauntDistrict.getState().spawnDistrict()}
          >
            Spawn haunt
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-muted hover:text-fg"
            onClick={() => useHauntDistrict.getState().hydrateFromMemory()}
          >
            <RefreshCw size={10} /> Load memory
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-muted hover:text-fg"
            onClick={() => useHauntDistrict.getState().clearResidues()}
          >
            <Trash2 size={10} /> Clear
          </button>
        </div>
        {d ? (
          <>
            <div className="flex items-center gap-1 font-semibold text-fg">
              <Moon size={12} className="text-violet-300" />
              {d.lastSave ? `Kept ${new Date(d.lastSave).toLocaleTimeString()}` : "No sleep save yet"}
            </div>
            <ul className="space-y-0.5">
              {d.residues.length === 0 && (
                <li className="text-subtle">Enter Shithole House. Sit. Smash. Answer the phone.</li>
              )}
              {d.residues.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 text-[10px] text-muted">
                  <span className="truncate text-fg/90">{r.label}</span>
                  <span className="shrink-0 text-subtle">
                    {r.kind} · {r.roomName}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted">Spawn the haunt, then play an interior.</p>
        )}
      </div>
    </div>
  );
}
