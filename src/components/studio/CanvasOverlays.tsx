import { useEffect } from "react";
import { useHotkeys } from "@/store/hotkeys";
import { useCollab } from "@/store/collab";
import { Lightbulb, MapPin, Keyboard, X, AlertTriangle, Users } from "lucide-react";
import { animCssFor, OVERLAY_KEYFRAMES } from "@/lib/ui/overlay-anim";

/** Left systems dock footprint — keep tips/toasts out of this band */
const DOCK_SAFE_LEFT = 248;
const DOCK_SAFE_TOP = 56;

function clampOverlayPos(x: number, y: number, width = 300, height = 160) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let cx = x;
  let cy = y;
  // If caller placed over left dock, kick tip to mid-canvas
  if (cx < DOCK_SAFE_LEFT && cy < DOCK_SAFE_TOP + 200) {
    cx = Math.max(DOCK_SAFE_LEFT, Math.min(vw / 2 - width / 2, vw - width - 16));
    cy = Math.max(DOCK_SAFE_TOP + 8, Math.min(cy, vh - height - 48));
  }
  cx = Math.min(Math.max(12, cx), Math.max(12, vw - width - 12));
  cy = Math.min(Math.max(48, cy), Math.max(48, vh - height - 24));
  return { left: cx, top: cy };
}

/**
 * In-canvas tips, toasts, collab notes, hotkey dialogs — not browser modals.
 * Entrance animation is user-selectable (Shared plane panel / settings).
 * Never covers the plane-systems dock (position clamp + dock z-index).
 */
export function CanvasOverlays() {
  const overlays = useHotkeys((s) => s.overlays);
  const dismiss = useHotkeys((s) => s.dismissOverlay);
  const prune = useHotkeys((s) => s.pruneExpired);
  const resolveReplace = useHotkeys((s) => s.resolveConflictReplace);
  const resolveCancel = useHotkeys((s) => s.resolveConflictCancel);
  const defaultAnim = useCollab((s) => s.overlayAnim);
  const customCss = useCollab((s) => s.customAnimCss);

  useEffect(() => {
    const t = setInterval(() => prune(), 400);
    return () => clearInterval(t);
  }, [prune]);

  if (overlays.length === 0) {
    return <style>{OVERLAY_KEYFRAMES}</style>;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <style>{OVERLAY_KEYFRAMES}</style>
      {overlays.map((o, i) => {
        const pos = clampOverlayPos(o.x, o.y + i * 12);
        const style: React.CSSProperties = {
          left: pos.left,
          top: pos.top,
          animation: animCssFor(o.anim ?? defaultAnim, customCss),
        };

        if (o.kind === "toast" || o.kind === "collab") {
          const isCollab = o.kind === "collab";
          return (
            <div
              key={o.id}
              className="pointer-events-auto absolute max-w-[280px] rounded-[var(--radius-md)] border bg-bg-elevated/95 px-3 py-2 shadow-xl backdrop-blur-md"
              style={{
                ...style,
                borderColor: isCollab
                  ? (o.color ?? "#e8a838") + "99"
                  : "rgba(232,168,56,0.4)",
              }}
            >
              <div className="flex items-start gap-2">
                {isCollab ? (
                  <Users size={14} className="mt-0.5 shrink-0" style={{ color: o.color }} />
                ) : (
                  <MapPin size={14} className="mt-0.5 shrink-0 text-accent" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-fg">{o.title}</div>
                  <div className="text-[10px] leading-snug text-muted">{o.body}</div>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-subtle hover:text-fg"
                  onClick={() => dismiss(o.id)}
                  aria-label="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          );
        }

        if (o.kind === "tip") {
          return (
            <div
              key={o.id}
              className="pointer-events-auto absolute w-[min(300px,calc(100vw-24px))] rounded-[var(--radius-md)] border border-border bg-bg-elevated/95 shadow-2xl backdrop-blur-md"
              style={style}
            >
              <div className="flex items-center gap-1.5 border-b border-border bg-accent/10 px-3 py-1.5">
                <Lightbulb size={13} className="text-accent" />
                <span className="text-[11px] font-semibold text-fg">{o.title}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-subtle">tip</span>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-fg"
                  onClick={() => dismiss(o.id)}
                  aria-label="Dismiss tip"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="space-y-2 px-3 py-2.5">
                <p className="text-[11px] leading-relaxed text-muted">{o.body}</p>
                {o.creative && (
                  <p className="rounded-[var(--radius-sm)] border border-border/80 bg-surface px-2 py-1.5 text-[10px] leading-snug text-fg/90">
                    <span className="font-semibold text-accent">Creative: </span>
                    {o.creative}
                  </p>
                )}
                <button
                  type="button"
                  className="w-full rounded-[var(--radius-sm)] bg-surface-2 py-1 text-[10px] font-medium text-muted hover:text-fg"
                  onClick={() => dismiss(o.id)}
                >
                  Got it
                </button>
              </div>
            </div>
          );
        }

        // dialog
        return (
          <div
            key={o.id}
            className="pointer-events-auto absolute w-[min(320px,calc(100vw-24px))] rounded-[var(--radius-md)] border border-amber-500/40 bg-bg-elevated/98 shadow-2xl backdrop-blur-md"
            style={style}
          >
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
              <AlertTriangle size={13} className="text-amber-400" />
              <span className="text-[11px] font-semibold text-fg">{o.title}</span>
              <Keyboard size={12} className="ml-auto text-subtle" />
            </div>
            <div className="space-y-3 px-3 py-3">
              <p className="text-[11px] leading-relaxed text-muted">{o.body}</p>
              {o.conflict?.phase === "confirm" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-[var(--radius-sm)] border border-border py-1.5 text-[11px] text-muted hover:text-fg"
                    onClick={() => resolveCancel(o.id)}
                  >
                    Keep old
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-[var(--radius-sm)] bg-accent py-1.5 text-[11px] font-semibold text-accent-fg"
                    onClick={() => resolveReplace(o.id)}
                  >
                    Replace & reassign
                  </button>
                </div>
              )}
              {o.conflict?.phase === "reassign_old" && (
                <div className="rounded-[var(--radius-sm)] border border-dashed border-accent/50 bg-accent/5 px-2 py-2 text-center text-[10px] text-accent">
                  Listening for a new key combo…
                  <div className="mt-1 text-muted">Esc = leave unbound</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact location bookmark strip — shows which F-slots are set */
export function BookmarkStrip() {
  const bookmarks = useHotkeys((s) => s.bookmarks);
  const slots = [1, 2, 3, 4, 5, 6, 7, 8];
  const any = slots.some((s) => bookmarks[s]);
  if (!any) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-20 flex -translate-x-1/2 gap-0.5 rounded-full border border-border/80 bg-bg-elevated/90 px-2 py-1 shadow-lg backdrop-blur">
      {slots.map((s) => {
        const set = !!bookmarks[s];
        return (
          <span
            key={s}
            className={
              set
                ? "flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-accent/20 px-1 font-mono text-[9px] text-accent"
                : "flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 font-mono text-[9px] text-subtle/50"
            }
            title={set ? `F${s} jump · Ctrl+F${s} save` : `Empty — Ctrl+F${s} to save`}
          >
            F{s}
          </span>
        );
      })}
    </div>
  );
}
