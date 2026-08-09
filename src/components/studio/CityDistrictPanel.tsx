import { useCityDistrict } from "@/store/city-district";
import { Grid3x3, Layers, Download, X, Building2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * City District — weighted tile mutation + footing collision (Brian/Gemini).
 */
export function CityDistrictPanel() {
  const show = useCityDistrict((s) => s.showPanel);
  const rules = useCityDistrict((s) => s.rules);
  const activeRuleId = useCityDistrict((s) => s.activeRuleId);
  const tiles = useCityDistrict((s) => s.tiles);
  const decals = useCityDistrict((s) => s.decals);
  const footings = useCityDistrict((s) => s.footings);
  const showFoot = useCityDistrict((s) => s.showFootingDebug);
  const showGrid = useCityDistrict((s) => s.showTileGrid);

  if (!show) return null;

  return (
    <div className="absolute bottom-16 left-14 z-30 w-[min(300px,calc(100vw-2rem))] rounded-lg border border-border bg-bg-elevated/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          <Grid3x3 size={14} className="text-emerald-400" /> City District
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted hover:bg-surface"
          onClick={() => useCityDistrict.getState().setShowPanel(false)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto p-3 text-[11px]">
        <p className="leading-snug text-muted">
          <strong className="text-fg/90">Your catch, early:</strong> weighted tile
          variants kill grid repetition; sub-tile footing stops invisible walls on
          awnings — walk under overhangs.
        </p>

        <section>
          <div className="mb-1 font-semibold text-fg">Auto-tile rules</div>
          <div className="flex flex-wrap gap-1">
            {rules.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => useCityDistrict.getState().setActiveRule(r.id)}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px]",
                  activeRuleId === r.id
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                    : "border-border text-muted",
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
          {rules
            .filter((r) => r.id === activeRuleId)
            .map((r) => (
              <ul key={r.id} className="mt-1 space-y-0.5 text-[9px] text-muted">
                {r.variants.map((v) => (
                  <li key={v.id} className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-sm"
                      style={{ background: v.color }}
                    />
                    {v.sprite}{" "}
                    <span className="text-subtle">
                      w={(v.weight * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          <div className="mt-1 flex flex-wrap gap-1">
            <Mini
              label="Paint demo strip"
              onClick={() => useCityDistrict.getState().paintDemoStrip()}
            />
            <Mini
              label="Clear"
              onClick={() => useCityDistrict.getState().clearTiles()}
              icon={<Trash2 size={10} />}
            />
          </div>
          <div className="mt-1 text-[9px] text-subtle">
            {tiles.length} tiles · {decals.length} decals (litter/skid/graffiti)
          </div>
        </section>

        <section>
          <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
            <Building2 size={12} /> Footing & overhangs
          </div>
          <p className="mb-1 text-[9px] text-subtle">
            Collision = bottom strip only. Top = overhang (sort above player when under).
          </p>
          <Mini
            label="Place demo footings"
            onClick={() => useCityDistrict.getState().placeDemoFootings()}
          />
          <label className="mt-1 flex items-center gap-1 text-[9px] text-muted">
            <input
              type="checkbox"
              checked={showFoot}
              onChange={(e) =>
                useCityDistrict.getState().setShowFootingDebug(e.target.checked)
              }
            />
            Debug footing (green) / overhang (amber)
          </label>
          <label className="flex items-center gap-1 text-[9px] text-muted">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) =>
                useCityDistrict.getState().setShowTileGrid(e.target.checked)
              }
            />
            Show painted tiles
          </label>
          <div className="mt-1 text-[9px] text-subtle">{footings.length} footing instances</div>
        </section>

        <Mini
          label="Export city district JSON"
          icon={<Download size={10} />}
          onClick={() => useCityDistrict.getState().exportSpec()}
        />
      </div>
    </div>
  );
}

function Mini({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted hover:text-fg"
    >
      {icon}
      {label}
    </button>
  );
}
