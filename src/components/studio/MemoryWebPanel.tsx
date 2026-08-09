import { useMemoryWeb } from "@/store/memory-web";
import { useStudio } from "@/store/studio";
import {
  Brain,
  Users,
  Flag,
  Download,
  RefreshCw,
  Plug,
  X,
  UserPlus,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

/**
 * Memory Web + Live Sockets inspector.
 * Group by selection, plane cluster, or faction — same underlying memory bus.
 */
export function MemoryWebPanel() {
  const show = useMemoryWeb((s) => s.showPanel);
  const web = useMemoryWeb((s) => s.web);
  const selected = useMemoryWeb((s) => s.selectedAgentIds);
  const sockets = useMemoryWeb((s) => s.sockets);
  const socketLog = useMemoryWeb((s) => s.socketLog);

  // Live socket poll while panel open (or always light poll from shell)
  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => useMemoryWeb.getState().pollSockets(), 800);
    return () => clearInterval(t);
  }, [show]);

  if (!show) return null;

  const npcs = web.agents.filter((a) => a.kind === "npc");
  const player = web.agents.find((a) => a.id === web.playerId);

  return (
    <div className="absolute right-2 top-14 z-30 flex w-[min(320px,calc(100vw-1rem))] flex-col gap-2">
      <div className="rounded-lg border border-border bg-bg-elevated/95 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
            <Brain size={14} className="text-violet-400" /> Memory Web
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted hover:bg-surface hover:text-fg"
            onClick={() => useMemoryWeb.getState().setShowPanel(false)}
          >
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-3 text-[11px]">
          <p className="leading-snug text-muted">
            General agent memory — single NPC, selection groups, plane clusters, or
            factions. Same event bus for any game type later.
          </p>

          {/* Factions */}
          <section>
            <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
              <Flag size={12} /> Factions
            </div>
            <div className="flex flex-wrap gap-1">
              {web.factions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="rounded border border-border px-1.5 py-0.5 text-[10px]"
                  style={{ borderColor: f.color, color: f.color }}
                  onClick={() =>
                    useMemoryWeb.getState().assignSelectionToFaction(f.id)
                  }
                  title="Assign selection to faction"
                >
                  {f.name} ({f.memberIds.length})
                </button>
              ))}
              <button
                type="button"
                className="rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted"
                onClick={() => {
                  const n = prompt("Faction name?", "New Faction");
                  if (n) useMemoryWeb.getState().makeFaction(n);
                }}
              >
                + Faction
              </button>
            </div>
          </section>

          {/* Agents */}
          <section>
            <div className="mb-1 flex items-center justify-between font-semibold text-fg">
              <span className="flex items-center gap-1">
                <Users size={12} /> Agents
              </span>
              <button
                type="button"
                className="text-[10px] text-accent"
                onClick={() => {
                  const cam = useStudio.getState().camera;
                  const x = (-cam.x + 400) / cam.zoom;
                  const y = (-cam.y + 300) / cam.zoom;
                  useMemoryWeb.getState().spawnNpcOnPlane(`NPC ${npcs.length + 1}`, x, y);
                }}
              >
                <UserPlus size={12} className="inline" /> spawn
              </button>
            </div>
            <ul className="space-y-0.5">
              {npcs.map((a) => {
                const on = selected.includes(a.id);
                const fac = web.factions.find((f) => f.id === a.factionId);
                const line = useMemoryWeb.getState().dialogueFor(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={(e) =>
                        useMemoryWeb.getState().selectAgent(a.id, e.shiftKey)
                      }
                      className={cn(
                        "flex w-full flex-col rounded px-1.5 py-1 text-left",
                        on ? "bg-accent/15 text-fg" : "hover:bg-surface text-muted",
                      )}
                    >
                      <span className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: a.color }}
                        />
                        <span className="font-medium text-fg">{a.name}</span>
                        {fac && (
                          <span className="text-[9px]" style={{ color: fac.color }}>
                            {fac.name}
                          </span>
                        )}
                      </span>
                      {line && (
                        <span className="mt-0.5 flex items-start gap-0.5 text-[9px] text-subtle">
                          <MessageCircle size={9} className="mt-0.5 shrink-0" /> {line}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-1 flex flex-wrap gap-1">
              <Mini
                onClick={() => useMemoryWeb.getState().groupSelection()}
                label="Group selection"
              />
              <Mini
                onClick={() =>
                  useMemoryWeb.getState().groupPlaneRect(
                    { x: 2380, y: 180, w: 160, h: 100 },
                    "Alley table",
                  )
                }
                label="Re-cluster alley plane"
              />
              <Mini
                onClick={() => useMemoryWeb.getState().clearSelection()}
                label="Clear sel"
              />
            </div>
          </section>

          {/* Groups */}
          <section>
            <div className="mb-1 font-semibold text-fg">Groups</div>
            {web.groups.length === 0 && (
              <div className="text-subtle">No groups yet</div>
            )}
            {web.groups.map((g) => (
              <div key={g.id} className="mb-1 rounded border border-border/60 px-1.5 py-1">
                <div style={{ color: g.color }} className="font-medium">
                  {g.name}
                </div>
                <div className="text-[9px] text-subtle">
                  {g.origin} · {g.memberIds.length} members · shared mem{" "}
                  {g.sharesMemory ? "on" : "off"}
                </div>
              </div>
            ))}
          </section>

          {/* Recent events */}
          <section>
            <div className="mb-1 font-semibold text-fg">Recent memories</div>
            <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[9px] text-muted">
              {web.events
                .slice(-12)
                .reverse()
                .map((e) => {
                  const who = web.agents.find((a) => a.id === e.ownerId)?.name ?? "?";
                  return (
                    <li key={e.id}>
                      <span className="text-fg/80">{who}</span> · {e.kind}: {e.summary}
                    </li>
                  );
                })}
            </ul>
          </section>

          <div className="flex gap-1">
            <Mini
              onClick={() => useMemoryWeb.getState().resetDemo()}
              label="Reset demo web"
            />
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-fg"
              onClick={() => {
                const j = useMemoryWeb.getState().exportJson();
                const blob = new Blob([j], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "memory_web.json";
                a.click();
              }}
            >
              <Download size={10} /> JSON
            </button>
          </div>

          {/* Live sockets */}
          <section className="border-t border-border pt-2">
            <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
              <Plug size={12} className="text-sky-400" /> Live asset sockets
            </div>
            <p className="mb-1 text-[9px] leading-snug text-subtle">
              Bind Studio boards to engine keys. When you paint, sockets hot-push
              new pixels (rev fingerprint).
            </p>
            <div className="mb-1 flex flex-wrap gap-1">
              <Mini
                onClick={() => useMemoryWeb.getState().rebuildSocketsFromWires()}
                label="From feed planes"
              />
              <Mini
                onClick={() =>
                  useMemoryWeb
                    .getState()
                    .bindActiveBoardToSocket(
                      `sprite.${useStudio.getState().artboards.find((b) => b.id === useStudio.getState().activeArtboardId)?.name?.replace(/\s+/g, "_") ?? "active"}`,
                    )
                }
                label="Bind active board"
              />
              <button
                type="button"
                className="inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:text-fg"
                onClick={() => useMemoryWeb.getState().pollSockets()}
              >
                <RefreshCw size={10} /> Poll
              </button>
            </div>
            <ul className="max-h-24 space-y-0.5 overflow-y-auto text-[9px]">
              {sockets.length === 0 && (
                <li className="text-subtle">No sockets — rebuild from wires or bind board</li>
              )}
              {sockets.map((s) => (
                <li key={s.id} className="flex justify-between gap-1 text-muted">
                  <span className="truncate text-fg/90">{s.engineKey}</span>
                  <span className="shrink-0 font-mono">r{s.rev}</span>
                </li>
              ))}
            </ul>
            {socketLog[0] && (
              <div className="mt-1 text-[9px] text-sky-300/90">{socketLog[0]}</div>
            )}
          </section>

          {player && (
            <div className="text-[9px] text-subtle">
              Player agent: {player.name} ({web.playerId.slice(0, 8)}…)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted hover:text-fg"
    >
      {label}
    </button>
  );
}
