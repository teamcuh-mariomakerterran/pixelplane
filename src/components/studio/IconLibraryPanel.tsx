import { useMemo, useState } from "react";
import {
  ICON_CATALOG,
  ICON_STYLE_CONTRACT,
  searchIcons,
  resolvePixelSrc,
  type IconCategory,
  type IconEntry,
} from "@/lib/icon-library";
import { useIconTheme } from "@/lib/icon-library/theme";
import { UI_CHROME, FX_EXPLOSIONS } from "@/lib/icon-library/pixel-packs";
import { useStudio } from "@/store/studio";
import {
  User,
  Clapperboard,
  Trees,
  Layers,
  Sparkles,
  Package,
  LayoutDashboard,
  Gauge,
  Music,
  Grid3x3,
  Building2,
  FolderTree,
  FolderCheck,
  Compass,
  Palette,
  Copy,
  Shirt,
  Pencil,
  Scissors,
  Cable,
  Heart,
  Zap,
  AlertTriangle,
  Map,
  PenTool,
  Car,
  Pause,
  Move,
  Swords,
  HeartCrack,
  Skull,
  Flame,
  Spade,
  Search,
  X,
  MousePointer2,
  Hand,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Crop,
  MapPin,
  Shield,
  Users,
  Eye,
  Ghost,
  Box,
  Moon,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import { PixelIcon } from "./PixelIcon";

const LUCIDE_MAP: Record<string, LucideIcon> = {
  User,
  Clapperboard,
  Trees,
  Layers,
  Sparkles,
  Package,
  LayoutDashboard,
  Gauge,
  Music,
  Grid3x3,
  Building2,
  FolderTree,
  FolderCheck,
  Compass,
  Palette,
  Copy,
  Shirt,
  Pencil,
  Scissors,
  Cable,
  Heart,
  Zap,
  AlertTriangle,
  Map,
  PenTool,
  Car,
  Pause,
  Move,
  Swords,
  HeartCrack,
  Skull,
  Flame,
  Spade,
  MousePointer2,
  Hand,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Crop,
  MapPin,
  Shield,
  Users,
  Eye,
  Ghost,
  Box,
  Moon,
  CheckSquare,
};

const CATS: { id: IconCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "wire", label: "Wire" },
  { id: "folder", label: "Folders" },
  { id: "anim", label: "Anim" },
  { id: "hud", label: "HUD" },
  { id: "tool", label: "Tools" },
  { id: "chrome", label: "Chrome" },
  { id: "engine", label: "Engine" },
  { id: "indoor", label: "Indoor" },
];

export function IconLibraryPanel() {
  const open = useStudio((s) => s.showIconLibrary);
  const setOpen = useStudio((s) => s.setShowIconLibrary);
  const setStatus = useStudio((s) => s.setStatus);
  const theme = useIconTheme((s) => s.theme);
  const setTheme = useIconTheme((s) => s.setTheme);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<IconCategory | "all">("all");
  const [picked, setPicked] = useState<string | null>(null);

  const list = useMemo(() => {
    let items = searchIcons(q);
    if (cat !== "all") items = items.filter((i) => i.category === cat);
    return items;
  }, [q, cat]);

  if (!open) return null;

  const onPick = (entry: IconEntry) => {
    setPicked(entry.id);
    const px = resolvePixelSrc(entry, theme);
    setStatus(
      `Icon “${entry.name}” (${entry.id})` +
        (entry.wireRole ? ` · wire: ${entry.wireRole}` : "") +
        (px ? ` · pixel ${theme}` : " · vector"),
    );
  };

  return (
    <div className="fixed inset-y-12 right-2 z-40 flex w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-lg border border-border bg-surface/95 shadow-xl backdrop-blur sm:right-14">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div className="text-xs font-semibold tracking-wide text-fg">Icon library</div>
          <div className="text-[10px] text-muted">
            Brian packs live · amber / cyan / vector
          </div>
        </div>
        <button
          type="button"
          className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg"
          onClick={() => setOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {(["amber", "cyan", "vector"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize ${
              theme === t
                ? t === "amber"
                  ? "bg-amber-500/20 text-amber-300"
                  : t === "cyan"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-accent/20 text-accent"
                : "text-muted hover:bg-surface-2"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search size={14} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted"
        />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
        {CATS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              cat === c.id ? "bg-accent/20 text-accent" : "text-muted hover:bg-surface-2"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
          {list.map((entry) => {
            const Icon = LUCIDE_MAP[entry.lucide] ?? Package;
            const active = picked === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                title={`${entry.name}\n${entry.id}`}
                onClick={() => onPick(entry)}
                className={`flex flex-col items-center gap-1 rounded-md border p-2 transition ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border/60 text-fg hover:border-accent/40 hover:bg-surface-2"
                }`}
              >
                <PixelIcon
                  id={entry.id}
                  size={28}
                  alt={entry.name}
                  fallback={<Icon size={22} strokeWidth={2} />}
                />
                <span className="line-clamp-2 w-full text-center text-[9px] leading-tight text-muted">
                  {entry.name}
                </span>
              </button>
            );
          })}
        </div>
        {list.length === 0 && (
          <div className="p-4 text-center text-xs text-muted">No icons match</div>
        )}

        <div className="mt-3 border-t border-border/60 pt-2">
          <div className="mb-1 text-[10px] font-semibold text-fg">UI chrome & FX</div>
          <div className="flex flex-wrap gap-2">
            <img
              src={UI_CHROME.minimapFrame}
              alt="minimap"
              className="h-12 w-12 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <img
              src={UI_CHROME.staminaFull}
              alt="stamina"
              className="h-6 w-20 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <img
              src={UI_CHROME.questPanel}
              alt="quest"
              className="h-12 w-20 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <img
              src={FX_EXPLOSIONS.gifV2}
              alt="explosion"
              className="h-12 w-12 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <div className="mt-1 text-[9px] text-subtle">
            Smash FX · stamina · minimap frame · quest plate ready for engine HUD
          </div>
        </div>
      </div>

      <div className="border-t border-border px-3 py-2 text-[10px] leading-relaxed text-muted">
        <div>
          Catalog: {ICON_CATALOG.length} · theme <strong className="text-fg/80">{theme}</strong> ·
          packs under /pixel-icons
        </div>
        {picked && (
          <div className="mt-1 font-mono text-accent/90">selected: {picked}</div>
        )}
      </div>
    </div>
  );
}
