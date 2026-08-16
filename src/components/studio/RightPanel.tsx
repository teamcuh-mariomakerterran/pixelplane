// @ts-nocheck
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Layers,
  Clapperboard,
  Sparkles,
  Play,
  Pause,
  Plus,
  Download,
  ChevronDown,
  Cable,
  Link2,
  Scissors,
  Keyboard,
} from "lucide-react";
import { useStudio } from "@/store/studio";
import { useHotkeys } from "@/store/hotkeys";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { bufferToImageData } from "@/lib/pixel/buffer";
import { listFoldersFlat, WIRE_CATEGORY_META } from "@/lib/engine/templates";
import { saveSnapshot, pickSnapshot, clearSnapshot } from "@/lib/pixel/persist";
import { formatChord } from "@/lib/hotkeys/defaults";
import { ANIM_LIBRARY_PRESETS } from "@/lib/anim-lab/doctrine";
import { scopeForZone, formatScopeSummary } from "@/lib/spatial/scope";
import { getParticleStats } from "@/lib/pixel/particles-draw";
import { resolveSpatialOwner } from "@/lib/spatial/priority";
import { centerOf } from "@/lib/spatial/scope";
import { useSpatialNav } from "@/store/spatial-nav";

export function RightPanel() {
  const artboards = useStudio((s) => s.artboards);
  const activeArtboardId = useStudio((s) => s.activeArtboardId);
  const animRegions = useStudio((s) => s.animRegions);
  const activeAnimId = useStudio((s) => s.activeAnimId);
  const particles = useStudio((s) => s.particles);
  const activeParticleId = useStudio((s) => s.activeParticleId);
  const selection = useStudio((s) => s.selection);
  const hoverPixel = useStudio((s) => s.hoverPixel);
  const wireZones = useStudio((s) => s.wireZones);
  const activeWireZoneId = useStudio((s) => s.activeWireZoneId);
  const engine = useStudio((s) => s.engineProject);
  const parallaxStacks = useStudio((s) => s.parallaxStacks);
  const activeParallaxId = useStudio((s) => s.activeParallaxId);

  const board = artboards.find((b) => b.id === activeArtboardId) ?? null;
  const anim = animRegions.find((a) => a.id === activeAnimId) ?? null;
  const particle = particles.find((p) => p.id === activeParticleId) ?? null;
  const wire = wireZones.find((z) => z.id === activeWireZoneId) ?? null;
  const artboardsAll = artboards;
  const animsAll = animRegions;
  const particlesAll = particles;
  const destsAll = useStudio((s) => s.destructibles);
  const questsAll = useStudio((s) => s.questTrees);
  const spatial = wire
    ? scopeForZone(
        {
          artboards: artboardsAll,
          animRegions: animsAll,
          particles: particlesAll,
          destructibles: destsAll,
          questTrees: questsAll,
        },
        wire,
        { pad: 0 },
      )
    : null;
  const parallax = parallaxStacks.find((p) => p.id === activeParallaxId) ?? null;

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-l border-border bg-bg-elevated md:w-[300px]">
      <div className="border-b border-border px-3 py-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-subtle">
          Inspector
        </div>
        <div className="mt-0.5 truncate text-sm font-medium text-fg">
          {parallax?.name ?? wire?.name ?? anim?.name ?? particle?.name ?? board?.name ?? "Workspace"}
        </div>
        <div className="font-mono text-[10px] text-muted">
          {hoverPixel
            ? `X ${Math.floor(hoverPixel.worldX)}  Y ${Math.floor(hoverPixel.worldY)}`
            : "—"}
          {selection ? `  ·  sel ${selection.w}×${selection.h}` : ""}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Project" icon={<Download size={12} />}>
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            <button
              type="button"
              className="rounded-[var(--radius-sm)] bg-accent px-2 py-1 text-[10px] font-semibold text-accent-fg"
              onClick={() => {
                void saveSnapshot(pickSnapshot(useStudio.getState())).then(() =>
                  useStudio.getState().setStatus("Saved to browser storage"),
                );
              }}
            >
              Save now
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-[10px] text-muted hover:text-fg"
              onClick={() => {
                void clearSnapshot().then(() =>
                  useStudio.getState().setStatus("Autosave cleared"),
                );
              }}
            >
              Clear save
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-sm)] border border-rose-500/50 bg-rose-500/15 px-2 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/25"
              onClick={() => {
                void useStudio.getState().hardResetDemo();
              }}
              title="Wipe browser save and rebuild factory demo plane"
            >
              Factory reset
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-sm)] border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-200 hover:bg-sky-500/20"
              onClick={() => {
                void (async () => {
                  try {
                    const { clearPlaneBlitCaches } = await import(
                      "@/components/studio/CanvasWorkspace"
                    );
                    clearPlaneBlitCaches();
                  } catch {
                    /* */
                  }
                  const r = await useStudio.getState().rehydrateStarterArt();
                  useStudio.getState().focusDemoHome();
                  try {
                    const { clearPlaneBlitCaches } = await import(
                      "@/components/studio/CanvasWorkspace"
                    );
                    clearPlaneBlitCaches();
                  } catch {
                    /* */
                  }
                  void saveSnapshot(pickSnapshot(useStudio.getState()));
                  useStudio.getState().setStatus(
                    `Art reloaded · ${r.fixed}/${r.total} boards refreshed`,
                  );
                })();
              }}
              title="Force re-download starter-pack pixels into boards (fixes MISSING PIXELS)"
            >
              Reload art
            </button>
          </div>
          <p className="px-3 pb-2 text-[10px] text-subtle">
            Autosaves in this browser · Ctrl/Cmd+S. Empty Neon Alley / parallax? Hit{" "}
            <span className="text-sky-200/90">Reload art</span> or{" "}
            <span className="text-rose-200/90">Factory reset</span>.
          </p>
        </Section>

        <Section title="Camera locations" icon={<Keyboard size={12} />}>
          <HotkeyLocations />
        </Section>

        <Section title="Play folders" icon={<Cable size={12} />}>
          {!engine && (
            <div className="px-3 py-2">
              <p className="text-xs text-muted">No play project yet.</p>
              <button
                type="button"
                className="mt-2 w-full rounded-[var(--radius-sm)] bg-accent py-1.5 text-[11px] font-semibold text-accent-fg"
                onClick={() => useStudio.getState().setShowEngineConnect(true)}
              >
                Name this project…
              </button>
            </div>
          )}
          {engine && (
            <>
              <div className="px-3 pb-1 text-[10px] text-subtle">
                {engine.name} · {engine.engine} · {engine.rootFolderName}/
              </div>
              <div className="max-h-40 overflow-y-auto border-b border-border pb-2">
                {listFoldersFlat(engine.folders).map(({ folder, depth }) => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-1 truncate px-3 py-0.5 text-[10px] text-muted"
                    style={{ paddingLeft: 12 + depth * 10 }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-sm"
                      style={{ background: WIRE_CATEGORY_META[folder.category].color }}
                    />
                    <span className={cn("truncate", folder.isEntityRoot && "font-medium text-fg")}>
                      {folder.name}
                    </span>
                    {folder.pixelSize != null && (
                      <span className="ml-auto font-mono text-subtle">{folder.pixelSize}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1 px-3 py-2">
                <button
                  type="button"
                  className="flex-1 rounded-[var(--radius-sm)] border border-border bg-surface py-1.5 text-[11px] text-fg hover:bg-surface-2"
                  onClick={() => useStudio.getState().setShowEngineConnect(true)}
                >
                  Reconfigure
                </button>
              </div>
            </>
          )}
        </Section>

        {/* Feed planes */}
        <Section title="Feed planes" icon={<Link2 size={12} />}>
          {wireZones.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">
              Draw a feed plane (W) or drop a wire connector onto the canvas
            </p>
          )}
          {wireZones.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => useStudio.getState().selectWireZone(z.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
                z.id === activeWireZoneId
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: z.color }} />
              <span className="flex-1 truncate">{z.name}</span>
              <span className="max-w-[90px] truncate font-mono text-[9px] text-subtle">
                {z.folderPath ? z.folderPath.split("/").slice(-2).join("/") : "—"}
              </span>
            </button>
          ))}
          {wire && (
            <div className="space-y-2 border-t border-border px-3 py-3">
              <input
                value={wire.name}
                onChange={(e) => useStudio.getState().renameWireZone(wire.id, e.target.value)}
                className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-fg"
              />
              <p className="font-mono text-[10px] text-muted">
                {wire.folderPath ?? "Not wired yet"}
              </p>
              {spatial && (
                <div className="rounded border border-accent/25 bg-accent/5 px-2 py-1.5 text-[10px] leading-snug text-muted">
                  <div className="font-semibold text-accent/90">Spatial scope</div>
                  <div className="text-fg/80">{formatScopeSummary(spatial)}</div>
                  <div className="mt-0.5 text-subtle">
                    Nested priority: smallest pad owns · manual pin beats auto (Gemini
                    D_Scope). Soft pad {useSpatialNav.getState().softPad}px for family
                    clusters.
                  </div>
                  {spatial.artboards.length > 0 && (
                    <ul className="mt-1 max-h-16 overflow-y-auto text-[9px] text-subtle">
                      {spatial.artboards.slice(0, 8).map((b) => {
                        const { cx, cy } = centerOf({
                          x: b.x,
                          y: b.y,
                          width: b.width,
                          height: b.height,
                        });
                        const own = resolveSpatialOwner(wireZones, cx, cy);
                        const dual = own.overlapping.length > 1;
                        return (
                          <li key={b.id}>
                            · {b.name}
                            {own.owner?.id === wire.id ? " ✓" : ""}
                            {dual ? " ⇄ multi" : ""}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              <div className="space-y-1 rounded border border-border/70 bg-surface/50 px-2 py-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted">
                  Trigger
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["boil", "tile_kit", "qa", "mutate", "bloom"] as const).map((k) => {
                    const on = wire.trigger?.kind === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                          on
                            ? "border-accent/50 bg-accent/15 text-fg"
                            : "border-border text-muted hover:text-fg",
                        )}
                        onClick={() =>
                          useStudio
                            .getState()
                            .setZoneTrigger(wire.id, on ? "none" : k, true)
                        }
                      >
                        {k.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
                {wire.trigger?.kind && wire.trigger.kind !== "none" && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="flex-1 rounded border border-accent/40 bg-accent/15 py-1 text-[10px] font-semibold text-fg"
                      onClick={() => useStudio.getState().fireZoneTrigger(wire.id)}
                    >
                      Fire T
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-1 text-[10px] text-muted hover:text-fg"
                      onClick={() =>
                        useStudio
                          .getState()
                          .armZoneTrigger(wire.id, !wire.trigger?.armed)
                      }
                    >
                      {wire.trigger.armed ? "Valve open" : "Valve shut"}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="flex-1 rounded border border-border bg-surface py-1.5 text-[11px] text-fg hover:bg-surface-2"
                  onClick={() =>
                    useStudio.getState().beginWireConnect({
                      zoneId: wire.id,
                      category: wire.category,
                      screenX: window.innerWidth / 2,
                      screenY: window.innerHeight / 2,
                    })
                  }
                >
                  Re-wire…
                </button>
                <MiniBtn
                  title="Delete plane"
                  onClick={() => useStudio.getState().deleteWireZone(wire.id)}
                >
                  <Trash2 size={12} />
                </MiniBtn>
              </div>
            </div>
          )}
        </Section>

        <Section title="Artboards" icon={<Layers size={12} />}>
          {artboards.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">No artboards yet</p>
          )}
          {artboards.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => useStudio.getState().selectArtboard(b.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition",
                b.id === activeArtboardId
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  b.kind === "scene" ? "bg-success" : b.kind === "hud" ? "bg-cyan" : b.kind === "variant" ? "bg-accent" : "bg-accent",
                )}
              />
              <span className="flex-1 truncate">{b.name}</span>
              <span className="font-mono text-[10px] text-subtle">
                {b.width}×{b.height}
              </span>
            </button>
          ))}
        </Section>

        {board && (
          <Section title="Sheet slicer" icon={<Scissors size={12} />}>
            <SheetSlicer boardId={board.id} boardW={board.width} boardH={board.height} />
          </Section>
        )}

        {board && (
          <Section title="Layers" icon={<Layers size={12} />}>
            <div className="flex items-center gap-1 px-3 pb-2">
              <MiniBtn title="Add layer" onClick={() => useStudio.getState().addLayer(board.id)}>
                <Plus size={12} />
              </MiniBtn>
              <MiniBtn
                title="Duplicate artboard (Ctrl+D)"
                onClick={() => useStudio.getState().duplicateArtboard(board.id)}
              >
                <Copy size={12} />
              </MiniBtn>
              <MiniBtn
                title="Duplicate layer"
                onClick={() => useStudio.getState().duplicateLayer(board.activeLayerId, board.id)}
              >
                <Copy size={12} className="opacity-70" />
              </MiniBtn>
              <MiniBtn
                title="Delete layer"
                onClick={() => useStudio.getState().deleteLayer(board.activeLayerId, board.id)}
              >
                <Trash2 size={12} />
              </MiniBtn>
              <MiniBtn
                title="Merge visible"
                onClick={() => useStudio.getState().mergeVisible(board.id)}
              >
                <ChevronDown size={12} />
              </MiniBtn>
              <MiniBtn
                title="Delete artboard"
                onClick={() => useStudio.getState().deleteArtboard(board.id)}
              >
                <Trash2 size={12} className="text-danger" />
              </MiniBtn>
            </div>
            {[...board.layers].reverse().map((layer) => (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs",
                  layer.id === board.activeLayerId ? "bg-surface-2" : "hover:bg-surface",
                )}
              >
                <button
                  type="button"
                  onClick={() => useStudio.getState().toggleLayerVisible(layer.id, board.id)}
                  className="text-muted hover:text-fg"
                >
                  {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => useStudio.getState().toggleLayerLocked(layer.id, board.id)}
                  className="text-muted hover:text-fg"
                >
                  {layer.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => useStudio.getState().selectLayer(layer.id, board.id)}
                  className="flex-1 truncate text-left text-fg"
                >
                  {layer.name}
                </button>
              </div>
            ))}
            {board.layers.find((l) => l.id === board.activeLayerId) && (
              <div className="px-3 py-2">
                <label className="text-[10px] text-subtle">Opacity</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(
                    (board.layers.find((l) => l.id === board.activeLayerId)?.opacity ?? 1) * 100,
                  )}
                  onChange={(e) =>
                    useStudio
                      .getState()
                      .setLayerOpacity(board.activeLayerId, Number(e.target.value) / 100, board.id)
                  }
                  className="mt-1 w-full"
                />
              </div>
            )}
            <div className="flex gap-1 px-3 pb-3">
              <button
                type="button"
                className="flex-1 rounded-[var(--radius-sm)] border border-border bg-surface py-1.5 text-[11px] text-fg hover:bg-surface-2"
                onClick={() => useStudio.getState().copySelection()}
              >
                Copy sel
              </button>
              <button
                type="button"
                className="flex-1 rounded-[var(--radius-sm)] border border-border bg-surface py-1.5 text-[11px] text-fg hover:bg-surface-2"
                onClick={() => useStudio.getState().cutSelection()}
              >
                Cut sel
              </button>
              <button
                type="button"
                className="flex-1 rounded-[var(--radius-sm)] border border-border bg-surface py-1.5 text-[11px] text-fg hover:bg-surface-2"
                onClick={() => {
                  if (selection)
                    useStudio.getState().pasteClipboard(board.id, selection.x, selection.y);
                  else useStudio.getState().pasteClipboard(board.id, 0, 0);
                }}
              >
                Paste
              </button>
            </div>
          </Section>
        )}

        <Section title="Animations" icon={<Clapperboard size={12} />}>
          {animRegions.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">Drag an animation square on the plane</p>
          )}
          {animRegions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => useStudio.getState().selectAnim(a.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
                a.id === activeAnimId
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Clapperboard size={12} className="text-accent" />
              <span className="flex-1 truncate">{a.name}</span>
              <span className="font-mono text-[10px] text-subtle">
                {a.frames.length}f · {a.fps}fps
              </span>
            </button>
          ))}

          <div className="border-t border-border px-3 py-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-subtle">
              Cycle presets
            </div>
            <div className="flex flex-wrap gap-1">
              {ANIM_LIBRARY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={`${p.name}: ~${p.frames} frames @ ${p.fps}fps`}
                  onClick={() =>
                    useStudio.getState().setStatus(
                      `Anim preset “${p.name}” · target ${p.frames}f @ ${p.fps}fps · flip-test last→first before export`,
                    )
                  }
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted hover:border-accent/40 hover:text-fg"
                >
                  {p.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-subtle">
              Doctrine: loop last→first, continuous limbs, video-first for walk/run. Use sheet
              slicer + Anim Lab audit.
            </p>
          </div>

          {anim && (
            <div className="space-y-2 border-t border-border px-3 py-3">
              <div className="flex items-center gap-1">
                <MiniBtn
                  title={anim.playing ? "Pause" : "Play"}
                  onClick={() => useStudio.getState().toggleAnimPlay(anim.id)}
                >
                  {anim.playing ? <Pause size={12} /> : <Play size={12} />}
                </MiniBtn>
                <MiniBtn
                  title="Add empty frame"
                  onClick={() => useStudio.getState().addAnimFrame(anim.id, false)}
                >
                  <Plus size={12} />
                </MiniBtn>
                <MiniBtn
                  title="Add frame from selection"
                  onClick={() => useStudio.getState().addAnimFrame(anim.id, true)}
                >
                  <Copy size={12} />
                </MiniBtn>
                <MiniBtn
                  title="Export sheet"
                  onClick={() => useStudio.getState().exportAnimSheet(anim.id)}
                >
                  <Download size={12} />
                </MiniBtn>
                <MiniBtn
                  title="Delete animation"
                  onClick={() => useStudio.getState().deleteAnim(anim.id)}
                >
                  <Trash2 size={12} />
                </MiniBtn>
              </div>
              <label className="block text-[10px] text-subtle">
                FPS
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={anim.fps}
                  onChange={(e) =>
                    useStudio.getState().setAnimFps(anim.id, Number(e.target.value))
                  }
                  className="mt-1 w-full"
                />
                <span className="font-mono text-muted">{anim.fps}</span>
              </label>
              <FrameStrip animId={anim.id} />

              <div className="rounded-[var(--radius-sm)] border border-accent/25 bg-accent/5 p-2">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Animation Beast
                </div>
                <p className="mb-2 text-[10px] leading-snug text-subtle">
                  Offline knowledge — secondary motion, silhouette cosmetics, self-audit. Original
                  strip is kept; results spawn beside it.
                </p>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["tail", "Tail"],
                      ["ear", "Ear"],
                      ["cloak", "Cloak"],
                      ["hair", "Hair"],
                      ["cape", "Cape"],
                    ] as const
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:border-accent hover:text-fg"
                      onClick={() => useStudio.getState().applySecondaryMotion(anim.id, kind)}
                    >
                      + {label}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:border-accent hover:text-fg"
                    onClick={() => useStudio.getState().applyCosmeticSystem(anim.id, "head")}
                  >
                    Cosmetics · head
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:border-accent hover:text-fg"
                    onClick={() => useStudio.getState().applyCosmeticSystem(anim.id, "back")}
                  >
                    Cosmetics · back
                  </button>
                  <button
                    type="button"
                    className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-accent-fg"
                    onClick={() => useStudio.getState().auditAnim(anim.id)}
                  >
                    Self-audit
                  </button>
                </div>
                {anim.beast?.lastAuditScore != null && (
                  <p className="mt-1.5 font-mono text-[10px] text-muted">
                    Last audit: {anim.beast.lastAuditScore}/100
                  </p>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-subtle">
                Tip: marquee a sprite on a sheet, then add frame from selection. Place tool drops
                this anim into a scene.
              </p>
            </div>
          )}
        </Section>

        <Section title="Particles" icon={<Sparkles size={12} />}>
          {(() => {
            const st = getParticleStats();
            return (
              <p className="px-3 py-1 text-[10px] text-subtle">
                LOD {st.lod.toFixed(2)} · {st.drawn}/{st.emitters} drawn · {st.motes} motes
                {st.culled ? ` · ${st.culled} culled` : ""}
              </p>
            );
          })()}
          {particles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => useStudio.getState().selectParticle(p.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
                p.id === activeParticleId
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Sparkles size={12} className="text-cyan" />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-[10px] text-subtle">{p.kind}</span>
            </button>
          ))}
          {particle && (
            <div className="space-y-2 border-t border-border px-3 py-3">
              <select
                value={particle.kind}
                onChange={(e) =>
                  useStudio
                    .getState()
                    .setParticleKind(particle.id, e.target.value as typeof particle.kind)
                }
                className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 text-xs text-fg"
              >
                <option value="spark">Spark</option>
                <option value="smoke">Smoke</option>
                <option value="magic">Magic</option>
                <option value="dust">Dust</option>
                <option value="slash">Slash</option>
              </select>
              <div className="flex gap-1">
                <MiniBtn
                  title="Play/Pause"
                  onClick={() => useStudio.getState().toggleParticlePlay(particle.id)}
                >
                  {particle.playing ? <Pause size={12} /> : <Play size={12} />}
                </MiniBtn>
                <MiniBtn
                  title="Delete"
                  onClick={() => useStudio.getState().deleteParticle(particle.id)}
                >
                  <Trash2 size={12} />
                </MiniBtn>
              </div>
            </div>
          )}
        </Section>

        <Section title="Parallax stacks" icon={<Layers size={12} />}>
          {parallaxStacks.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">
              Pack → Rain City set, or wire a Parallax connector.
            </p>
          )}
          {parallaxStacks.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => useStudio.getState().selectParallax(p.id)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
                p.id === activeParallaxId
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Layers size={12} className="text-indigo-400" />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-[10px] text-subtle">{p.mode}</span>
            </button>
          ))}
          {parallax && (
            <div className="space-y-2 border-t border-border px-3 py-3">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => useStudio.getState().setParallaxMode(parallax.id, "viewport")}
                  className={cn(
                    "flex-1 rounded-[var(--radius-sm)] border px-2 py-1 text-[10px]",
                    parallax.mode === "viewport"
                      ? "border-accent bg-accent/15 text-fg"
                      : "border-border text-muted",
                  )}
                >
                  Viewport
                </button>
                <button
                  type="button"
                  onClick={() => useStudio.getState().setParallaxMode(parallax.id, "sheet")}
                  className={cn(
                    "flex-1 rounded-[var(--radius-sm)] border px-2 py-1 text-[10px]",
                    parallax.mode === "sheet"
                      ? "border-accent bg-accent/15 text-fg"
                      : "border-border text-muted",
                  )}
                >
                  Sheet-wide
                </button>
              </div>
              <button
                type="button"
                onClick={() => useStudio.getState().toggleParallaxAutoPreview(parallax.id)}
                className="w-full rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-[10px] text-muted hover:text-fg"
              >
                Auto preview: {parallax.autoPreview ? "ON" : "OFF"}
              </button>
              {parallax.folderPath ? (
                <p className="font-mono text-[10px] text-indigo-300">→ {parallax.folderPath}</p>
              ) : (
                <p className="text-[10px] text-subtle">
                  Select stack + click Parallax wire to bind export folder
                </p>
              )}
              {engine && (
                <p className="text-[10px] leading-snug text-subtle">
                  Export target:{" "}
                  <span className="text-fg">
                    {engine.engine === "godot"
                      ? "Parallax2D.scroll_scale"
                      : engine.engine === "unity"
                        ? "parallaxEffect (LateUpdate)"
                        : engine.engine === "unreal"
                          ? "ScrollFactor"
                          : engine.engine === "gamemaker"
                            ? "layer_x/y factors"
                            : "scroll_factor JSON"}
                  </span>
                </p>
              )}
              <div className="space-y-2">
                {parallax.layers.map((L) => (
                  <div key={L.id} className="rounded border border-border bg-surface px-2 py-1.5">
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="truncate font-medium text-fg">{L.name}</span>
                      <span className="font-mono text-subtle">{L.depth.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.2}
                      step={0.01}
                      value={L.depth}
                      onChange={(e) =>
                        useStudio
                          .getState()
                          .setParallaxLayerDepth(parallax.id, L.id, Number(e.target.value))
                      }
                      className="mt-1 w-full accent-[var(--accent)]"
                    />
                    <div className="mt-0.5 flex justify-between text-[9px] text-subtle">
                      <span>far / static</span>
                      <span>near / full</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <MiniBtn
                  title="Delete stack"
                  onClick={() => useStudio.getState().deleteParallax(parallax.id)}
                >
                  <Trash2 size={12} />
                </MiniBtn>
              </div>
            </div>
          )}
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-surface-2 hover:text-fg"
    >
      {children}
    </button>
  );
}

function HotkeyLocations() {
  const bookmarks = useHotkeys((s) => s.bookmarks);
  const saveBookmark = useHotkeys((s) => s.saveBookmark);
  const jump = useHotkeys((s) => s.jumpBookmark);
  const setCamera = useStudio((s) => s.setCamera);
  const camera = useStudio((s) => s.camera);
  const setRebind = useHotkeys((s) => s.setRebindMode);
  const pushToast = useHotkeys((s) => s.pushToast);
  const reset = useHotkeys((s) => s.resetBindings);

  return (
    <div className="space-y-2 px-3 pb-3">
      <p className="text-[10px] leading-snug text-subtle">
        StarCraft-style cams: <b className="text-fg">Ctrl+F1…F12</b> save ·{" "}
        <b className="text-fg">F1…F12</b> jump
      </p>
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((slot) => {
          const bm = bookmarks[slot];
          return (
            <button
              key={slot}
              type="button"
              title={
                bm
                  ? `F${slot} jump · right-click or Ctrl+F${slot} overwrite`
                  : `Empty — Ctrl+F${slot} or click to save`
              }
              onClick={() => {
                if (bm) {
                  setCamera({ x: bm.x, y: bm.y, zoom: bm.zoom });
                } else {
                  saveBookmark(slot, camera);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                saveBookmark(slot, camera);
              }}
              className={cn(
                "rounded border px-1 py-1.5 font-mono text-[10px] transition",
                bm
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-border text-subtle hover:text-fg",
              )}
            >
              F{slot}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="w-full rounded border border-border py-1 text-[10px] text-muted hover:text-fg"
        onClick={() => {
          setRebind({ bindingId: "__pick__" });
          pushToast(
            "Rebind mode",
            "Press the hotkey to change, then the new combo (Ctrl+Alt+K anytime)",
            { x: 80, y: 80 },
          );
        }}
      >
        Rebind a hotkey…
      </button>
      <button
        type="button"
        className="w-full text-[9px] text-subtle hover:text-muted"
        onClick={() => reset()}
      >
        Reset all hotkeys to defaults
      </button>
    </div>
  );
}

function SheetSlicer({
  boardId,
  boardW,
  boardH,
}: {
  boardId: string;
  boardW: number;
  boardH: number;
}) {
  const [fw, setFw] = useState(32);
  const [fh, setFh] = useState(32);
  const slice = useStudio((s) => s.sliceArtboardToAnim);
  const cols = Math.floor(boardW / fw);
  const rows = Math.floor(boardH / fh);
  const est = Math.max(0, cols * rows);

  return (
    <div className="space-y-2 px-3 pb-3">
      <p className="text-[10px] leading-snug text-subtle">
        Cut a spritesheet into an animation strip. Empty cells are skipped.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-muted">
          Frame W
          <input
            type="number"
            min={4}
            max={boardW}
            value={fw}
            onChange={(e) => setFw(Number(e.target.value) || 4)}
            className="mt-0.5 w-full rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-fg"
          />
        </label>
        <label className="text-[10px] text-muted">
          Frame H
          <input
            type="number"
            min={4}
            max={boardH}
            value={fh}
            onChange={(e) => setFh(Number(e.target.value) || 4)}
            className="mt-0.5 w-full rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-fg"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {[16, 24, 32, 48, 64].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setFw(n);
              setFh(n);
            }}
            className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted hover:border-accent hover:text-fg"
          >
            {n}²
          </button>
        ))}
      </div>
      <p className="font-mono text-[10px] text-subtle">
        {boardW}×{boardH} → ~{est} cells ({cols}×{rows})
      </p>
      <button
        type="button"
        onClick={() => slice(boardId, fw, fh)}
        className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-accent py-1.5 text-[11px] font-semibold text-accent-fg"
      >
        <Scissors size={12} />
        Slice to animation
      </button>
    </div>
  );
}

function FrameStrip({ animId }: { animId: string }) {
  const anim = useStudio((s) => s.animRegions.find((a) => a.id === animId));
  const setFrame = useStudio((s) => s.setAnimFrame);
  const deleteFrame = useStudio((s) => s.deleteAnimFrame);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    if (!anim) return;
    anim.frames.forEach((f, i) => {
      const c = canvasRefs.current.get(i);
      if (!c) return;
      c.width = anim.frameW;
      c.height = anim.frameH;
      c.getContext("2d")!.putImageData(bufferToImageData(f.data, anim.frameW, anim.frameH), 0, 0);
    });
  }, [anim]);

  if (!anim) return null;

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {anim.frames.map((f, i) => (
        <button
          key={f.id}
          type="button"
          onClick={() => setFrame(animId, i)}
          onDoubleClick={() => deleteFrame(animId, i)}
          className={cn(
            "relative shrink-0 overflow-hidden rounded border",
            i === anim.currentFrame ? "border-accent" : "border-border",
          )}
          style={{ width: 40, height: 40 }}
          title={`Frame ${i + 1} (double-click delete)`}
        >
          <canvas
            ref={(el) => {
              if (el) canvasRefs.current.set(i, el);
            }}
            className="pixel-canvas h-full w-full"
          />
        </button>
      ))}
    </div>
  );
}
