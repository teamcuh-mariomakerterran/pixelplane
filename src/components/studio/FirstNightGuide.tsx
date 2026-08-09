import { useSpatialNav } from "@/store/spatial-nav";
import { FIRST_NIGHT_STEPS } from "@/lib/first-night/path";
import { useStudio } from "@/store/studio";
import { ChevronLeft, ChevronRight, MapPin, X, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * B3 Look-at-This beacons always available.
 * A1 First Night tour: DEFERRED (Brian 2026-08-05) — scaffold only if already started;
 * no front-door CTA until one full sweep after more systems ship.
 */
export function FirstNightGuide() {
  const on = useSpatialNav((s) => s.firstNightOn);
  const idx = useSpatialNav((s) => s.firstNightIndex);
  const beacons = useSpatialNav((s) => s.beacons);
  const step = FIRST_NIGHT_STEPS[idx];

  return (
    <div className="pointer-events-none absolute bottom-14 left-1/2 z-30 flex w-[min(440px,calc(100%-2rem))] -translate-x-1/2 flex-col gap-2">
      {/* Beacon bar — living system (Wave B3) */}
      <div className="pointer-events-auto flex items-center justify-center gap-1.5">
        <button
          type="button"
          title="Look at this (Ctrl+L) — drop a spatial beacon at view center"
          className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-black/70 px-2.5 py-1 text-[10px] font-medium text-sky-200 backdrop-blur hover:bg-sky-950/80"
          onClick={() => useSpatialNav.getState().dropBeacon({ label: "Look at this" })}
        >
          <MapPin size={12} /> Look at this
        </button>
        {beacons.length > 0 && (
          <button
            type="button"
            title="Cycle beacons (G)"
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[10px] text-white/80 backdrop-blur hover:bg-black/80"
            onClick={() => useSpatialNav.getState().cycleBeacons()}
          >
            <Crosshair size={12} /> Cycle ({beacons.length})
          </button>
        )}
      </div>

      {/* First Night UI only if already mid-tour (no start CTA — deferred) */}
      {on && step && (
        <div className="pointer-events-auto rounded-lg border border-white/15 bg-black/80 p-3 shadow-xl backdrop-blur">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                First Night (deferred scaffold) · {idx + 1}/{FIRST_NIGHT_STEPS.length}
              </div>
              <div className="text-sm font-semibold text-white">{step.title}</div>
            </div>
            <button
              type="button"
              className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => useSpatialNav.getState().stopFirstNight()}
            >
              <X size={14} />
            </button>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-white/70">{step.body}</p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={idx <= 0}
              className={cn(
                "rounded border border-white/15 px-2 py-1 text-[10px] text-white/80",
                idx <= 0 && "opacity-40",
              )}
              onClick={() => useSpatialNav.getState().prevFirstNight()}
            >
              <ChevronLeft size={12} className="inline" /> Back
            </button>
            <div className="flex-1" />
            {step.action === "open_engine" && idx === FIRST_NIGHT_STEPS.length - 1 ? (
              <button
                type="button"
                className="rounded border border-amber-500/50 bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-100"
                onClick={() => {
                  useStudio.getState().setAppMode("engine");
                  useSpatialNav.getState().stopFirstNight();
                }}
              >
                Enter City Engine →
              </button>
            ) : (
              <button
                type="button"
                className="rounded border border-white/20 px-2 py-1 text-[10px] text-white/80"
                onClick={() => useSpatialNav.getState().nextFirstNight()}
              >
                Next <ChevronRight size={12} className="inline" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
