import { useEffect, useMemo, useState } from "react";
import { BookOpen, X, Search, ChevronLeft } from "lucide-react";
import {
  GUIDE_CATEGORIES,
  loadGuideMarkdown,
  loadGuidesManifest,
  mdToSafeHtml,
  type GuideCategory,
  type GuideMeta,
} from "@/lib/guides";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export function GuidesPanel() {
  const open = useStudio((s) => s.showGuides);
  const setOpen = useStudio((s) => s.setShowGuides);
  const [guides, setGuides] = useState<GuideMeta[]>([]);
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<GuideCategory | "all">("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<GuideMeta | null>(null);
  const [bodyHtml, setBodyHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void loadGuidesManifest()
      .then((m) => {
        setGuides(m.guides);
        setDesc(m.description);
      })
      .catch(() => setErr("Could not load guides pack"));
  }, [open]);

  useEffect(() => {
    if (!active) {
      setBodyHtml("");
      return;
    }
    setLoading(true);
    setErr(null);
    void loadGuideMarkdown(active.file)
      .then((md) => setBodyHtml(mdToSafeHtml(md)))
      .catch(() => setErr("Failed to open guide"))
      .finally(() => setLoading(false));
  }, [active]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return guides.filter((g) => {
      if (cat !== "all" && g.category !== cat) return false;
      if (!qq) return true;
      return (
        g.title.toLowerCase().includes(qq) ||
        g.summary.toLowerCase().includes(qq) ||
        g.category.includes(qq)
      );
    });
  }, [guides, cat, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm">
      <div className="flex h-[min(860px,92vh)] w-[min(920px,96vw)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg-elevated shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <BookOpen size={16} className="text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-fg">Useful guides</div>
            <div className="truncate text-[10px] text-subtle">
              {desc || "Offline info dumps packaged with PixelPlane"}
            </div>
          </div>
          <button
            type="button"
            className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg"
            onClick={() => {
              setOpen(false);
              setActive(null);
            }}
          >
            <X size={16} />
          </button>
        </div>

        {!active ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
              <div className="relative min-w-[10rem] flex-1">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-subtle" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search guides…"
                  className="w-full rounded border border-border bg-surface py-1.5 pl-7 pr-2 text-xs text-fg"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {GUIDE_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCat(c.id)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px]",
                      cat === c.id
                        ? "bg-accent text-accent-fg"
                        : "bg-surface-2 text-muted hover:text-fg",
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {err && <p className="text-xs text-danger">{err}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {filtered.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActive(g)}
                    className="rounded-[var(--radius-md)] border border-border bg-surface p-3 text-left transition hover:border-accent/50 hover:bg-surface-2"
                  >
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-accent">
                      {g.category}
                    </div>
                    <div className="text-xs font-semibold text-fg">{g.title}</div>
                    <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-muted">
                      {g.summary}
                    </p>
                  </button>
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="py-8 text-center text-xs text-muted">No guides match.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted hover:bg-surface-2 hover:text-fg"
                onClick={() => setActive(null)}
              >
                <ChevronLeft size={14} /> Back
              </button>
              <div className="min-w-0 flex-1 truncate text-xs font-semibold text-fg">
                {active.title}
              </div>
            </div>
            <div className="guide-reader flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-relaxed text-muted">
              {loading && <p>Loading…</p>}
              {err && <p className="text-danger">{err}</p>}
              {!loading && !err && (
                <div
                  className="guide-md"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              )}
            </div>
          </>
        )}
      </div>
      <style>{`
        .guide-md h1 { font-size: 1.15rem; font-weight: 700; color: var(--color-fg, #eee); margin: 0.6rem 0 0.4rem; }
        .guide-md h2 { font-size: 1rem; font-weight: 650; color: var(--color-fg, #eee); margin: 0.85rem 0 0.35rem; }
        .guide-md h3 { font-size: 0.92rem; font-weight: 600; color: #e8a838; margin: 0.7rem 0 0.3rem; }
        .guide-md p { margin: 0.35rem 0 0.55rem; }
        .guide-md ul { margin: 0.3rem 0 0.6rem 1.1rem; list-style: disc; }
        .guide-md li { margin: 0.15rem 0; }
        .guide-md code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(255,255,255,0.06); padding: 0.05rem 0.3rem; border-radius: 3px; }
        .guide-md strong { color: #f3f4f6; }
        .guide-md table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 0.8rem; font-size: 10px; }
        .guide-md th, .guide-md td { border: 1px solid rgba(255,255,255,0.1); padding: 0.3rem 0.4rem; text-align: left; vertical-align: top; }
        .guide-md th { background: rgba(232,168,56,0.12); color: #f3f4f6; }
      `}</style>
    </div>
  );
}
