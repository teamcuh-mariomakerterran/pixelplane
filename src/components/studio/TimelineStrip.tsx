import { useTimeline } from "@/store/timeline";
import { Clock, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

/** Living collage timeline — scrub moments along the bottom. */
export function TimelineStrip() {
  const moments = useTimeline((s) => s.moments);
  const activeId = useTimeline((s) => s.activeId);
  const show = useTimeline((s) => s.showStrip);
  const jump = useTimeline((s) => s.jump);
  const remove = useTimeline((s) => s.remove);
  const setShow = useTimeline((s) => s.setShowStrip);
  const stamp = useTimeline((s) => s.stamp);

  if (!show) {
    return (
      <button
        type="button"
        title="Show timeline"
        onClick={() => setShow(true)}
        className="pointer-events-auto absolute bottom-8 left-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-elevated/95 text-accent shadow-lg"
      >
        <Clock size={14} />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto absolute bottom-7 left-1/2 z-30 flex w-[min(920px,calc(100%-12rem))] -translate-x-1/2 flex-col gap-1">
      <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-border/80 bg-bg-elevated/95 px-2 py-1 text-[10px] backdrop-blur-md">
        <Clock size={12} className="text-accent" />
        <span className="font-semibold uppercase tracking-wider text-muted">
          Living timeline
        </span>
        <span className="text-subtle">{moments.length} moments</span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-muted hover:text-fg"
          onClick={() => stamp("Manual mark", "User stamp")}
        >
          <Camera size={10} /> Stamp
        </button>
        <button
          type="button"
          className="rounded p-0.5 text-subtle hover:text-fg"
          onClick={() => setShow(false)}
          aria-label="Hide timeline"
        >
          <X size={12} />
        </button>
      </div>
      <div className="flex items-stretch gap-1 overflow-x-auto rounded-b-lg border border-border/80 bg-bg-elevated/90 p-1.5 shadow-xl backdrop-blur-md">
        {moments.length === 0 && (
          <div className="px-3 py-2 text-[10px] text-subtle">
            Moments auto-stamp on big moves · or hit Stamp
          </div>
        )}
        {moments.map((m, i) => (
          <button
            key={m.id}
            type="button"
            onClick={() => jump(m.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              remove(m.id);
            }}
            className={cn(
              "group relative min-w-[88px] max-w-[120px] shrink-0 rounded-md border px-2 py-1.5 text-left transition",
              activeId === m.id
                ? "border-accent/60 bg-accent/15"
                : "border-border/70 bg-surface/80 hover:border-border-strong",
            )}
            style={{ boxShadow: `inset 3px 0 0 ${m.color}` }}
            title={`${m.label} · right-click remove`}
          >
            <div className="truncate text-[10px] font-semibold text-fg">{m.label}</div>
            <div className="font-mono text-[9px] text-subtle">
              {m.boardCount}b · {new Date(m.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="absolute right-1 top-1 text-[8px] text-subtle opacity-60">
              {i + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
