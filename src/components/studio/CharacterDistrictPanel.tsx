import { useCharacterDistrict } from "@/store/character-district";
import { useStudio } from "@/store/studio";
import {
  Clapperboard,
  Download,
  RefreshCw,
  X,
  Box,
  Layers,
  Flame,
  Volume2,
  Wind,
  Activity,
} from "lucide-react";
import { COLLISION_COLORS } from "@/lib/character-district/types";
import { cn } from "@/lib/utils";

/**
 * Character District inspector — full Gemini anim pipeline wave.
 */
export function CharacterDistrictPanel() {
  const show = useCharacterDistrict((s) => s.showPanel);
  const districts = useCharacterDistrict((s) => s.districts);
  const activeId = useCharacterDistrict((s) => s.activeId);
  const collisionTool = useCharacterDistrict((s) => s.collisionTool);
  const bakeMode = useCharacterDistrict((s) => s.bakeMode);
  const onion = useCharacterDistrict((s) => s.showOnionGhosts);
  const gravityOn = useCharacterDistrict((s) => s.showGravityRings);
  const radius = useCharacterDistrict((s) => s.gravityRadius);
  const pulse = useCharacterDistrict((s) => s.runtimePulse);
  const d = districts.find((x) => x.id === activeId) ?? districts[0];
  const activeAnimId = useStudio((s) => s.activeAnimId);
  const activeBoardId = useStudio((s) => s.activeArtboardId);

  if (!show) return null;

  return (
    <div className="absolute bottom-16 right-2 z-30 w-[min(300px,calc(100vw-1rem))] rounded-lg border border-border bg-bg-elevated/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
          <Clapperboard size={14} className="text-amber-400" /> Character District
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted hover:bg-surface hover:text-fg"
          onClick={() => useCharacterDistrict.getState().setShowPanel(false)}
        >
          <X size={14} />
        </button>
      </div>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto p-3 text-[11px]">
        <p className="leading-snug text-muted">
          State pads · hitboxes · gravity · bake ·{" "}
          <strong className="text-fg/90">audio · springs · live pulse</strong>
        </p>
        <div className="flex flex-wrap gap-1">
          <Btn
            onClick={() => useCharacterDistrict.getState().spawnDistrict()}
            label="Spawn district"
          />
          <Btn
            onClick={() => useCharacterDistrict.getState().rebindStates()}
            label="Rebind"
            icon={<RefreshCw size={10} />}
          />
          <Btn
            onClick={() => useCharacterDistrict.getState().exportActiveMachine()}
            label="SM JSON"
            icon={<Download size={10} />}
          />
        </div>

        {/* Live pulse */}
        <section className="rounded border border-violet-500/30 bg-violet-500/10 p-1.5">
          <div className="mb-0.5 flex items-center gap-1 font-semibold text-violet-200">
            <Activity size={12} /> Ghost pulse
          </div>
          {pulse ? (
            <div className="text-[10px] text-violet-100">
              Engine state:{" "}
              <span className="font-semibold uppercase">{pulse.state}</span>
              <span className="text-violet-300/80"> · {pulse.source}</span>
            </div>
          ) : (
            <div className="text-[9px] text-violet-200/70">
              Enter City Engine — active state pad glows on the plane
            </div>
          )}
        </section>

        {d ? (
          <>
            <div className="font-semibold text-fg">{d.name}</div>

            {/* Audio */}
            <section className="rounded border border-border/60 p-1.5">
              <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
                <Volume2 size={12} /> Frame audio anchors
              </div>
              <Btn
                label="Drop SFX on current frame"
                onClick={() => useCharacterDistrict.getState().addAudioOnActiveFrame()}
              />
              <ul className="mt-1 max-h-16 space-y-0.5 overflow-y-auto text-[9px] text-muted">
                {(d.audioAnchors ?? []).length === 0 && (
                  <li className="text-subtle">No SFX yet — select anim + drop</li>
                )}
                {(d.audioAnchors ?? []).map((a) => (
                  <li key={a.id} className="flex justify-between gap-1">
                    <span>
                      f{a.frameIndex} · {a.name}
                    </span>
                    <button
                      type="button"
                      className="text-red-400/80"
                      onClick={() => useCharacterDistrict.getState().removeAudio(a.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Springs */}
            <section className="rounded border border-border/60 p-1.5">
              <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
                <Wind size={12} /> Secondary springs
              </div>
              <Btn
                label="Add spring (hair/cape)"
                onClick={() => useCharacterDistrict.getState().addSpring()}
              />
              <ul className="mt-1 space-y-1">
                {(d.springs ?? []).map((sp) => (
                  <li
                    key={sp.id}
                    className="rounded border border-border/50 px-1.5 py-1 text-[9px]"
                  >
                    <div className="font-medium text-fg">{sp.name}</div>
                    <div className="flex items-center gap-1 text-muted">
                      k
                      <input
                        type="range"
                        min={40}
                        max={280}
                        value={sp.stiffness}
                        onChange={(e) =>
                          useCharacterDistrict.getState().updateSpring(sp.id, {
                            stiffness: Number(e.target.value),
                          })
                        }
                        className="w-16"
                      />
                      d
                      <input
                        type="range"
                        min={10}
                        max={95}
                        value={Math.round(sp.damping * 100)}
                        onChange={(e) =>
                          useCharacterDistrict.getState().updateSpring(sp.id, {
                            damping: Number(e.target.value) / 100,
                          })
                        }
                        className="w-14"
                      />
                    </div>
                    <div className="mt-0.5 flex gap-1">
                      <button
                        type="button"
                        className="text-accent"
                        onClick={() =>
                          useCharacterDistrict.getState().simSpringPreview(sp.id)
                        }
                      >
                        Sim preview
                      </button>
                      <button
                        type="button"
                        className="text-red-400/80"
                        onClick={() =>
                          useCharacterDistrict.getState().removeSpring(sp.id)
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Hitboxes */}
            <section className="rounded border border-border/60 p-1.5">
              <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
                <Box size={12} /> Hitboxes
              </div>
              <div className="flex flex-wrap gap-1">
                {(["hurt", "hit", "push"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="rounded border px-1.5 py-0.5 text-[10px] capitalize"
                    style={{
                      borderColor: COLLISION_COLORS[k],
                      color: COLLISION_COLORS[k],
                      background:
                        collisionTool === k ? `${COLLISION_COLORS[k]}22` : "transparent",
                    }}
                    onClick={() =>
                      useCharacterDistrict
                        .getState()
                        .setCollisionTool(collisionTool === k ? null : k)
                    }
                  >
                    {k}
                  </button>
                ))}
              </div>
              <label className="mt-1 flex items-center gap-1 text-[9px] text-muted">
                <input
                  type="checkbox"
                  checked={onion}
                  onChange={(e) =>
                    useCharacterDistrict.getState().setShowOnionGhosts(e.target.checked)
                  }
                />
                Onion ghosts
              </label>
              {activeAnimId && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <Btn
                    label="Apply all frames"
                    onClick={() =>
                      useCharacterDistrict
                        .getState()
                        .applyHitboxesToAllFrames(
                          activeAnimId,
                          collisionTool ?? undefined,
                        )
                    }
                  />
                  <Btn
                    label="→ next frame"
                    onClick={() => {
                      const a = useStudio
                        .getState()
                        .animRegions.find((x) => x.id === activeAnimId);
                      if (a)
                        useCharacterDistrict
                          .getState()
                          .propagateHitboxNext(a.id, a.currentFrame ?? 0);
                    }}
                  />
                </div>
              )}
            </section>

            {/* Gravity */}
            <section className="rounded border border-border/60 p-1.5">
              <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
                <Flame size={12} className="text-amber-400" /> DNA gravity
              </div>
              <label className="flex items-center gap-1 text-[9px] text-muted">
                <input
                  type="checkbox"
                  checked={gravityOn}
                  onChange={(e) =>
                    useCharacterDistrict.getState().setShowGravityRings(e.target.checked)
                  }
                />
                Rings + tethers
              </label>
              <div className="mt-1 flex items-center gap-1 text-[9px] text-muted">
                R
                <input
                  type="range"
                  min={40}
                  max={280}
                  value={radius}
                  onChange={(e) =>
                    useCharacterDistrict
                      .getState()
                      .setGravityRadius(Number(e.target.value))
                  }
                  className="flex-1"
                />
                {radius}
              </div>
              <Btn
                label={
                  activeBoardId ? "Set chassis" : "Select board → chassis"
                }
                onClick={() => {
                  if (!activeBoardId) {
                    useStudio.getState().setStatus("Select an artboard first");
                    return;
                  }
                  useCharacterDistrict.getState().setChassis(activeBoardId);
                }}
              />
            </section>

            {/* Bake */}
            <section className="rounded border border-border/60 p-1.5">
              <div className="mb-1 flex items-center gap-1 font-semibold text-fg">
                <Layers size={12} /> Export bake
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px]",
                    bakeMode === "layered"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted",
                  )}
                  onClick={() => useCharacterDistrict.getState().setBakeMode("layered")}
                >
                  Layered
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px]",
                    bakeMode === "baked"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted",
                  )}
                  onClick={() => useCharacterDistrict.getState().setBakeMode("baked")}
                >
                  Baked atlas
                </button>
              </div>
              <Btn
                label="Export compose pack"
                icon={<Download size={10} />}
                onClick={() => useCharacterDistrict.getState().exportComposePack()}
              />
            </section>

            <section>
              <div className="mb-1 font-semibold text-fg">State pads</div>
              <ul className="max-h-24 space-y-0.5 overflow-y-auto">
                {d.statePads.map((p) => {
                  const hot = pulse?.state === p.state;
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        "rounded border px-1.5 py-0.5",
                        hot
                          ? "border-violet-400 bg-violet-500/20"
                          : "border-border/70",
                      )}
                      style={{ borderLeftColor: p.color, borderLeftWidth: 3 }}
                    >
                      <span className="font-medium capitalize text-fg">{p.state}</span>
                      {hot && (
                        <span className="ml-1 text-[9px] text-violet-300">● LIVE</span>
                      )}
                      <span className="text-[9px] text-subtle">
                        {" "}
                        · {p.animIds.length || "empty"}
                      </span>
                      {activeAnimId && (
                        <button
                          type="button"
                          className="ml-1 text-[9px] text-accent"
                          onClick={() =>
                            useCharacterDistrict
                              .getState()
                              .manualBindAnim(p.id, activeAnimId)
                          }
                        >
                          bind
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        ) : (
          <p className="text-muted">Spawn a district to begin.</p>
        )}
      </div>
    </div>
  );
}

function Btn({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
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
