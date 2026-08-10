import { useEffect, useMemo, useState, useCallback } from "react";
import { useStudio } from "@/store/studio";
import { useHotkeys } from "@/store/hotkeys";
import { useWaveA } from "@/store/wave-a";
import { useMemoryWeb } from "@/store/memory-web";
import { useCharacterDistrict } from "@/store/character-district";
import { useCityDistrict } from "@/store/city-district";
import { usePlaneSystems } from "@/store/plane-systems";
import { useCollab } from "@/store/collab";
import { useSignature } from "@/store/signature";
import { TOOL_LABELS } from "@/lib/hotkeys/defaults";
import type { ToolId } from "@/lib/pixel/types";
import { summonNightDistrict } from "@/lib/packs/night-district";
import { summonGoodiesDrop, summonSkylineSet, summonCityKit } from "@/lib/packs/goodies";
import { stampTimeline } from "@/store/timeline";
import { useKernels } from "@/store/kernels";
import { useSoundSprites } from "@/store/sound-sprites";
import { useTimeline } from "@/store/timeline";
import { useRuleCards } from "@/store/rule-cards";
import { pickSnapshot, saveSnapshot } from "@/lib/pixel/persist";
import { Keyboard } from "lucide-react";

type Entry = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  run: () => void;
};

/**
 * God-mode command palette — Ctrl/Cmd+K.
 * Custom (no cmdk) for stable SSR/HMR. Post-calamity power surface.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const entries = useMemo<Entry[]>(() => {
    const tools: Entry[] = (Object.entries(TOOL_LABELS) as [ToolId, string][]).map(
      ([id, label]) => ({
        id: `tool-${id}`,
        group: "Tools",
        label,
        hint: id,
        keywords: `tool ${id} ${label}`,
        run: () => useStudio.getState().setTool(id),
      }),
    );

    const cams: Entry[] = [1, 2, 3, 4, 5, 6, 7, 8].map((slot) => ({
      id: `cam-${slot}`,
      group: "Camera ghosts",
      label: `Jump F${slot}`,
      keywords: `bookmark camera f${slot}`,
      run: () => {
        const bm = useHotkeys.getState().jumpBookmark(slot);
        if (bm) {
          useStudio.getState().setCamera({ x: bm.x, y: bm.y, zoom: bm.zoom });
          useStudio.getState().setStatus(`Jumped to location F${slot}`);
        } else {
          useStudio.getState().setStatus(`F${slot} empty · Ctrl+F${slot} to save`);
        }
      },
    }));

    const sig: Entry[] = [
      {
        id: "night",
        group: "Signature",
        label: "Summon Night District",
        hint: "cyberpunk pack",
        keywords: "night district cyberpunk pack summon city",
        run: () => {
          void summonNightDistrict().then((n) => {
            if (n) stampTimeline("Night District", `${n} boards`);
          });
        },
      },
      {
        id: "heat",
        group: "Signature",
        label: "Toggle wire heat map",
        keywords: "heat wire orphan",
        run: () => {
          const s = useWaveA.getState();
          s.setShowWireHeatMap(!s.showWireHeatMap);
          useStudio
            .getState()
            .setStatus(
              !s.showWireHeatMap
                ? "Wire heat map on · orphans run hot"
                : "Wire heat map off",
            );
        },
      },
      {
        id: "ghosts",
        group: "Signature",
        label: "Toggle session ghosts",
        keywords: "ghost session bookmark",
        run: () => {
          const s = useWaveA.getState();
          s.setShowSessionGhosts(!s.showSessionGhosts);
        },
      },
      {
        id: "viewport",
        group: "Signature",
        label: "Game viewport tool",
        keywords: "ghost of the game viewport",
        run: () => useStudio.getState().setTool("game-viewport"),
      },
      {
        id: "stamp",
        group: "Signature",
        label: "Constraint stamp tool",
        keywords: "stamp cage pixel",
        run: () => useStudio.getState().setTool("constraint-stamp"),
      },
      {
        id: "orbit",
        group: "Signature",
        label: "Pin board to Reference Orbit",
        keywords: "orbit reference pin",
        run: () => useSignature.getState().pinActiveToOrbit(),
      },
      {
        id: "lantern",
        group: "Signature",
        label: "Diff lantern (compare boards)",
        keywords: "diff lantern compare",
        run: () => useSignature.getState().runDiffLantern(),
      },
      {
        id: "mutate",
        group: "Signature",
        label: "Mutation rails (4 variants)",
        keywords: "mutation rails neon dusk chrome",
        run: () => useSignature.getState().spawnMutationRails(),
      },
      {
        id: "goodies",
        group: "Signature",
        label: "Summon Goodies Drop",
        hint: "wave 1–8 · arsenal · brew · skyline · city",
        keywords: "goodies gear weapons roads ui buildings inventory skyline city",
        run: () => {
          void summonGoodiesDrop().then((n) => {
            if (n) stampTimeline("Goodies Drop", `${n} boards`);
          });
        },
      },
      {
        id: "skyline",
        group: "Signature",
        label: "Summon Skyline kit only",
        hint: "15 iso buildings · fast",
        keywords: "skyline buildings iso city tower ware chrome holo fortress",
        run: () => {
          void summonSkylineSet().then((n) => {
            if (n) stampTimeline("Skyline kit", `${n} buildings`);
          });
        },
      },
      {
        id: "citykit",
        group: "Signature",
        label: "Summon City kit only",
        hint: "139 sheets · highways · neon shops · police · buses",
        keywords: "city kit cars vehicles roads trains towers industrial modular hangars",
        run: () => {
          void summonCityKit().then((n) => {
            if (n) stampTimeline("City kit", `${n} sheets`);
          });
        },
      },
      {
        id: "inventory",
        group: "Signature",
        label: "Open Inventory kernel",
        keywords: "inventory kernel play gear",
        run: () => {
          useKernels.getState().placeInventory();
          stampTimeline("Inventory kernel");
        },
      },
      {
        id: "questtools",
        group: "Signature",
        label: "Inventory + load quest tools",
        keywords: "quest tools audio deck wrench access pass matrix",
        run: () => {
          const id = useKernels.getState().placeInventory();
          useKernels.getState().loadQuestTools(id);
          stampTimeline("Quest tools pack");
        },
      },
      {
        id: "leads",
        group: "Signature",
        label: "Open Active Leads kernel",
        keywords: "leads quest checklist kernel",
        run: () => {
          useKernels.getState().placeLeads();
          stampTimeline("Leads kernel");
        },
      },
      {
        id: "brew",
        group: "Signature",
        label: "Open Brew kernel (pour minigame)",
        keywords: "brew bar cocktail cook pour kernel",
        run: () => {
          useKernels.getState().placeBrew();
          stampTimeline("Brew kernel");
        },
      },
      {
        id: "sfx",
        group: "Signature",
        label: "Drop sound sprite at view center",
        keywords: "sound sprite audio chip sfx",
        run: () => {
          const cam = useStudio.getState().camera;
          const wx = (400 - cam.x) / (cam.zoom || 1);
          const wy = (300 - cam.y) / (cam.zoom || 1);
          useSoundSprites.getState().place(wx, wy);
          stampTimeline("Sound sprite");
        },
      },
      {
        id: "timeline",
        group: "Signature",
        label: "Stamp timeline moment",
        keywords: "timeline living collage stamp",
        run: () => useTimeline.getState().stamp("Manual mark"),
      },
      {
        id: "ruleseed",
        group: "Signature",
        label: "Seed Street Heat rule deck",
        hint: "6 WHEN→THEN cards · live in engine",
        keywords: "rule cards logic when then input map street heat",
        run: () => useRuleCards.getState().seedStreetHeatDeck(),
      },
      {
        id: "ruleadd",
        group: "Signature",
        label: "Add rule card",
        keywords: "rule card add sticky logic",
        run: () => useRuleCards.getState().placeCard(),
      },
      {
        id: "ruleexport",
        group: "Signature",
        label: "Export rule cards JSON",
        keywords: "rule export input map json",
        run: () => {
          const json = useRuleCards.getState().exportInputMapJson();
          const blob = new Blob([json], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "pixelplane_rule_cards.json";
          a.click();
          useStudio.getState().setStatus("Exported rule cards JSON");
        },
      },
      {
        id: "ruletoggle",
        group: "Signature",
        label: "Toggle rule cards on plane",
        keywords: "rule cards show hide plane",
        run: () => {
          const s = useRuleCards.getState();
          const next = !s.showOnPlane;
          s.setShowOnPlane(next);
          useStudio
            .getState()
            .setStatus(next ? "Rule cards visible" : "Rule cards hidden");
        },
      },
      {
        id: "nighthero",
        group: "Signature",
        label: "Toggle Night District hero in Engine",
        keywords: "hero player sprite engine",
        run: () => {
          const s = useSignature.getState();
          const next = !s.nightHeroInEngine;
          s.setNightHeroInEngine(next);
          useStudio.getState().setStatus(
            next
              ? "Night District hero ON in City Engine"
              : "Night District hero OFF · amber dot player",
          );
        },
      },
      {
        id: "frameboard",
        group: "Camera ghosts",
        label: "Frame active board",
        keywords: "frame focus fit artboard camera",
        run: () => {
          const s = useStudio.getState();
          const b = s.artboards.find((x) => x.id === s.activeArtboardId);
          if (!b) {
            s.setStatus("Select a board to frame");
            return;
          }
          const pad = 80;
          const vw = typeof window !== "undefined" ? window.innerWidth - 320 : 1000;
          const vh = typeof window !== "undefined" ? window.innerHeight - 120 : 700;
          const zoom = Math.min(
            8,
            Math.max(0.08, Math.min((vw - pad) / b.width, (vh - pad) / b.height) * 0.9),
          );
          s.setCamera({
            zoom,
            x: vw / 2 - (b.x + b.width / 2) * zoom,
            y: vh / 2 - (b.y + b.height / 2) * zoom,
          });
          s.setStatus(`Framed · ${b.name}`);
        },
      },
      {
        id: "engine",
        group: "Suite",
        label: "Enter City Engine",
        hint: "play",
        keywords: "engine city drive car",
        run: () => useStudio.getState().setAppMode("engine"),
      },
      {
        id: "chardist",
        group: "Suite",
        label: "Character District",
        keywords: "anim district hitbox",
        run: () => {
          const st = useCharacterDistrict.getState();
          if (!st.districts.length) st.spawnDistrict();
          st.setShowPanel(true);
        },
      },
      {
        id: "citydist",
        group: "Suite",
        label: "City District",
        keywords: "tiles footing",
        run: () => useCityDistrict.getState().setShowPanel(true),
      },
      {
        id: "memory",
        group: "Suite",
        label: "Memory Web",
        keywords: "npc faction memory",
        run: () => useMemoryWeb.getState().setShowPanel(true),
      },
      {
        id: "gen",
        group: "Suite",
        label: "AI Generate",
        keywords: "generate prompt",
        run: () => useStudio.getState().setShowGenerate(true),
      },
      {
        id: "starter",
        group: "Suite",
        label: "Starter pack",
        keywords: "starter rats",
        run: () => useStudio.getState().setShowStarterPack(true),
      },
      {
        id: "chunks",
        group: "Plane systems",
        label: "Toggle chunk grid",
        keywords: "interest d10x chunks",
        run: () => {
          const s = usePlaneSystems.getState();
          s.setShowChunkGrid(!s.showChunkGrid);
        },
      },
      {
        id: "exportmap",
        group: "Plane systems",
        label: "Toggle export map",
        keywords: "export spatial map",
        run: () => {
          const s = usePlaneSystems.getState();
          s.setShowExportMap(!s.showExportMap);
        },
      },
      {
        id: "collab",
        group: "Plane systems",
        label: "Shared plane panel",
        keywords: "collab multiplayer",
        run: () => useCollab.getState().setShowPanel(true),
      },
      {
        id: "save",
        group: "Plane systems",
        label: "Save project",
        keywords: "save persist",
        run: () => {
          const s = useStudio.getState();
          void saveSnapshot(pickSnapshot(s)).then(() =>
            s.setStatus("Project saved to browser storage"),
          );
        },
      },
      {
        id: "help",
        group: "Plane systems",
        label: "Help",
        keywords: "help hotkeys",
        run: () => useStudio.getState().setShowHelp(true),
      },
    ];

    return [...sig, ...tools, ...cams];
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    const scored = entries
      .map((e) => {
        const label = e.label.toLowerCase();
        const blob = `${e.label} ${e.hint ?? ""} ${e.keywords ?? ""} ${e.group}`.toLowerCase();
        if (!blob.includes(needle)) return null;
        let score = 0;
        if (label === needle) score = 100;
        else if (label.startsWith(needle)) score = 80;
        else if (label.includes(needle)) score = 60;
        else if ((e.keywords ?? "").toLowerCase().includes(needle)) score = 40;
        else score = 10;
        return { e, score };
      })
      .filter(Boolean) as { e: Entry; score: number }[];
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.e);
  }, [entries, q]);

  useEffect(() => {
    setActive(0);
  }, [q, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);

  const exec = useCallback(
    (entry: Entry) => {
      entry.run();
      close();
    },
    [close],
  );

  if (!open) return null;

  // group for display
  const groups: { name: string; items: Entry[] }[] = [];
  for (const e of filtered) {
    const g = groups.find((x) => x.name === e.group);
    if (g) g.items.push(e);
    else groups.push({ name: e.group, items: [e] });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-bg/70 px-3 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={close}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[var(--radius-lg)] border border-border-strong bg-bg-elevated shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Keyboard size={14} className="text-accent" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const hit = filtered[active];
                if (hit) exec(hit);
              }
            }}
            placeholder="Summon anything… tools, engine, packs, ghosts"
            className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:inline">
            esc
          </kbd>
        </div>
        <div className="max-h-[min(420px,55vh)] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted">
              No match — try “night”, “engine”, “heat”, “brush”
            </div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                {g.name}
              </div>
              {g.items.map((item) => {
                const idx = filtered.indexOf(item);
                const sel = idx === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => exec(item)}
                    className={
                      sel
                        ? "flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-accent/15 px-2 py-2 text-left text-sm text-fg"
                        : "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-2 text-left text-sm text-muted hover:bg-surface-2 hover:text-fg"
                    }
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.hint && (
                      <span className="font-mono text-[10px] text-subtle">{item.hint}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px] text-subtle">
          <span>Post-Calamity command surface</span>
          <span className="font-mono text-accent/80">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
