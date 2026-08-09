import {
  MousePointer2,
  Hand,
  Move,
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Crop,
  Clapperboard,
  Sparkles,
  MapPin,
  Plus,
  Grid3x3,
  Cable,
  Monitor,
  Stamp,
} from "lucide-react";
import { useStudio } from "@/store/studio";
import type { ToolId } from "@/lib/pixel/types";
import { cn } from "@/lib/utils";
import { PixelIcon } from "./PixelIcon";
import { useIconTheme } from "@/lib/icon-library/theme";

const TOOLS: {
  id: ToolId;
  icon: React.ReactNode;
  label: string;
  hotkey?: string;
}[] = [
  { id: "select", icon: <MousePointer2 size={18} />, label: "Select", hotkey: "V" },
  { id: "move", icon: <Move size={18} />, label: "Move boards / anims / wires", hotkey: "M" },
  { id: "pan", icon: <Hand size={18} />, label: "Pan (or hold Space)", hotkey: "H" },
  { id: "brush", icon: <Pencil size={18} />, label: "Brush", hotkey: "B" },
  { id: "eraser", icon: <Eraser size={18} />, label: "Eraser", hotkey: "E" },
  { id: "fill", icon: <PaintBucket size={18} />, label: "Fill", hotkey: "G" },
  { id: "eyedropper", icon: <Pipette size={18} />, label: "Eyedropper", hotkey: "I" },
  { id: "line", icon: <Minus size={18} />, label: "Line", hotkey: "L" },
  { id: "rect", icon: <Square size={18} />, label: "Rectangle", hotkey: "R" },
  { id: "ellipse", icon: <Circle size={18} />, label: "Ellipse", hotkey: "O" },
  { id: "marquee", icon: <Crop size={18} />, label: "Marquee select / cut", hotkey: "S" },
  { id: "anim-region", icon: <Clapperboard size={18} />, label: "Animation square", hotkey: "A" },
  { id: "particle", icon: <Sparkles size={18} />, label: "Particle region", hotkey: "P" },
  { id: "place", icon: <MapPin size={18} />, label: "Place anim in scene", hotkey: "T" },
  { id: "wire-zone", icon: <Cable size={18} />, label: "Feed plane (wire zone)", hotkey: "W" },
  {
    id: "game-viewport",
    icon: <Monitor size={18} />,
    label: "Ghost of the game (viewport)",
    hotkey: "U",
  },
  {
    id: "constraint-stamp",
    icon: <Stamp size={18} />,
    label: "Constraint stamp (pixel cage)",
    hotkey: "N",
  },
];

const PALETTE = [
  "#000000",
  "#ffffff",
  "#3ecfcf",
  "#e8a838",
  "#e85d5d",
  "#4ecb71",
  "#7c5cff",
  "#ff5cb0",
  "#1a1f28",
  "#5c6578",
  "#f0b84a",
  "#2dd4bf",
  "#fb7185",
  "#a3e635",
  "#38bdf8",
  "#c084fc",
];

export function LeftToolbar() {
  const tool = useStudio((s) => s.tool);
  const color = useStudio((s) => s.color);
  const brushSize = useStudio((s) => s.brushSize);
  const fillShapes = useStudio((s) => s.fillShapes);
  const setTool = useStudio((s) => s.setTool);
  const setColor = useStudio((s) => s.setColor);
  const setBrushSize = useStudio((s) => s.setBrushSize);
  const setFillShapes = useStudio((s) => s.setFillShapes);
  const addArtboard = useStudio((s) => s.addArtboard);
  const setActiveConnector = useStudio((s) => s.setActiveConnector);
  const iconTheme = useIconTheme((s) => s.theme);
  const cycleTheme = useIconTheme((s) => s.cycleTheme);

  return (
    <aside className="flex h-full w-[56px] shrink-0 flex-col items-center gap-1 border-r border-border bg-bg-elevated py-2 md:w-[64px]">
      <button
        type="button"
        title="New artboard"
        onClick={() => addArtboard({ width: 128, height: 128, name: "New Sheet" })}
        className="mb-1 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent text-accent-fg shadow-sm transition hover:bg-accent-hover"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>

      <div className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto px-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={`${t.label}${t.hotkey ? ` (${t.hotkey})` : ""}`}
            onClick={() => {
              setTool(t.id);
              if (t.id !== "wire-zone") setActiveConnector(null);
            }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] transition",
              tool === t.id
                ? "bg-accent/25 ring-1 ring-accent text-fg"
                : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <PixelIcon
              toolId={t.id}
              size={22}
              alt={t.label}
              fallback={t.icon}
            />
          </button>
        ))}
      </div>

      <div className="mt-1 flex flex-col items-center gap-2 border-t border-border px-1 pt-2">
        <button
          type="button"
          title={`Icon theme: ${iconTheme} (click to cycle amber / cyan / vector)`}
          onClick={() => cycleTheme()}
          className="rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-400 hover:bg-surface-2"
        >
          {iconTheme === "vector" ? "vec" : iconTheme.slice(0, 3)}
        </button>
        <label className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-border-strong shadow-inner">
          <input
            type="color"
            value={color.length === 7 ? color : "#3ecfcf"}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 h-[200%] w-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
          />
        </label>
        <div className="hidden flex-col gap-0.5 md:flex">
          {PALETTE.slice(0, 8).map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setColor(c)}
              className={cn(
                "h-3.5 w-7 rounded-sm border",
                color === c ? "border-fg" : "border-transparent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] text-subtle">{brushSize}px</span>
          <input
            type="range"
            min={1}
            max={16}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="h-16 w-6 cursor-pointer appearance-none bg-transparent writing-vertical"
            style={{ writingMode: "vertical-lr", direction: "rtl" }}
          />
        </div>
        <button
          type="button"
          title="Fill shapes"
          onClick={() => setFillShapes(!fillShapes)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-xs",
            fillShapes ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2",
          )}
        >
          <Grid3x3 size={14} />
        </button>
      </div>
    </aside>
  );
}
