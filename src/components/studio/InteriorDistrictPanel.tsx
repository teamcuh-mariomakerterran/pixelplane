import { useInteriorDistrict } from "@/store/interior-district";
import { useAssetVault } from "@/store/asset-vault";
import { Building2, Download, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function InteriorDistrictPanel() {
  const show = useInteriorDistrict((s) => s.showPanel);
  const districts = useInteriorDistrict((s) => s.districts);
  const activeId = useInteriorDistrict((s) => s.activeId);
  const d = districts.find((x) => x.id === activeId) ?? districts[0];
  const assets = useAssetVault((s) => s.assets);
  const enterable = assets.filter((a) => a.enterable);

  if (!show) return null;

  return (
    <div className="pointer-events-auto absolute bottom-16 right-2 z-30 w-[min(300px,calc(100vw-1rem))] rounded-lg border border-border bg-bg-elevated/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          <Building2 size={14} className="text-cyan" /> Interior District
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted hover:bg-surface hover:text-fg"
          onClick={() => useInteriorDistrict.getState().setShowPanel(false)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto p-3 text-[11px]">
        <p className="leading-snug text-muted">
          Room pads <strong className="text-fg/90">are</strong> the rooms. Circulation tethers are doors and stairs.
        </p>
        <div className="flex flex-wrap gap-1">
          <Btn onClick={() => useInteriorDistrict.getState().spawnDistrict()} label="Spawn district" />
          <Btn
            onClick={() => useInteriorDistrict.getState().pullFromVault()}
            label="Pull vault"
            icon={<RefreshCw size={10} />}
          />
          <Btn
            onClick={() => useInteriorDistrict.getState().pushToVault()}
            label="Push plan"
            icon={<Download size={10} />}
          />
        </div>
        {enterable.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {enterable.slice(0, 6).map((a) => (
              <button
                key={a.id}
                type="button"
                className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:text-fg"
                onClick={() => {
                  useAssetVault.getState().select(a.id);
                  const st = useInteriorDistrict.getState();
                  if (!st.districts.length) st.spawnDistrict();
                  st.pullFromVault(a.id);
                }}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}
        {d ? (
          <>
            <div className="font-semibold text-fg">{d.name}</div>
            <div className="text-[9px] text-subtle">
              {d.roomPads.length} rooms · {d.links.length} links · {d.lightPads.length} lights
            </div>
            <ul className="space-y-1">
              {d.roomPads.map((p) => (
                <li key={p.id} className="rounded border border-border/60 p-1">
                  <input
                    className="w-full bg-transparent text-[11px] font-semibold text-fg"
                    value={p.name}
                    onChange={(e) => useInteriorDistrict.getState().renamePad(p.id, e.target.value)}
                  />
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <Chip
                      on={p.dark}
                      label="dark"
                      onClick={() => useInteriorDistrict.getState().togglePadDark(p.id)}
                    />
                    <Chip
                      on={p.locked}
                      label="lock"
                      onClick={() => useInteriorDistrict.getState().togglePadLock(p.id)}
                    />
                    <Chip
                      on={p.window}
                      label="window"
                      onClick={() => useInteriorDistrict.getState().togglePadWindow(p.id)}
                    />
                    <span className="text-[9px] text-subtle">F{p.floor}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted">Spawn a district, then pull Shithole House onto the plane.</p>
        )}
      </div>
    </div>
  );
}

function Btn({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-muted hover:text-fg"
    >
      {icon}
      {label}
    </button>
  );
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded border px-1 py-0.5 text-[9px]",
        on ? "border-cyan/40 bg-cyan/10 text-fg" : "border-border text-muted",
      )}
    >
      {label}
    </button>
  );
}
