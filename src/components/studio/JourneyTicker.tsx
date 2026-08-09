import { useEffect, useState } from "react";
import { useStudio } from "@/store/studio";
import { Sparkles } from "lucide-react";

const TIPS = [
  "Spatial scope (Gemini): assets inside a feed plane auto-belong to that folder — the canvas IS the structure.",

  "Wire a Quests plane → full quest tree on the canvas. Export packs JSON for Godot/Unity.",
  "Destructibles: smash alley on the plane, then F-smash the same idea in City Engine.",
  "Shared planes: hop on a room with family — cursors live, messages land as canvas notes.",
  "Ctrl+F1…F12 bookmarks jump like StarCraft locations. Minimap for the giant plane.",
  "Indoors: Building icon designs rooms · ◆ doors in City Engine are enterable.",
  "Anim Beast: secondary tails + silhouette cosmetics without a LoRA GPU meltdown.",
  "Feed planes + wire icons = engine folder structure that matches how you think.",
  "This is the foundation — every session we raise what a ‘pixel tool’ can mean.",
];

/** Soft rotating journey tips — identity of PixelPlane as a place to hang + ship. */
export function JourneyTicker() {
  const status = useStudio((s) => s.status);
  const [i, setI] = useState(0);
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % TIPS.length), 14000);
    return () => clearInterval(t);
  }, []);

  if (!showTip) return null;

  return (
    <div className="pointer-events-none absolute bottom-1 left-1/2 z-30 flex w-[min(720px,calc(100vw-8rem))] -translate-x-1/2 justify-center px-2">
      <div className="pointer-events-auto flex max-w-full items-start gap-2 rounded-full border border-border/80 bg-bg-elevated/90 px-3 py-1.5 text-[10px] text-muted shadow-lg backdrop-blur">
        <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-fg/90">{status}</div>
          <div className="line-clamp-2 leading-snug text-subtle">{TIPS[i]}</div>
        </div>
        <button
          type="button"
          className="shrink-0 text-[10px] text-subtle hover:text-fg"
          onClick={() => setShowTip(false)}
        >
          hide
        </button>
      </div>
    </div>
  );
}
