import { useEffect, useState } from "react";
import { useStudio } from "@/store/studio";
import { gravityField, type GravitySwatch } from "@/lib/pixel/palette-gravity";
import { Magnet } from "lucide-react";

/**
 * Palette Gravity HUD — colors bleed in from nearby artboards.
 * Click a swatch to lock the brush; shows when field is non-empty.
 */
export function PaletteGravityBar() {
  const hover = useStudio((s) => s.hoverPixel);
  const artboards = useStudio((s) => s.artboards);
  const setColor = useStudio((s) => s.setColor);
  const color = useStudio((s) => s.color);
  const tool = useStudio((s) => s.tool);
  const [field, setField] = useState<GravitySwatch[]>([]);

  useEffect(() => {
    if (!hover || artboards.length === 0) {
      setField([]);
      return;
    }
    const paintish = ["brush", "fill", "line", "rect", "ellipse", "eyedropper"].includes(tool);
    if (!paintish) {
      setField([]);
      return;
    }
    const next = gravityField(artboards, hover.worldX, hover.worldY, 320);
    setField(next);
  }, [hover?.worldX, hover?.worldY, artboards, tool]);

  if (field.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border/80 bg-bg-elevated/95 px-3 py-1.5 shadow-xl backdrop-blur-md">
      <Magnet size={12} className="text-cyan shrink-0" />
      <span className="text-[9px] font-semibold uppercase tracking-wider text-subtle">
        Gravity
      </span>
      <div className="pointer-events-auto flex items-center gap-1">
        {field.map((s) => (
          <button
            key={s.hex + s.boardId}
            type="button"
            title={`${s.hex} · ${s.boardName}`}
            onClick={() => {
              setColor(s.hex);
              useStudio.getState().setStatus(`Palette gravity · ${s.hex} from ${s.boardName}`);
            }}
            className="h-5 w-5 rounded-full border border-border-strong shadow-inner transition hover:scale-110"
            style={{
              background: s.hex,
              outline: s.hex.toLowerCase() === color.toLowerCase() ? "2px solid var(--color-accent)" : undefined,
              outlineOffset: 1,
              opacity: 0.55 + s.weight * 0.45,
            }}
          />
        ))}
      </div>
    </div>
  );
}
