import { useEffect, useMemo, useState } from "react";
import { PackageOpen, Plus, X, Search, Sparkles } from "lucide-react";
import { useStudio } from "@/store/studio";
import {
  loadStarterManifest,
  loadImageAsBuffer,
  STARTER_CATEGORIES,
  type StarterCategory,
  type StarterItem,
} from "@/lib/starter-pack";
import { cn } from "@/lib/utils";

export function StarterPackPanel() {
  const open = useStudio((s) => s.showStarterPack);
  const setOpen = useStudio((s) => s.setShowStarterPack);
  const importImage = useStudio((s) => s.importImageToArtboard);
  const placeParallax = useStudio((s) => s.placeParallaxStack);
  const setStatus = useStudio((s) => s.setStatus);

  const [items, setItems] = useState<StarterItem[]>([]);
  const [license, setLicense] = useState("");
  const [cat, setCat] = useState<StarterCategory | "all">("all");
  const [q, setQ] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void loadStarterManifest()
      .then((m) => {
        setItems(m.items);
        setLicense(m.license);
      })
      .catch(() => setStatus("Could not load starter pack"));
  }, [open, setStatus]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((it) => {
      if (cat !== "all" && it.category !== cat) return false;
      if (!qq) return true;
      return (
        it.name.toLowerCase().includes(qq) ||
        it.tags.some((t) => t.includes(qq)) ||
        it.category.includes(qq)
      );
    });
  }, [items, cat, q]);

  const dropParallaxSet = async () => {
    setLoadingId("parallax_set_rain");
    try {
      const layersSpec = [
        {
          src: "/starter-pack/environments/parallax_far_city.jpg",
          name: "Far City",
          depth: 0.15,
        },
        {
          src: "/starter-pack/environments/parallax_mid_skyline.jpg",
          name: "Mid Skyline",
          depth: 0.45,
        },
        {
          src: "/starter-pack/environments/parallax_near_rooftop.jpg",
          name: "Near Rooftop",
          depth: 0.85,
        },
      ];
      const layers = [];
      let px = 40 + useStudio.getState().artboards.length * 8;
      let py = 40;
      for (const spec of layersSpec) {
        const { data, w, h } = await loadImageAsBuffer(spec.src, 360);
        layers.push({
          id: `pxl_${spec.name.replace(/\s+/g, "_")}_${Date.now()}`,
          name: spec.name,
          depth: spec.depth,
          data,
          w,
          h,
          rev: 1,
        });
        // also drop editable boards
        importImage(new Uint8ClampedArray(data), w, h, `BG · ${spec.name}`, px, py);
        py += h + 12;
      }
      const viewW = Math.min(320, ...layers.map((l) => l.w));
      const viewH = Math.min(180, ...layers.map((l) => l.h));
      placeParallax({
        name: "Rain City Parallax",
        x: px + 40,
        y: 40,
        viewW,
        viewH,
        mode: "viewport",
        layers,
        playing: true,
        autoPreview: true,
        previewCamX: 0,
        previewCamY: 0,
        folderId: null,
        folderPath: null,
      });
      setStatus("Rain City parallax set on the plane — pan the canvas to preview depth");
      setOpen(false);
    } catch {
      setStatus("Failed to place parallax set");
    } finally {
      setLoadingId(null);
    }
  };

  const dropOnCanvas = async (item: StarterItem) => {
    if (item.kind === "parallax-set" || item.id === "parallax_set_rain") {
      await dropParallaxSet();
      return;
    }
    setLoadingId(item.id);
    try {
      const max = item.kind === "scene" ? 480 : item.kind === "sheet" ? 420 : 256;
      const { data, w, h } = await loadImageAsBuffer(item.src, max);
      const n = useStudio.getState().artboards.length;
      importImage(data, w, h, item.name, 40 + (n % 6) * 36, 40 + Math.floor(n / 6) * 40);
      setStatus(`Dropped “${item.name}” on the plane`);
    } catch {
      setStatus(`Failed to load ${item.name}`);
    } finally {
      setLoadingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-2 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-labelledby="starter-pack-title"
        className="flex max-h-[min(92dvh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-elevated shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-accent-fg">
              <PackageOpen size={18} />
            </div>
            <div>
              <h2 id="starter-pack-title" className="text-sm font-semibold text-fg">
                Starter pack
              </h2>
              <p className="text-[11px] text-muted">
                Free-use examples included with PixelPlane — drop onto the canvas
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <div className="relative min-w-[140px] flex-1">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search rats, sheets, neon…"
              className="h-8 w-full rounded-[var(--radius-sm)] border border-border bg-surface pl-7 pr-2 text-xs text-fg outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STARTER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={cn(
                  "h-7 rounded-full px-2.5 text-[10px] font-medium transition",
                  cat === c.id
                    ? "bg-accent text-accent-fg"
                    : "bg-surface text-muted hover:text-fg",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={loadingId === item.id}
                onClick={() => void dropOnCanvas(item)}
                className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface text-left transition hover:border-accent/50 hover:bg-surface-2"
              >
                <div className="relative aspect-square overflow-hidden bg-bg checker-bg">
                  <img
                    src={item.src}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-contain"
                    style={{ imageRendering: item.kind === "scene" ? "auto" : "pixelated" }}
                  />
                  <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg opacity-0 shadow transition group-hover:opacity-100">
                    <Plus size={14} />
                  </span>
                  {loadingId === item.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-bg/60 text-[10px] text-fg">
                      Loading…
                    </span>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <div className="truncate text-[11px] font-medium text-fg">{item.name}</div>
                  <div className="truncate text-[9px] uppercase tracking-wide text-subtle">
                    {item.category} · {item.kind}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-10 text-center text-xs text-muted">No matches — try another filter</p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-[10px] text-subtle">
          <Sparkles size={12} className="shrink-0 text-accent" />
          <span className="leading-snug">{license || "Free-use starter examples."}</span>
          <span className="ml-auto shrink-0 font-mono text-muted">{filtered.length} assets</span>
        </div>
      </div>
    </div>
  );
}
