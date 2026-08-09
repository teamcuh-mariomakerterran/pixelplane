import { useState } from "react";
import { Gamepad2, FolderTree, X } from "lucide-react";
import { useStudio } from "@/store/studio";
import { PIXEL_SIZE_OPTIONS, engineLabel } from "@/lib/engine/templates";
import type { EngineId, PixelSizePreset } from "@/lib/pixel/types";
import { cn } from "@/lib/utils";

const ENGINES: { id: EngineId; blurb: string }[] = [
  {
    id: "godot",
    blurb: "assets/ tree · Parallax2D scenes (scroll_scale) · nearest filter snippet",
  },
  {
    id: "unity",
    blurb: "Assets/Art · PixelPlaneParallax.cs (LateUpdate / Cinemachine-safe)",
  },
  {
    id: "unreal",
    blurb: "Content/PixelArt · ScrollFactor component for Paper2D plates",
  },
  {
    id: "gamemaker",
    blurb: "sprites/ · layer_x/y camera factors + GML helper",
  },
  {
    id: "generic",
    blurb: "art/ tree + parallax_config.json for any custom pipeline",
  },
];

export function EngineConnectModal() {
  const open = useStudio((s) => s.showEngineConnect);
  const connected = useStudio((s) => s.engineProject);
  const setShow = useStudio((s) => s.setShowEngineConnect);
  const connectEngine = useStudio((s) => s.connectEngine);
  const disconnectEngine = useStudio((s) => s.disconnectEngine);

  const [name, setName] = useState(connected?.name ?? "My Pixel Game");
  const [engine, setEngine] = useState<EngineId>(connected?.engine ?? "godot");
  const [root, setRoot] = useState(connected?.rootFolderName ?? "my_pixel_game");
  const [charSize, setCharSize] = useState<PixelSizePreset>(
    (connected?.sizeDefaults.characters as PixelSizePreset) ?? 48,
  );

  if (!open) return null;

  const treeHint = (() => {
    try {
      // artRootPath may not exist — fallback inline
      const base =
        engine === "godot"
          ? "assets"
          : engine === "unity"
            ? "Assets/Art"
            : engine === "unreal"
              ? "Content/PixelArt"
              : engine === "gamemaker"
                ? "sprites"
                : "art";
      return `${root}/${base}/characters · animations · environments · parallax · …`;
    } catch {
      return `${root}/…`;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-labelledby="engine-connect-title"
        className="w-full max-w-lg overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-elevated shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
              <Gamepad2 size={16} />
            </div>
            <div>
              <h2 id="engine-connect-title" className="text-sm font-semibold text-fg">
                Connect game project
              </h2>
              <p className="text-[11px] text-muted">
                Engine-aware folders + parallax export for Godot, Unity, Unreal, GameMaker
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-[var(--radius-sm)] p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
            onClick={() => setShow(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[min(70dvh,560px)] space-y-4 overflow-y-auto px-4 py-4">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">
              Project name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              placeholder="My Pixel Game"
            />
          </label>

          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">
              Engine
            </span>
            <div className="mt-1.5 grid gap-2">
              {ENGINES.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEngine(e.id)}
                  className={cn(
                    "flex flex-col items-start rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition",
                    engine === e.id
                      ? "border-accent bg-accent/10 text-fg"
                      : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
                  )}
                >
                  <span className="text-sm font-medium">{engineLabel(e.id)}</span>
                  <span className="text-[11px] opacity-80">{e.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                Root folder
              </span>
              <input
                value={root}
                onChange={(e) => setRoot(e.target.value)}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 font-mono text-xs text-fg outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                Character pixel size
              </span>
              <select
                value={charSize}
                onChange={(e) => setCharSize(Number(e.target.value) as PixelSizePreset)}
                className="mt-1 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent"
              >
                {PIXEL_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}×{n}px
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-fg">
              <FolderTree size={12} className="text-accent" />
              Auto-created structure
            </div>
            <p className="font-mono text-[10px] leading-relaxed text-muted">{treeHint}</p>
            <p className="mt-1.5 text-[10px] text-subtle">
              Includes a dedicated <b>parallax/</b> folder (layers · sheets · config). Depth on the
              canvas exports as Godot scroll_scale, Unity parallaxEffect, Unreal ScrollFactor, or
              GameMaker layer factors.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          {connected ? (
            <button
              type="button"
              onClick={() => disconnectEngine()}
              className="text-xs text-danger hover:underline"
            >
              Disconnect current
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShow(false)}
              className="h-9 rounded-[var(--radius-sm)] px-3 text-xs text-muted hover:bg-surface-2 hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                connectEngine({
                  name,
                  engine,
                  rootFolderName: root,
                  defaultCharacterSize: charSize,
                })
              }
              className="h-9 rounded-[var(--radius-sm)] bg-accent px-4 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
            >
              {connected ? "Reconnect / rebuild tree" : "Create & connect"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
