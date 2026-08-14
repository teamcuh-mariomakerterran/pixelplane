/**
 * Shader Lab inspector — presets, node mix, engine CRT grade.
 */
import { useShaderGraph } from "@/store/shader-graph";
import { NODE_META, PRESET_ORDER, SHADER_PRESETS } from "@/lib/shaders/graph";
import { useStudio } from "@/store/studio";
import { Aperture, Pause, Play, Plus, Trash2, MonitorPlay, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ShaderGraphPanel() {
  const graphs = useShaderGraph((s) => s.graphs);
  const activeId = useShaderGraph((s) => s.activeId);
  const activeNodeId = useShaderGraph((s) => s.activeNodeId);
  const show = useShaderGraph((s) => s.showOnPlane);
  const enginePost = useShaderGraph((s) => s.enginePost);
  const g = graphs.find((x) => x.id === activeId) ?? graphs[0] ?? null;
  const node = g?.nodes.find((n) => n.id === activeNodeId) ?? null;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const st = useShaderGraph.getState();
    if (st.graphs.length === 0) st.seedLab(false);
    else st.migrateAll();
  }, []);

  if (!show) return null;
  if (!g) return null;

  return (
    <div className="pointer-events-auto absolute bottom-14 left-3 z-40 w-72 overflow-hidden rounded-lg border border-border/80 bg-bg-elevated/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">
          <Aperture size={12} /> Shader lab
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title={open ? "Collapse inspector" : "Expand inspector"}
            className="rounded border border-border p-0.5 text-muted hover:text-fg"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          <button
            type="button"
            title={enginePost ? "City Engine CRT on" : "Grade City Engine with this look"}
            className={cn(
              "rounded border p-0.5",
              enginePost
                ? "border-cyan/50 bg-cyan/15 text-cyan"
                : "border-border text-muted hover:text-fg",
            )}
            onClick={() => useShaderGraph.getState().setEnginePost(!enginePost)}
          >
            <MonitorPlay size={12} />
          </button>
          <button
            type="button"
            title={g.playing ? "Pause preview" : "Play preview"}
            className="rounded border border-border p-0.5 text-muted hover:text-fg"
            onClick={() => useShaderGraph.getState().setPlaying(g.id, !g.playing)}
          >
            {g.playing ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            type="button"
            title="Seed / reset lab"
            className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:text-fg"
            onClick={() => useShaderGraph.getState().seedLab(true)}
          >
            <Plus size={10} className="inline" /> Seed
          </button>
          <button
            type="button"
            title="Remove lab"
            className="rounded border border-border p-0.5 text-muted hover:text-danger"
            onClick={() => {
              useShaderGraph.getState().removeGraph(g.id);
              useStudio.getState().setStatus("Shader lab removed");
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {open && (
      <div className="max-h-[36vh] overflow-y-auto p-1.5">
        <div className="mb-1.5 grid grid-cols-3 gap-1">
          {PRESET_ORDER.map((id) => {
            const p = SHADER_PRESETS[id];
            const on = g.preset === id;
            return (
              <button
                key={id}
                type="button"
                title={p.hint}
                onClick={() => useShaderGraph.getState().applyPreset(g.id, id)}
                className={cn(
                  "rounded border px-1 py-1 text-[9px] font-semibold transition-transform duration-150 ease-out active:scale-[0.96]",
                  on
                    ? "border-accent/60 bg-accent/15 text-fg"
                    : "border-border/70 bg-surface/60 text-muted hover:text-fg",
                )}
                style={on ? { color: p.color } : undefined}
              >
                {p.name}
              </button>
            );
          })}
        </div>
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <button
            type="button"
            className="rounded border border-border/70 px-1.5 py-0.5 text-[9px] text-muted hover:text-fg"
            onClick={() => {
              useShaderGraph.getState().cycleSource(g.id);
              const next = g.source === "nearest" ? "card" : "nearest";
              useStudio
                .getState()
                .setStatus(next === "nearest" ? "Shader source · nearest board" : "Shader source · CRT card");
            }}
          >
            Src · {g.source === "nearest" ? "board" : "CRT card"}
          </button>
          <span className="text-[9px] text-subtle">{g.name.replace(" · Shader Lab", "")}</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {g.nodes.map((n) => {
            const meta = NODE_META[n.kind];
            const on = n.enabled;
            const active = n.id === activeNodeId;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  useShaderGraph.getState().select(g.id, n.id);
                  if (n.kind !== "input_tex" && n.kind !== "input_time" && n.kind !== "output") {
                    useShaderGraph.getState().toggleNode(g.id, n.id);
                  }
                }}
                className={cn(
                  "rounded border px-1.5 py-1 text-left text-[10px] transition-transform duration-150 ease-out active:scale-[0.96]",
                  active ? "border-accent/60 bg-accent/10" : "border-border/70 bg-surface/60",
                  !on && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-[9px] text-subtle">{on ? "on" : "off"}</span>
                </div>
                <div className="text-[9px] text-muted">{meta.hint}</div>
              </button>
            );
          })}
        </div>
        {node && node.kind !== "input_tex" && node.kind !== "input_time" && node.kind !== "output" && (
          <div className="mt-2 rounded border border-border/60 bg-surface/50 px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="text-muted">Amount · {NODE_META[node.kind].label}</span>
              <span className="font-mono text-fg">{Math.round(node.amount * 100)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(node.amount * 100)}
              onChange={(e) =>
                useShaderGraph
                  .getState()
                  .setAmount(g.id, node.id, Number(e.target.value) / 100)
              }
              className="w-full accent-cyan"
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
}
