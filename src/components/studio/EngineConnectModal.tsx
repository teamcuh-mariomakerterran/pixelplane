import { useState } from "react";
import { Gamepad2, FolderTree, X } from "lucide-react";
import { useStudio } from "@/store/studio";
import { PIXEL_SIZE_OPTIONS } from "@/lib/engine/templates";
import type { PixelSizePreset } from "@/lib/pixel/types";

export function EngineConnectModal() {
  const open = useStudio((s) => s.showEngineConnect);
  const connected = useStudio((s) => s.engineProject);
  const setShow = useStudio((s) => s.setShowEngineConnect);
  const connectEngine = useStudio((s) => s.connectEngine);
  const disconnectEngine = useStudio((s) => s.disconnectEngine);

  const [name, setName] = useState(connected?.name ?? "My Pixel Game");
  const [root, setRoot] = useState(connected?.rootFolderName ?? "my_pixel_game");
  const [charSize, setCharSize] = useState<PixelSizePreset>(
    (connected?.sizeDefaults.characters as PixelSizePreset) ?? 48,
  );

  if (!open) return null;

  const treeHint = `${root}/art/characters · animations · environments · interiors · …`;

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
                Play project
              </h2>
              <p className="text-[11px] text-muted">
                Folders on this plane. PixelPlane is the engine — nothing leaves for another one.
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

          <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-[11px] leading-relaxed text-muted">
            Art on the plane is the game. Feed planes sort characters, rooms, and sheets into
            folders this project already plays. No Godot, Unity, or Unreal destination.
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
              Includes a dedicated <b>parallax/</b> folder (layers · sheets · depth). The plane
              plays these directly.
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
                  engine: "generic",
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
