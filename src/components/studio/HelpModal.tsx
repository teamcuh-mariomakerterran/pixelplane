import { X } from "lucide-react";
import { useStudio } from "@/store/studio";

export function HelpModal() {
  const show = useStudio((s) => s.showHelp);
  const setShow = useStudio((s) => s.setShowHelp);
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-3 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] border border-border bg-bg-elevated p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-fg">How PixelPlane works</h2>
            <p className="text-xs text-muted">
              One infinite plane for sheets, anims, FX, scenes — wired to your engine
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShow(false)}
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 text-xs leading-relaxed text-muted">
          <Block title="Workspace">
            Scroll to zoom, Space+drag or middle-mouse to pan. Everything lives on one giant plane —
            sheets, notes, scenes, animations, and feed planes side by side.
          </Block>
          <Block title="Draw">
            Brush, eraser, fill, line, rect, ellipse on any artboard. Pixel-perfect, no anti-alias.
            Layers stack with opacity, lock, and visibility.
          </Block>
          <Block title="Animation square">
            Clapperboard tool → drag a rectangle. That region becomes a live animation with a frame
            strip in the right panel. Marquee sprites on a sheet → Add frame from selection.
          </Block>
          <Block title="Place in scene">
            Select an animation, switch to Place, click anywhere on the plane to drop a live actor.
          </Block>
          <Block title="Plane folders (this is the engine)">
            Open <b>Play project</b> from the top bar to name the folders this plane already
            plays — characters, animations, interiors, items. Draw a <b>feed plane</b> (W tool)
            around art, or drag a connector from the wire palette. Destinations stay on this
            plane. PixelPlane is the start-to-finish engine; nothing leaves this plane.
          </Block>
          <Block title="Starter pack">
            Open <b>Pack</b> in the top bar for free-use example art (rats, zeRo.exe, portraits,
            neon scenes, sheets). Click any thumbnail to drop it on the plane — edit, animate, wire
            into folders, and play.
          </Block>
          <Block title="Parallax backgrounds">
            Pack → Environments includes a <b>Rain City Parallax Set</b> (far / mid / near). Dropping
            the set places editable layer boards plus a live preview window.{" "}
            <b>Auto-preview</b> scrolls depth; pan the plane to feel camera motion. Switch{" "}
            <b>Viewport / Sheet-wide</b> in the inspector. Depth 0 = farthest, 1 = nearest.
          </Block>
          <Block title="Parallax on the plane">
            Wire the <b>Parallax</b> connector onto a feed plane (or select a stack + click
            Parallax). Layers live here and scroll in Play. No export to another engine.
          </Block>
          <Block title="Camera locations (StarCraft-style)">
            <b>Ctrl+F1…F12</b> saves your current view. <b>F1…F12</b> jumps back. Locations show on
            the top strip and in Inspector → Camera locations. Right-click a slot to overwrite.
          </Block>
          <Block title="Custom hotkeys + in-canvas prompts">
            <b>Ctrl+Alt+K</b> rebind: press the old key, then the new combo. Conflicts open a note{" "}
            <i>on the canvas</i> (not a browser popup) so you can reassign the displaced action.
            First-time tool tips also appear on the plane next to your work.
          </Block>
          <Block title="Plane map + save">
            Bottom-right <b>Plane map</b> shows the whole field — click to jump. Work is{" "}
            <b>autosaved</b> in this browser (Ctrl/Cmd+S to force). Inspector → Project to clear
            save.
          </Block>
          <Block title="Sheet slicer">
            Select a spritesheet artboard → Inspector → <b>Sheet slicer</b> → set frame size → Slice.
            Builds a playable animation strip next to the sheet (empty cells skipped).
          </Block>
          <Block title="Solitaire mini-game">
            Click the <b>Solitaire</b> icon in the top bar to drop a full Klondike table on the plane.
            A <b>skin template</b> (52 faces + back + table) is placed next to it — paint or paste art
            into those artboards, then hit the link icon on the solitaire window to re-bind. Double-click
            cards to auto-send to foundations. Drag the title bar to reposition the game anywhere.
          </Block>
          <Block title="Particles">
            Particle tool → drag a region → spark / smoke / magic / dust / slash.
          </Block>
          <Block title="Generate">
            Prompt-based 8-bit / 16-bit characters land as sheets + animation regions on the plane.
          </Block>
          <Block title="Hotkeys">
            V select · M move · H pan · B brush · E eraser · G fill · I eyedropper · L line · R rect
            · O ellipse · S marquee · A anim · P particle · T place · W feed plane · Ctrl+Z/Y undo
            redo · Ctrl+C/X/V · [ ] brush size · Esc cancel wire
          </Block>
        </div>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="mt-4 w-full rounded-[var(--radius-sm)] bg-accent py-2 text-xs font-semibold text-accent-fg hover:bg-accent-hover"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-semibold text-fg">{title}</div>
      <p>{children}</p>
    </div>
  );
}
